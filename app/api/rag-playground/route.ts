import {
	type OpenAILanguageModelResponsesOptions,
	openai,
} from '@ai-sdk/openai'
import {
	convertToModelMessages,
	stepCountIs,
	streamText,
	tool,
	type UIMessage,
} from 'ai'
import { z } from 'zod'
import { ensurePipeline } from '@/lib/indexing/pipeline-manager'
import { search } from '@/lib/indexing/semantic-retriever'
import { DEFAULT_MODEL_ID, findModel } from '@/lib/rag-playground-models'

export const maxDuration = 120

const RequestBody = z.object({
	messages: z.array(z.any()),
	model: z.string().default(DEFAULT_MODEL_ID),
	alpha: z.number().min(0).max(1).default(0.5),
	topK: z.number().int().min(1).max(100).default(20),
	rerankTopN: z.number().int().min(1).max(50).default(5),
	instructions: z.string().optional(),
})

const system = `You are a semantic search assistant. Your ONLY tool is searchDocuments — use it to find relevant passages from uploaded documents.

## How to Search

- Use searchDocuments to find relevant text passages across all uploaded documents.
- If results have low scores or seem irrelevant, try rephrasing the query with synonyms, alternative terms, or broader/narrower scope.
- You may call searchDocuments multiple times with different queries to improve coverage.

## Response Guidelines

- Present search results clearly, highlighting the most relevant passages.
- When referencing search results, use numbered citations like [1], [2] that correspond to the result index returned by searchDocuments.
- Results are numbered sequentially across all searchDocuments calls within a conversation turn. Use the "index" field from each result.
- Summarize findings and note any gaps in the results.
- If no relevant results are found after multiple attempts, say so explicitly.
- NEVER fabricate or hallucinate document content — only cite what searchDocuments returns.`

export function formatSearchResult(
	r: {
		text: string
		score: number | null
		documentId: string | null
	},
	index: number,
) {
	return { index, text: r.text, score: r.score, documentId: r.documentId }
}

export async function executeSearch(
	params: {
		query: string
		documentType?: 'contrato' | 'ley' | 'sentencia' | 'nom' | 'otro'
	},
	retrieval: { alpha: number; topK: number; rerankTopN: number },
	counter?: { value: number },
) {
	const pipeline = await ensurePipeline()
	const results = await search(pipeline.id, {
		...params,
		...retrieval,
	})
	return results.map((r) => {
		const idx = counter ? ++counter.value : 0
		return formatSearchResult(r, idx)
	})
}

export function buildSearchTool({
	alpha,
	topK,
	rerankTopN,
}: {
	alpha: number
	topK: number
	rerankTopN: number
}) {
	return {
		searchDocuments: tool({
			description:
				'Search across all uploaded documents using semantic similarity. Returns the most relevant text chunks with relevance scores.',
			inputSchema: z.object({
				query: z
					.string()
					.min(1)
					.describe('The search query in natural language'),
				documentType: z
					.enum(['contrato', 'ley', 'sentencia', 'nom', 'otro'])
					.optional()
					.describe('Optional filter by document type'),
			}),
			execute: ({ query, documentType }) =>
				executeSearch({ query, documentType }, { alpha, topK, rerankTopN }),
		}),
	}
}

export async function POST(req: Request) {
	let body: unknown
	try {
		body = await req.json()
	} catch {
		return new Response('Invalid JSON', { status: 400 })
	}

	const parsed = RequestBody.safeParse(body)
	if (!parsed.success) {
		return new Response(parsed.error.issues[0].message, { status: 400 })
	}

	const {
		messages,
		model: modelId,
		alpha,
		topK,
		rerankTopN,
		instructions,
	} = parsed.data

	const modelDef = findModel(modelId)
	if (!modelDef) {
		return new Response(`Unknown model: ${modelId}`, { status: 400 })
	}

	const sourceCounter = { value: 0 }
	const tools = {
		searchDocuments: tool({
			description:
				'Search across all uploaded documents using semantic similarity. Returns the most relevant text chunks with relevance scores. Each result has a sequential index for citation.',
			inputSchema: z.object({
				query: z
					.string()
					.min(1)
					.describe('The search query in natural language'),
				documentType: z
					.enum(['contrato', 'ley', 'sentencia', 'nom', 'otro'])
					.optional()
					.describe('Optional filter by document type'),
			}),
			execute: ({ query, documentType }) =>
				executeSearch(
					{ query, documentType },
					{ alpha, topK, rerankTopN },
					sourceCounter,
				),
		}),
	}

	let modelMessages: Awaited<ReturnType<typeof convertToModelMessages>>
	try {
		modelMessages = await convertToModelMessages(messages as UIMessage[])
	} catch {
		return new Response('Invalid message format', { status: 400 })
	}

	const safeInstructions =
		typeof instructions === 'string' ? instructions.slice(0, 2000) : undefined

	const systemPrompt = safeInstructions
		? `${system}\n\n## Active User Instructions\n${safeInstructions}`
		: system

	const streamOptions: Parameters<typeof streamText>[0] = {
		model: openai(modelDef.id),
		system: systemPrompt,
		messages: modelMessages,
		tools,
		stopWhen: stepCountIs(10),
	}

	if (
		modelDef.supportsReasoning &&
		modelDef.reasoningEffort &&
		modelDef.reasoningSummary
	) {
		streamOptions.providerOptions = {
			openai: {
				reasoningEffort: modelDef.reasoningEffort,
				reasoningSummary: modelDef.reasoningSummary,
			} satisfies OpenAILanguageModelResponsesOptions,
		}
	}

	const result = streamText(streamOptions)

	return result.toUIMessageStreamResponse({
		sendReasoning: modelDef.supportsReasoning,
	})
}
