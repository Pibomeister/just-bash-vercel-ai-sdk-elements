const mockParse = vi.fn()

vi.mock('@llamaindex/llama-cloud', () => {
	return {
		default: vi.fn(function () {
			return { parsing: { parse: mockParse } }
		}),
	}
})

vi.mock('@/lib/document-storage', () => ({
	getOriginalFile: vi.fn(),
	getDocumentMetadata: vi.fn(),
	readSidecar: vi.fn(),
	saveMarkdown: vi.fn(),
	updateMetadata: vi.fn(),
	saveSidecar: vi.fn(),
}))

vi.mock('@/lib/encoding', () => ({
	containsReplacementChars: vi.fn(),
}))

vi.mock('@/lib/indexing/pipeline-manager', () => ({
	ensurePipeline: vi.fn(async () => ({
		id: 'pipe-1',
		name: 'legal-documents',
		status: 'ready',
	})),
}))
vi.mock('@/lib/indexing/document-indexer', () => ({
	indexDocument: vi.fn(async () => {}),
	buildMetadata: vi.fn(() => ({ documentType: 'ley' })),
}))

const mockGenerateSidecar = vi.fn()
const mockEnrichWithLlm = vi.fn()
const mockMergeLlmEnrichment = vi.fn()

vi.mock('@/lib/metadata/sidecar-generator', () => ({
	generateSidecar: (...args: unknown[]) => mockGenerateSidecar(...args),
}))

vi.mock('@/lib/metadata/llm-enrichment', () => ({
	enrichWithLlm: (...args: unknown[]) => mockEnrichWithLlm(...args),
}))

vi.mock('@/lib/metadata/sidecar-merger', () => ({
	mergeLlmEnrichment: (...args: unknown[]) => mockMergeLlmEnrichment(...args),
}))

import {
	getDocumentMetadata,
	getOriginalFile,
	readSidecar,
	saveMarkdown,
	saveSidecar,
	updateMetadata,
} from '@/lib/document-storage'
import { containsReplacementChars } from '@/lib/encoding'
import { buildMetadata, indexDocument } from '@/lib/indexing/document-indexer'
import { ensurePipeline } from '@/lib/indexing/pipeline-manager'
import type { DocumentMetadata } from '@/lib/types/documents'
import { parseDocumentWorkflow } from './parse-document'

const DOC_ID = 'doc-id'
const FILE_NAME = 'doc.pdf'

function stubParse(
	pages: Array<{ success: boolean; markdown?: string }>,
	jobId = 'job-123',
) {
	mockParse.mockResolvedValue({
		markdown: { pages },
		job: { id: jobId },
	})
}

beforeEach(() => {
	vi.stubEnv('LLAMA_CLOUD_API_KEY', 'test-api-key')

	vi.mocked(getOriginalFile).mockResolvedValue({
		buffer: Buffer.from('fake-pdf-content'),
		metadata: {
			originalName: FILE_NAME,
			mimeType: 'application/pdf',
		} as DocumentMetadata,
	})

	vi.mocked(saveMarkdown).mockResolvedValue(`/uploads/${DOC_ID}/content.md`)
	vi.mocked(updateMetadata).mockResolvedValue({} as DocumentMetadata)
	vi.mocked(getDocumentMetadata).mockResolvedValue({
		documentId: DOC_ID,
		originalName: FILE_NAME,
		mimeType: 'application/pdf',
		uploadedAt: '2026-01-01T00:00:00Z',
	} as DocumentMetadata)
	vi.mocked(containsReplacementChars).mockReturnValue(false)
	vi.mocked(readSidecar).mockResolvedValue({ document: { type: 'contrato' } })

	vi.mocked(ensurePipeline).mockClear()
	vi.mocked(indexDocument).mockClear()
	vi.mocked(buildMetadata).mockClear()

	mockGenerateSidecar.mockReturnValue({
		document: { type: 'contrato' },
		tableOfContents: [],
		navigation: { warnings: {} },
	})
	mockEnrichWithLlm.mockResolvedValue(null)
	mockMergeLlmEnrichment.mockImplementation((sidecar) => sidecar)
	vi.mocked(saveSidecar).mockResolvedValue('/uploads/doc-id/sidecar.json')

	// Default: successful two-page parse
	stubParse([
		{ success: true, markdown: '# Title' },
		{ success: true, markdown: 'Content' },
	])
})

