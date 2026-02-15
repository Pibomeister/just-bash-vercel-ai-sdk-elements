vi.mock('node:fs/promises')
vi.mock('node:crypto', () => ({ randomUUID: () => 'mock-uuid-1234' }))

import * as fs from 'node:fs/promises'
import path from 'node:path'
import {
	deleteDocument,
	getDocumentMetadata,
	getMarkdownPath,
	getOriginalFile,
	listDocuments,
	saveMarkdown,
	saveUploadedFile,
	updateMetadata,
	validateFileType,
} from '@/lib/document-storage'
import { createDocumentMetadata } from '@/test/helpers/fixtures'

const uploadsDir = path.resolve('uploads')

describe('validateFileType', () => {
	it('accepts .pdf with correct MIME type', () => {
		expect(validateFileType('report.pdf', 'application/pdf')).toBeNull()
	})

	it('accepts .docx with correct MIME type', () => {
		expect(
			validateFileType(
				'report.docx',
				'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			),
		).toBeNull()
	})

	it('rejects unsupported extension', () => {
		expect(validateFileType('notes.txt', 'text/plain')).toBe(
			'Only .pdf and .docx files are supported.',
		)
	})

	it('rejects mismatched MIME type for valid extension', () => {
		expect(validateFileType('report.pdf', 'text/plain')).toBe(
			'Only .pdf and .docx files are supported.',
		)
	})
})

describe('saveUploadedFile', () => {
	function createMockFile(
		name: string,
		type: string,
		chunks: Uint8Array[],
	): File {
		let index = 0
		const mockReader = {
			read: vi.fn(async () => {
				if (index < chunks.length) {
					return { done: false, value: chunks[index++] }
				}
				return { done: true, value: undefined }
			}),
		}
		return {
			name,
			type,
			stream: () => ({ getReader: () => mockReader }),
		} as unknown as File
	}

	it('creates directory, writes file and metadata JSON', async () => {
		const content = new Uint8Array([1, 2, 3])
		const file = createMockFile('document.pdf', 'application/pdf', [content])

		vi.mocked(fs.mkdir).mockResolvedValue(undefined)
		vi.mocked(fs.writeFile).mockResolvedValue(undefined)

		const result = await saveUploadedFile(file)

		expect(result.documentId).toBe('mock-uuid-1234')
		expect(result.metadata.originalName).toBe('document.pdf')
		expect(result.metadata.mimeType).toBe('application/pdf')
		expect(result.metadata.status).toBe('uploading')
		expect(result.metadata.fileSize).toBe(3)

		const docDir = path.join(uploadsDir, 'mock-uuid-1234')
		expect(fs.mkdir).toHaveBeenCalledWith(docDir, { recursive: true })
		expect(fs.writeFile).toHaveBeenCalledWith(
			path.join(docDir, 'original.pdf'),
			Buffer.concat([content]),
		)
		expect(fs.writeFile).toHaveBeenCalledWith(
			path.join(docDir, 'metadata.json'),
			expect.stringContaining('"documentId"'),
		)
	})

	it('throws on invalid file type', async () => {
		const file = createMockFile('notes.txt', 'text/plain', [])

		await expect(saveUploadedFile(file)).rejects.toThrow(
			'Only .pdf and .docx files are supported.',
		)
	})

	it('throws and cleans up on file exceeding 100MB limit', async () => {
		const oversizedChunk = new Uint8Array(101 * 1024 * 1024)
		const file = createMockFile('big.pdf', 'application/pdf', [oversizedChunk])

		vi.mocked(fs.mkdir).mockResolvedValue(undefined)
		vi.mocked(fs.rm).mockResolvedValue(undefined)

		await expect(saveUploadedFile(file)).rejects.toThrow(
			'File exceeds 100MB limit.',
		)

		const docDir = path.join(uploadsDir, 'mock-uuid-1234')
		expect(fs.rm).toHaveBeenCalledWith(docDir, {
			recursive: true,
			force: true,
		})
	})
})

describe('updateMetadata', () => {
	it('reads existing metadata, merges updates, and writes back', async () => {
		const existing = createDocumentMetadata({ status: 'uploading' })
		vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existing))
		vi.mocked(fs.writeFile).mockResolvedValue(undefined)

		const result = await updateMetadata(existing.documentId, {
			status: 'processing',
		})

		expect(result.status).toBe('processing')
		expect(result.documentId).toBe(existing.documentId)
		expect(fs.writeFile).toHaveBeenCalledWith(
			path.join(uploadsDir, existing.documentId, 'metadata.json'),
			expect.stringContaining('"processing"'),
		)
	})
})

