vi.mock('node:fs/promises')
vi.mock('node:crypto', () => ({ randomUUID: () => 'mock-uuid-blob' }))
vi.mock('@vercel/blob')

import * as fs from 'node:fs/promises'
import { del, head, list, put } from '@vercel/blob'
import {
	deleteDocument,
	getDocumentMetadata,
	getOriginalFile,
	getStorageBackend,
	listDocuments,
	saveMarkdown,
	saveSidecar,
	saveUploadedFile,
	updateMetadata,
	validateDocumentId,
} from '@/lib/document-storage'
import { createDocumentMetadata } from '@/test/helpers/fixtures'

// Shared mock response helper for fetch
function mockFetchResponse(body: string | ArrayBuffer, ok = true) {
	return {
		ok,
		statusText: ok ? 'OK' : 'Not Found',
		text: vi.fn().mockResolvedValue(typeof body === 'string' ? body : ''),
		arrayBuffer: vi
			.fn()
			.mockResolvedValue(
				body instanceof ArrayBuffer ? body : new ArrayBuffer(0),
			),
	} as unknown as Response
}

describe('blob backend: getStorageBackend', () => {
	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it('returns "local" when STORAGE_BACKEND is not set', () => {
		expect(getStorageBackend()).toBe('local')
	})

	it('returns "local" when STORAGE_BACKEND is "local"', () => {
		vi.stubEnv('STORAGE_BACKEND', 'local')
		expect(getStorageBackend()).toBe('local')
	})

	it('returns "blob" when STORAGE_BACKEND is "blob"', () => {
		vi.stubEnv('STORAGE_BACKEND', 'blob')
		expect(getStorageBackend()).toBe('blob')
	})

	it('returns "local" for unknown values', () => {
		vi.stubEnv('STORAGE_BACKEND', 'unknown')
		expect(getStorageBackend()).toBe('local')
	})
})

describe('blob backend: validateDocumentId', () => {
	it('accepts alphanumeric IDs with hyphens', () => {
		expect(() => validateDocumentId('abc-123-def')).not.toThrow()
	})

	it('rejects path traversal', () => {
		expect(() => validateDocumentId('../../etc')).toThrow(
			'Invalid documentId format',
		)
	})
})

describe('blob backend: saveMarkdown', () => {
	beforeEach(() => {
		vi.stubEnv('STORAGE_BACKEND', 'blob')
	})

	afterEach(() => {
		vi.unstubAllEnvs()
		vi.clearAllMocks()
	})

	it('uploads content.md to Vercel Blob and updates metadata', async () => {
		const existing = createDocumentMetadata({ status: 'processing' })
		const blobUrl =
			'https://blob.vercel-storage.com/documents/test-doc-id/content.md'

		vi.mocked(put)
			// saveMarkdown put
			.mockResolvedValueOnce({
				url: blobUrl,
				pathname: 'documents/test-doc-id/content.md',
			} as never)
			// updateMetadata -> getDocumentMetadata -> head + fetch
			// updateMetadata put
			.mockResolvedValueOnce({
				url: 'https://blob.vercel-storage.com/documents/test-doc-id/metadata.json',
				pathname: 'documents/test-doc-id/metadata.json',
			} as never)

		vi.mocked(head).mockResolvedValue({
			url: 'https://blob.vercel-storage.com/documents/test-doc-id/metadata.json',
			pathname: 'documents/test-doc-id/metadata.json',
		} as never)

		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(mockFetchResponse(JSON.stringify(existing)))

		const result = await saveMarkdown(existing.documentId, '# Hello World')

		expect(result).toBe(blobUrl)
		expect(put).toHaveBeenCalledWith(
			'documents/test-doc-id/content.md',
			'# Hello World',
			{ access: 'public', allowOverwrite: true },
		)

		fetchSpy.mockRestore()
	})
})

