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
	saveMarkdown: vi.fn(),
	updateMetadata: vi.fn(),
}))

vi.mock('@/lib/encoding', () => ({
	containsReplacementChars: vi.fn(),
}))

import {
	getOriginalFile,
	saveMarkdown,
	updateMetadata,
} from '@/lib/document-storage'
import { containsReplacementChars } from '@/lib/encoding'
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
	vi.mocked(getOriginalFile).mockResolvedValue({
		buffer: Buffer.from('fake-pdf-content'),
		metadata: {
			originalName: FILE_NAME,
			mimeType: 'application/pdf',
		} as DocumentMetadata,
	})

	vi.mocked(saveMarkdown).mockResolvedValue(`/uploads/${DOC_ID}/content.md`)
	vi.mocked(updateMetadata).mockResolvedValue({} as DocumentMetadata)
	vi.mocked(containsReplacementChars).mockReturnValue(false)

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
})