describe('saveMarkdown', () => {
	it('writes content.md and updates status to completed', async () => {
		const existing = createDocumentMetadata({ status: 'processing' })
		vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existing))
		vi.mocked(fs.writeFile).mockResolvedValue(undefined)

		const mdPath = await saveMarkdown(existing.documentId, '# Hello World')

		expect(mdPath).toBe(getMarkdownPath(existing.documentId))
		expect(fs.writeFile).toHaveBeenCalledWith(
			getMarkdownPath(existing.documentId),
			'# Hello World',
			'utf-8',
		)
		// updateMetadata writes metadata.json with merged status
		const metadataPath = path.join(
			uploadsDir,
			existing.documentId,
			'metadata.json',
		)
		expect(fs.writeFile).toHaveBeenCalledWith(
			metadataPath,
			expect.stringContaining('"completed"'),
		)
	})
})

describe('getDocumentMetadata', () => {
	it('reads and parses metadata.json', async () => {
		const meta = createDocumentMetadata()
		vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(meta))

		const result = await getDocumentMetadata(meta.documentId)

		expect(result).toEqual(meta)
		expect(fs.readFile).toHaveBeenCalledWith(
			path.join(uploadsDir, meta.documentId, 'metadata.json'),
			'utf-8',
		)
	})

	it('throws when metadata file is missing', async () => {
		vi.mocked(fs.readFile).mockRejectedValue(
			new Error('ENOENT: no such file or directory'),
		)

		await expect(getDocumentMetadata('nonexistent-id')).rejects.toThrow()
	})

	it('throws on corrupt metadata JSON', async () => {
		vi.mocked(fs.readFile).mockResolvedValue('not valid json {{{')

		await expect(getDocumentMetadata('bad-id')).rejects.toThrow()
	})
})

describe('getOriginalFile', () => {
	it('returns buffer and metadata', async () => {
		const meta = createDocumentMetadata({
			documentId: 'doc-123',
			fileName: 'original.pdf',
		})
		const fileBuffer = Buffer.from('pdf-content')

		vi.mocked(fs.readFile)
			.mockResolvedValueOnce(JSON.stringify(meta) as unknown as Buffer)
			.mockResolvedValueOnce(fileBuffer)

		const result = await getOriginalFile('doc-123')

		expect(result.metadata).toEqual(meta)
		expect(result.buffer).toEqual(fileBuffer)
		expect(fs.readFile).toHaveBeenCalledWith(
			path.join(uploadsDir, 'doc-123', 'original.pdf'),
		)
	})
})

describe('listDocuments', () => {
	it('returns sorted documents (most recent first)', async () => {
		const older = createDocumentMetadata({
			documentId: 'older',
			uploadedAt: '2026-01-01T00:00:00.000Z',
		})
		const newer = createDocumentMetadata({
			documentId: 'newer',
			uploadedAt: '2026-02-01T00:00:00.000Z',
		})

		vi.mocked(fs.readdir).mockResolvedValue([
			'older',
			'newer',
		] as unknown as Awaited<ReturnType<typeof fs.readdir>>)
		vi.mocked(fs.readFile)
			.mockResolvedValueOnce(JSON.stringify(older) as unknown as Buffer)
			.mockResolvedValueOnce(JSON.stringify(newer) as unknown as Buffer)

		const result = await listDocuments()

		expect(result).toHaveLength(2)
		expect(result[0].documentId).toBe('newer')
		expect(result[1].documentId).toBe('older')
	})

	it('returns empty array when uploads dir is missing', async () => {
		vi.mocked(fs.readdir).mockRejectedValue(
			new Error('ENOENT: no such file or directory'),
		)

		const result = await listDocuments()

		expect(result).toEqual([])
	})

	it('skips entries without valid metadata', async () => {
		const valid = createDocumentMetadata({ documentId: 'valid-doc' })

		vi.mocked(fs.readdir).mockResolvedValue([
			'valid-doc',
			'corrupt-dir',
		] as unknown as Awaited<ReturnType<typeof fs.readdir>>)
		vi.mocked(fs.readFile)
			.mockResolvedValueOnce(JSON.stringify(valid) as unknown as Buffer)
			.mockRejectedValueOnce(new Error('ENOENT'))

		const result = await listDocuments()

		expect(result).toHaveLength(1)
		expect(result[0].documentId).toBe('valid-doc')
	})
})

describe('deleteDocument', () => {
	it('calls rm with recursive and force options', async () => {
		vi.mocked(fs.rm).mockResolvedValue(undefined)

		await deleteDocument('doc-to-delete')

		expect(fs.rm).toHaveBeenCalledWith(path.join(uploadsDir, 'doc-to-delete'), {
			recursive: true,
			force: true,
		})
	})
})