describe('blob backend: saveSidecar', () => {
	beforeEach(() => {
		vi.stubEnv('STORAGE_BACKEND', 'blob')
	})

	afterEach(() => {
		vi.unstubAllEnvs()
		vi.clearAllMocks()
	})

	it('uploads sidecar.json to Vercel Blob and updates metadata', async () => {
		const existing = createDocumentMetadata({ status: 'completed' })
		const sidecarBlobUrl =
			'https://blob.vercel-storage.com/documents/test-doc-id/sidecar.json'

		vi.mocked(put)
			.mockResolvedValueOnce({
				url: sidecarBlobUrl,
				pathname: 'documents/test-doc-id/sidecar.json',
			} as never)
			.mockResolvedValueOnce({
				url: 'https://blob.vercel-storage.com/documents/test-doc-id/metadata.json',
				pathname: 'documents/test-doc-id/metadata.json',
			} as never)

		vi.mocked(head).mockResolvedValue({
			url: 'https://blob.vercel-storage.com/documents/test-doc-id/metadata.json',
			pathname: 'documents/test-doc-id/metadata.json',
		} as never)

		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(mockFetchResponse(JSON.stringify(existing)))

		const sidecar = { pages: 5, language: 'es' }
		const result = await saveSidecar(existing.documentId, sidecar)

		expect(result).toBe(sidecarBlobUrl)
		expect(put).toHaveBeenCalledWith(
			'documents/test-doc-id/sidecar.json',
			JSON.stringify(sidecar, null, 2),
			{ access: 'public', allowOverwrite: true },
		)

		fetchSpy.mockRestore()
	})
})

describe('blob backend: saveUploadedFile', () => {
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

	beforeEach(() => {
		vi.stubEnv('STORAGE_BACKEND', 'blob')
	})

	afterEach(() => {
		vi.unstubAllEnvs()
		vi.clearAllMocks()
	})

	it('uploads original file and metadata to Vercel Blob', async () => {
		const content = new Uint8Array([1, 2, 3])
		const file = createMockFile('document.pdf', 'application/pdf', [content])

		vi.mocked(put)
			.mockResolvedValueOnce({
				url: 'https://blob.vercel-storage.com/documents/mock-uuid-blob/original.pdf',
				pathname: 'documents/mock-uuid-blob/original.pdf',
			} as never)
			.mockResolvedValueOnce({
				url: 'https://blob.vercel-storage.com/documents/mock-uuid-blob/metadata.json',
				pathname: 'documents/mock-uuid-blob/metadata.json',
			} as never)

		const result = await saveUploadedFile(file)

		expect(result.documentId).toBe('mock-uuid-blob')
		expect(result.filePath).toBe(
			'https://blob.vercel-storage.com/documents/mock-uuid-blob/original.pdf',
		)
		expect(result.metadata.status).toBe('uploading')
		expect(result.metadata.fileSize).toBe(3)

		expect(put).toHaveBeenCalledWith(
			'documents/mock-uuid-blob/original.pdf',
			Buffer.concat([content]),
			{ access: 'public', allowOverwrite: true },
		)
		expect(put).toHaveBeenCalledWith(
			'documents/mock-uuid-blob/metadata.json',
			expect.stringContaining('"documentId"'),
			{ access: 'public', allowOverwrite: true },
		)

		// Should NOT call local filesystem APIs
		expect(fs.mkdir).not.toHaveBeenCalled()
		expect(fs.writeFile).not.toHaveBeenCalled()
	})

	it('throws on oversized file without calling blob', async () => {
		const oversizedChunk = new Uint8Array(101 * 1024 * 1024)
		const file = createMockFile('big.pdf', 'application/pdf', [oversizedChunk])

		await expect(saveUploadedFile(file)).rejects.toThrow(
			'File exceeds 100MB limit.',
		)
		expect(put).not.toHaveBeenCalled()
	})
})

describe('blob backend: updateMetadata', () => {
	beforeEach(() => {
		vi.stubEnv('STORAGE_BACKEND', 'blob')
	})

	afterEach(() => {
		vi.unstubAllEnvs()
		vi.clearAllMocks()
	})

	it('reads existing from blob, merges, and re-uploads', async () => {
		const existing = createDocumentMetadata({ status: 'uploading' })

		vi.mocked(head).mockResolvedValue({
			url: 'https://blob.vercel-storage.com/documents/test-doc-id/metadata.json',
			pathname: 'documents/test-doc-id/metadata.json',
		} as never)

		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(mockFetchResponse(JSON.stringify(existing)))

		vi.mocked(put).mockResolvedValue({
			url: 'https://blob.vercel-storage.com/documents/test-doc-id/metadata.json',
			pathname: 'documents/test-doc-id/metadata.json',
		} as never)

		const result = await updateMetadata(existing.documentId, {
			status: 'processing',
		})

		expect(result.status).toBe('processing')
		expect(result.documentId).toBe(existing.documentId)
		expect(put).toHaveBeenCalledWith(
			'documents/test-doc-id/metadata.json',
			expect.stringContaining('"processing"'),
			{ access: 'public', allowOverwrite: true },
		)

		// Should NOT call local filesystem
		expect(fs.writeFile).not.toHaveBeenCalled()

		fetchSpy.mockRestore()
	})
})

