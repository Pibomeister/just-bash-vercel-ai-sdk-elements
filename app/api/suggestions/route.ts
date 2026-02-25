import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'

const RequestSchema = z.object({
	query: z.string().min(1).max(2000),
	response: z.string().min(1),
	sources: z.array(z.string()).optional(),
})

const SuggestionsSchema = z.object({
	suggestions: z
		.array(z.string().max(120))
		.length(3)
		.describe('Exactly 3 short follow-up questions'),
})

export async function POST(req: Request) {
	let body: unknown
	try {
		body = await req.json()
	} catch {
		return Response.json({ suggestions: [] }, { status: 400 })
	}

	const parsed = RequestSchema.safeParse(body)
	if (!parsed.success) {
		return Response.json({ suggestions: [] }, { status: 400 })
	}

	const { query, response, sources } = parsed.data

	// Truncate to keep prompt small and latency low
	const truncatedResponse = response.slice(0, 2000)
	const truncatedSources = sources?.slice(0, 5).map((s) => s.slice(0, 500))

	const sourceContext = truncatedSources?.length
		? `\n\nRelevant source excerpts:\n${truncatedSources.map((s, i) => `[${i + 1}] ${s}`).join('\n')}`
		: ''

	try {
		const { object } = await generateObject({
			model: openai('gpt-4o-mini'),
			schema: SuggestionsSchema,
			system: `You generate follow-up questions for a conversational AI assistant.
Given the user's query and the assistant's response, produce exactly 3 short, diverse follow-up questions.

Rules:
- Each question must be under 80 characters
- Questions should be specific and actionable, not generic
- Cover different angles: deeper detail, related topic, practical application
- Write in the same language as the user's query
- If source excerpts are provided, at least one question should reference source content`,
			prompt: `User query: ${query}\n\nAssistant response: ${truncatedResponse}${sourceContext}`,
		})

		return Response.json({ suggestions: object.suggestions })
	} catch (error) {
		console.warn('[suggestions] generateObject failed:', error)
		return Response.json({ suggestions: [] })
	}
}
