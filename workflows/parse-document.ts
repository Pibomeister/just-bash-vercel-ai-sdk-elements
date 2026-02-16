'use workflow'

import { containsReplacementChars } from '@/lib/encoding'
import type { ParseResult } from '@/lib/types/documents'

async function parseWithSdk(
	documentId: string,
): Promise<{ markdown: string; pageCount: number; jobId: string }> {
	'use step'

	const { default: LlamaCloud } = await import('@llamaindex/llama-cloud')
	const { getOriginalFile } = await import('@/lib/document-storage')

	const client = new LlamaCloud({
		apiKey: process.env.LLAMA_CLOUD_API_KEY,
	})

	const { buffer, metadata } = await getOriginalFile(documentId)
	const file = new File([new Uint8Array(buffer)], metadata.originalName, {
		type: metadata.mimeType,
	})

	const result = await client.parsing.parse({
		upload_file: file,
		tier: 'agentic',
		version: 'latest',
		expand: ['markdown'],
		agentic_options: {
			custom_prompt:
				'Do not include repeating page headers or footers in the markdown output. ' +
				'These are typically institutional headers (e.g., "CAMARA DE DIPUTADOS"), ' +
				'document titles repeated on every page, reform dates, or page numbers. ' +
				'Only include the actual body content of each page.',
		},
	})

	const pages = result.markdown?.pages ?? []
	const markdown = pages
		.filter((p): p is Extract<(typeof pages)[number], { success: true }> => p.success)
		.map((p) => p.markdown)
		.join('\n\n')

	return {
		markdown,
		pageCount: pages.length,
		jobId: result.job?.id ?? 'unknown',
	}
}

async function generateSidecarStep(
	documentId: string,
	markdown: string,
): Promise<string> {
	'use step'

	const { generateSidecar } = await import('@/lib/metadata/sidecar-generator')
	const { enrichWithLlm } = await import('@/lib/metadata/llm-enrichment')
	const { mergeLlmEnrichment } = await import('@/lib/metadata/sidecar-merger')
	const { saveSidecar } = await import('@/lib/document-storage')

	const sidecar = generateSidecar(markdown, `doc-${documentId}`)
	const llmData = await enrichWithLlm(
		sidecar.tableOfContents,
		markdown,
		sidecar.navigation.warnings,
	)
	const enriched = mergeLlmEnrichment(sidecar, llmData)
	return saveSidecar(documentId, enriched)
}

async function saveResultStep(
	documentId: string,
	markdown: string,
	jobId: string,
): Promise<string> {
	'use step'

	const { saveMarkdown, updateMetadata } = await import(
		'@/lib/document-storage'
	)
	await updateMetadata(documentId, { llamaJobId: jobId })
	return saveMarkdown(documentId, markdown)
}

async function handleErrorStep(
	documentId: string,
	message: string,
): Promise<void> {
	'use step'

	const { updateMetadata } = await import('@/lib/document-storage')
	await updateMetadata(documentId, {
		status: 'failed',
		error: message,
	})
}

export async function parseDocumentWorkflow(
	documentId: string,
	fileName: string,
): Promise<ParseResult> {
	let markdown: string
	let pageCount: number
	let jobId: string

	try {
		const result = await parseWithSdk(documentId)
		markdown = result.markdown
		pageCount = result.pageCount
		jobId = result.jobId
	} catch (error) {
		const message =
			error instanceof Error
				? error.message
				: `LlamaParse failed for ${fileName}`
		await handleErrorStep(documentId, message)
		throw error
	}

	if (containsReplacementChars(markdown)) {
		console.warn(
			`[parse-document] LlamaParse output for "${fileName}" (${documentId}) ` +
				'contains U+FFFD replacement characters — the source PDF may have ' +
				'non-UTF-8 text that was corrupted during extraction.',
		)
	}

	// Sidecar generation: failure must not block content.md pipeline (R3.2)
	try {
		await generateSidecarStep(documentId, markdown)
	} catch (error) {
		console.warn(
			`[parse-document] Sidecar generation failed for "${fileName}" (${documentId}):`,
			error,
		)
	}

	const markdownPath = await saveResultStep(documentId, markdown, jobId)

	return { documentId, markdownPath, pageCount }
}