describe('blob backend: getDocumentMetadata', () => {
	beforeEach(() => {
		vi.stubEnv('STORAGE_BACKEND', 'blob')
	})

	afterEach(() => {
		vi.unstubAllEnvs()
		vi.clearAllMocks()
	})

	it('fetches metadata from blob via head + fetch', async () => {
		const meta = createDocumentMetadata()

		vi.mocked(head).mockResolvedValue({
			url: 'https://blob.vercel-storage.com/documents/test-doc-id/metadata.json',
			pathname: 'documents/test-doc-id/metadata.json',
		} as never)

		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(mockFetchResponse(JSON.stringify(meta)))

		const result = await getDocumentMetadata(meta.documentId)

		expect(result).toEqual(meta)
		expect(head).toHaveBeenCalledWith('documents/test-doc-id/metadata.json')
		expect(fetchSpy).toHaveBeenCalledWith(
			'https://blob.vercel-storage.com/documents/test-doc-id/metadata.json',
		)

		// Should NOT call local filesystem
		expect(fs.readFile).not.toHaveBeenCalled()

		fetchSpy.mockRestore()
	})

	it('throws descriptive error when fetch response is not ok', async () => {
		vi.mocked(head).mockResolvedValue({
			url: 'https://blob.vercel-storage.com/documents/bad-id/metadata.json',
			pathname: 'documents/bad-id/metadata.json',
		} as never)

		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(mockFetchResponse('', false))

		await expect(getDocumentMetadata('bad-id')).rejects.toThrow(
			'Failed to fetch metadata for bad-id',
		)

		fetchSpy.mockRestore()
	})

	it('throws when blob service is unreachable', async () => {
		vi.mocked(head).mockRejectedValue(
			new Error('BlobStoreNotFound: Blob store not found'),
		)

		await expect(getDocumentMetadata('test-id')).rejects.toThrow(
			'BlobStoreNotFound',
		)
	})
})

describe('blob backend: getOriginalFile', () => {
	beforeEach(() => {
		vi.stubEnv('STORAGE_BACKEND', 'blob')
	})

	afterEach(() => {
		vi.unstubAllEnvs()
		vi.clearAllMocks()
	})

	it('fetches binary content from blob', async () => {
		const meta = createDocumentMetadata({
			documentId: 'doc-123',
			fileName: 'original.pdf',
		})
		const pdfBytes = new ArrayBuffer(4)
		new Uint8Array(pdfBytes).set([0x25, 0x50, 0x44, 0x46]) // %PDF

		// First head call for getDocumentMetadata
		vi.mocked(head)
			.mockResolvedValueOnce({
				url: 'https://blob.vercel-storage.com/documents/doc-123/metadata.json',
				pathname: 'documents/doc-123/metadata.json',
			} as never)
			// Second head call for getOriginalFile
			.mockResolvedValueOnce({
				url: 'https://blob.vercel-storage.com/documents/doc-123/original.pdf',
				pathname: 'documents/doc-123/original.pdf',
			} as never)

		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			// First fetch for metadata
			.mockResolvedValueOnce(mockFetchResponse(JSON.stringify(meta)))
			// Second fetch for original file
			.mockResolvedValueOnce(mockFetchResponse(pdfBytes))

		const result = await getOriginalFile('doc-123')

		expect(result.metadata).toEqual(meta)
		expect(result.buffer).toEqual(Buffer.from(pdfBytes))

		fetchSpy.mockRestore()
	})
})