describe('parseDocumentWorkflow', () => {
	it('parses successfully, saves markdown, and returns ParseResult', async () => {
		const result = await parseDocumentWorkflow(DOC_ID, FILE_NAME)

		expect(result).toEqual({
			documentId: DOC_ID,
			markdownPath: `/uploads/${DOC_ID}/content.md`,
			pageCount: 2,
		})

		expect(saveMarkdown).toHaveBeenCalledWith(DOC_ID, '# Title\n\nContent')
		expect(updateMetadata).toHaveBeenCalledWith(DOC_ID, {
			llamaJobId: 'job-123',
		})
	})

	it('fails fast when LLAMA_CLOUD_API_KEY is not set', async () => {
		vi.stubEnv('LLAMA_CLOUD_API_KEY', '')

		await expect(parseDocumentWorkflow(DOC_ID, FILE_NAME)).rejects.toThrow(
			'LLAMA_CLOUD_API_KEY is required',
		)

		expect(updateMetadata).toHaveBeenCalledWith(DOC_ID, {
			status: 'failed',
			error: 'LLAMA_CLOUD_API_KEY is required',
		})

		vi.unstubAllEnvs()
	})

	it('calls handleErrorStep and re-throws when LlamaParse fails', async () => {
		mockParse.mockRejectedValue(new Error('Parse failed'))

		await expect(parseDocumentWorkflow(DOC_ID, FILE_NAME)).rejects.toThrow(
			'Parse failed',
		)

		expect(updateMetadata).toHaveBeenCalledWith(DOC_ID, {
			status: 'failed',
			error: 'Parse failed',
		})
	})

	it('logs a warning when output contains replacement characters', async () => {
		vi.mocked(containsReplacementChars).mockReturnValue(true)
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

		await parseDocumentWorkflow(DOC_ID, FILE_NAME)

		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('U+FFFD'))
	})

	it('filters out failed pages from the markdown output', async () => {
		stubParse(
			[
				{ success: true, markdown: 'Good' },
				{ success: false },
				{ success: true, markdown: 'Also good' },
			],
			'job-456',
		)

		await parseDocumentWorkflow(DOC_ID, FILE_NAME)

		expect(saveMarkdown).toHaveBeenCalledWith(DOC_ID, 'Good\n\nAlso good')
	})

	it('handles an empty parse result with no pages', async () => {
		stubParse([], 'job-789')

		const result = await parseDocumentWorkflow(DOC_ID, FILE_NAME)

		expect(saveMarkdown).toHaveBeenCalledWith(DOC_ID, '')
		expect(result.pageCount).toBe(0)
	})

	it('uses defaults when SDK response omits markdown pages and job id', async () => {
		mockParse.mockResolvedValue({
			// Missing markdown/pages should default to []
			markdown: undefined,
			// Missing job id should default to "unknown"
			job: undefined,
		})

		const result = await parseDocumentWorkflow(DOC_ID, FILE_NAME)

		expect(saveMarkdown).toHaveBeenCalledWith(DOC_ID, '')
		expect(updateMetadata).toHaveBeenCalledWith(DOC_ID, {
			llamaJobId: 'unknown',
		})
		expect(result.pageCount).toBe(0)
	})

	it('uses fallback error message when parse step throws a non-Error value', async () => {
		mockParse.mockRejectedValue('failed without Error object')

		await expect(parseDocumentWorkflow(DOC_ID, FILE_NAME)).rejects.toBe(
			'failed without Error object',
		)

		expect(updateMetadata).toHaveBeenCalledWith(DOC_ID, {
			status: 'failed',
			error: `LlamaParse failed for ${FILE_NAME}`,
		})
	})

	it('generates and saves sidecar after parsing', async () => {
		await parseDocumentWorkflow(DOC_ID, FILE_NAME)

		expect(mockGenerateSidecar).toHaveBeenCalledWith(
			'# Title\n\nContent',
			`doc-${DOC_ID}`,
		)
		expect(mockEnrichWithLlm).toHaveBeenCalled()
		expect(mockMergeLlmEnrichment).toHaveBeenCalled()
		expect(saveSidecar).toHaveBeenCalledWith(DOC_ID, expect.any(Object))
	})

	it('saves content.md even when sidecar generation fails', async () => {
		mockGenerateSidecar.mockImplementation(() => {
			throw new Error('Sidecar regex timeout')
		})
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

		const result = await parseDocumentWorkflow(DOC_ID, FILE_NAME)

		expect(result.markdownPath).toBe(`/uploads/${DOC_ID}/content.md`)
		expect(saveMarkdown).toHaveBeenCalledWith(DOC_ID, '# Title\n\nContent')
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('Sidecar generation failed'),
			expect.any(Error),
		)
		warnSpy.mockRestore()
	})

	it('passes navigation warnings to LLM enrichment', async () => {
		const warnings = { ocr_ordinals: 'OCR warning detected' }
		mockGenerateSidecar.mockReturnValue({
			document: { type: 'ley' },
			tableOfContents: [{ id: 'titulo-1', heading: 'TITULO PRIMERO' }],
			navigation: { warnings },
		})

		await parseDocumentWorkflow(DOC_ID, FILE_NAME)

		expect(mockEnrichWithLlm).toHaveBeenCalledWith(
			[{ id: 'titulo-1', heading: 'TITULO PRIMERO' }],
			'# Title\n\nContent',
			warnings,
		)
	})

	it('calls indexInPipelineStep when LLAMA_CLOUD_PROJECT_ID is set', async () => {
		vi.stubEnv('LLAMA_CLOUD_PROJECT_ID', 'test-project')

		await parseDocumentWorkflow(DOC_ID, FILE_NAME)

		expect(ensurePipeline).toHaveBeenCalled()
		expect(indexDocument).toHaveBeenCalledWith('pipe-1', {
			documentId: DOC_ID,
			text: '# Title\n\nContent',
			metadata: { documentType: 'ley' },
		})

		vi.unstubAllEnvs()
	})

	it('skips indexing when LLAMA_CLOUD_PROJECT_ID is not set', async () => {
		delete process.env.LLAMA_CLOUD_PROJECT_ID

		await parseDocumentWorkflow(DOC_ID, FILE_NAME)

		expect(ensurePipeline).not.toHaveBeenCalled()
		expect(indexDocument).not.toHaveBeenCalled()
	})

	it('calls readSidecar during indexing step', async () => {
		vi.stubEnv('LLAMA_CLOUD_PROJECT_ID', 'test-project')

		await parseDocumentWorkflow(DOC_ID, FILE_NAME)

		expect(readSidecar).toHaveBeenCalledWith(DOC_ID)

		vi.unstubAllEnvs()
	})

	it('still saves content.md when indexing fails', async () => {
		vi.stubEnv('LLAMA_CLOUD_PROJECT_ID', 'test-project')
		vi.mocked(indexDocument).mockRejectedValue(
			new Error('Pipeline unavailable'),
		)
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

		const result = await parseDocumentWorkflow(DOC_ID, FILE_NAME)

		expect(result.markdownPath).toBe(`/uploads/${DOC_ID}/content.md`)
		expect(saveMarkdown).toHaveBeenCalledWith(DOC_ID, '# Title\n\nContent')
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('Indexing failed'),
			expect.any(Error),
		)
		warnSpy.mockRestore()
		vi.unstubAllEnvs()
	})
})