describe('blob backend: listDocuments', () => {
	beforeEach(() => {
		vi.stubEnv('STORAGE_BACKEND', 'blob')
	})

	afterEach(() => {
		vi.unstubAllEnvs()
		vi.clearAllMocks()
	})

	it('lists documents from blob using pagination', async () => {
		const older = createDocumentMetadata({
			documentId: 'older',
			uploadedAt: '2026-01-01T00:00:00.000Z',
		})
		const newer = createDocumentMetadata({
			documentId: 'newer',
			uploadedAt: '2026-02-01T00:00:00.000Z',
		})

		vi.mocked(list).mockResolvedValue({
			blobs: [
				{
					pathname: 'documents/older/metadata.json',
					url: 'https://blob.vercel-storage.com/documents/older/metadata.json',
				},
				{
					pathname: 'documents/older/content.md',
					url: 'https://blob.vercel-storage.com/documents/older/content.md',
				},
				{
					pathname: 'documents/newer/metadata.json',
					url: 'https://blob.vercel-storage.com/documents/newer/metadata.json',
				},
			],
			hasMore: false,
			cursor: undefined,
		} as never)

		vi.mocked(head)
			.mockResolvedValueOnce({
				url: 'https://blob.vercel-storage.com/documents/older/metadata.json',
			} as never)
			.mockResolvedValueOnce({
				url: 'https://blob.vercel-storage.com/documents/newer/metadata.json',
			} as never)

		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce(mockFetchResponse(JSON.stringify(older)))
			.mockResolvedValueOnce(mockFetchResponse(JSON.stringify(newer)))

		const result = await listDocuments()

		expect(result).toHaveLength(2)
		expect(result[0].documentId).toBe('newer')
		expect(result[1].documentId).toBe('older')
		expect(list).toHaveBeenCalledWith({ prefix: 'documents/' })

		fetchSpy.mockRestore()
	})

	it('handles pagination with cursor', async () => {
		const doc = createDocumentMetadata({ documentId: 'page-2-doc' })

		vi.mocked(list)
			.mockResolvedValueOnce({
				blobs: [],
				hasMore: true,
				cursor: 'cursor-abc',
			} as never)
			.mockResolvedValueOnce({
				blobs: [
					{
						pathname: 'documents/page-2-doc/metadata.json',
						url: 'https://blob.vercel-storage.com/documents/page-2-doc/metadata.json',
					},
				],
				hasMore: false,
				cursor: undefined,
			} as never)

		vi.mocked(head).mockResolvedValue({
			url: 'https://blob.vercel-storage.com/documents/page-2-doc/metadata.json',
		} as never)

		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(mockFetchResponse(JSON.stringify(doc)))

		const result = await listDocuments()

		expect(result).toHaveLength(1)
		expect(result[0].documentId).toBe('page-2-doc')
		expect(list).toHaveBeenCalledTimes(2)
		expect(list).toHaveBeenCalledWith({
			prefix: 'documents/',
			cursor: 'cursor-abc',
		})

		fetchSpy.mockRestore()
	})

	it('skips blobs with invalid metadata', async () => {
		vi.mocked(list).mockResolvedValue({
			blobs: [
				{
					pathname: 'documents/bad-doc/metadata.json',
					url: 'https://blob.vercel-storage.com/documents/bad-doc/metadata.json',
				},
			],
			hasMore: false,
		} as never)

		vi.mocked(head).mockRejectedValue(new Error('BlobNotFound'))

		const result = await listDocuments()

		expect(result).toEqual([])
	})
})

describe('blob backend: deleteDocument', () => {
	beforeEach(() => {
		vi.stubEnv('STORAGE_BACKEND', 'blob')
	})

	afterEach(() => {
		vi.unstubAllEnvs()
		vi.clearAllMocks()
	})

	it('lists and deletes all blobs for the document', async () => {
		vi.mocked(list).mockResolvedValue({
			blobs: [
				{
					url: 'https://blob.vercel-storage.com/documents/doc-to-delete/content.md',
					pathname: 'documents/doc-to-delete/content.md',
				},
				{
					url: 'https://blob.vercel-storage.com/documents/doc-to-delete/metadata.json',
					pathname: 'documents/doc-to-delete/metadata.json',
				},
			],
			hasMore: false,
		} as never)

		vi.mocked(del).mockResolvedValue(undefined as never)

		await deleteDocument('doc-to-delete')

		expect(list).toHaveBeenCalledWith({
			prefix: 'documents/doc-to-delete/',
		})
		expect(del).toHaveBeenCalledWith([
			'https://blob.vercel-storage.com/documents/doc-to-delete/content.md',
			'https://blob.vercel-storage.com/documents/doc-to-delete/metadata.json',
		])

		// Should NOT call local filesystem
		expect(fs.rm).not.toHaveBeenCalled()
	})

	it('handles empty blob list gracefully', async () => {
		vi.mocked(list).mockResolvedValue({
			blobs: [],
			hasMore: false,
		} as never)

		await deleteDocument('nonexistent-doc')

		expect(del).not.toHaveBeenCalled()
	})

	it('rejects invalid document IDs', async () => {
		await expect(deleteDocument('../../etc')).rejects.toThrow(
			'Invalid documentId format',
		)
	})
})

describe('blob backend: error scenarios', () => {
	beforeEach(() => {
		vi.stubEnv('STORAGE_BACKEND', 'blob')
	})

	afterEach(() => {
		vi.unstubAllEnvs()
		vi.clearAllMocks()
	})

	it('throws descriptive error when blob token is invalid (Scenario 5.5)', async () => {
		vi.mocked(put).mockRejectedValue(
			new Error(
				"BlobAccessError: You don't have access to this Vercel Blob store. Check your BLOB_READ_WRITE_TOKEN.",
			),
		)

		await expect(saveMarkdown('test-id', '# content')).rejects.toThrow(
			'BlobAccessError',
		)
	})
})
