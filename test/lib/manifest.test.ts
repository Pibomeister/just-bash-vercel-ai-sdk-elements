vi.mock('node:fs/promises')
vi.mock('@vercel/blob')
vi.mock('@/lib/document-storage')

import { access } from 'node:fs/promises'
import { head } from '@vercel/blob'
import {
	getSidecarPath,
	getStorageBackend,
	listDocuments,
} from '@/lib/document-storage'
import { generateManifest } from '@/lib/manifest'
import { createDocumentMetadata } from '@/test/helpers/fixtures'

describe('generateManifest', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('local backend', () => {
		beforeEach(() => {
			vi.mocked(getStorageBackend).mockReturnValue('local')
			vi.mocked(getSidecarPath).mockImplementation(
				(id) => `/uploads/${id}/sidecar.json`,
			)
		})

		it('generates manifest with 3 documents (Scenario 5.4)', async () => {
			const doc1 = createDocumentMetadata({
				documentId: 'doc-1',
				originalName: 'contract.pdf',
				mimeType: 'application/pdf',
				status: 'completed',
			})
			const doc2 = createDocumentMetadata({
				documentId: 'doc-2',
				originalName: 'brief.docx',
				mimeType:
					'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				status: 'completed',
			})
			const doc3 = createDocumentMetadata({
				documentId: 'doc-3',
				originalName: 'memo.pdf',
				mimeType: 'application/pdf',
				status: 'completed',
			})

			vi.mocked(listDocuments).mockResolvedValue([doc1, doc2, doc3])

			// doc-1 and doc-2 have sidecars, doc-3 does not
			vi.mocked(access)
				.mockResolvedValueOnce(undefined) // doc-1 has sidecar
				.mockResolvedValueOnce(undefined) // doc-2 has sidecar
				.mockRejectedValueOnce(new Error('ENOENT')) // doc-3 no sidecar

			const manifest = await generateManifest()

			expect(manifest.documents).toHaveLength(3)
			expect(manifest.generatedAt).toBeTruthy()

			// Verify each entry has required fields
			for (const entry of manifest.documents) {
				expect(entry).toHaveProperty('id')
				expect(entry).toHaveProperty('name')
				expect(entry).toHaveProperty('type')
				expect(entry).toHaveProperty('contentFile')
				expect(entry).toHaveProperty('sidecarFile')
				expect(entry).toHaveProperty('status')
			}

			// doc-1 has sidecar
			expect(manifest.documents[0].id).toBe('doc-1')
			expect(manifest.documents[0].name).toBe('contract.pdf')
			expect(manifest.documents[0].type).toBe('application/pdf')
			expect(manifest.documents[0].contentFile).toBe(
				'documents/doc-1/content.md',
			)
			expect(manifest.documents[0].sidecarFile).toBe(
				'documents/doc-1/sidecar.json',
			)
			expect(manifest.documents[0].status).toBe('completed')

			// doc-2 has sidecar
			expect(manifest.documents[1].sidecarFile).toBe(
				'documents/doc-2/sidecar.json',
			)

			// doc-3 has no sidecar
			expect(manifest.documents[2].id).toBe('doc-3')
			expect(manifest.documents[2].sidecarFile).toBeNull()
		})

		it('returns empty documents array when no documents exist', async () => {
			vi.mocked(listDocuments).mockResolvedValue([])

			const manifest = await generateManifest()

			expect(manifest.documents).toEqual([])
			expect(manifest.generatedAt).toBeTruthy()
		})

		it('generates valid JSON structure', async () => {
			const doc = createDocumentMetadata({
				documentId: 'json-doc',
				originalName: 'test.pdf',
			})
			vi.mocked(listDocuments).mockResolvedValue([doc])
			vi.mocked(access).mockRejectedValue(new Error('ENOENT'))

			const manifest = await generateManifest()

			// Verify it can be serialized and parsed as valid JSON
			const json = JSON.stringify(manifest)
			const parsed = JSON.parse(json)

			expect(parsed.documents).toHaveLength(1)
			expect(parsed.generatedAt).toBe(manifest.generatedAt)
		})
	})

	describe('blob backend', () => {
		beforeEach(() => {
			vi.mocked(getStorageBackend).mockReturnValue('blob')
		})

		it('checks sidecar existence via blob head', async () => {
			const doc1 = createDocumentMetadata({
				documentId: 'blob-doc-1',
				originalName: 'law.pdf',
				status: 'completed',
			})
			const doc2 = createDocumentMetadata({
				documentId: 'blob-doc-2',
				originalName: 'ruling.pdf',
				status: 'completed',
			})

			vi.mocked(listDocuments).mockResolvedValue([doc1, doc2])

			vi.mocked(head)
				.mockResolvedValueOnce({
					url: 'https://blob.vercel-storage.com/documents/blob-doc-1/sidecar.json',
				} as never) // doc-1 has sidecar
				.mockRejectedValueOnce(new Error('BlobNotFound')) // doc-2 no sidecar

			const manifest = await generateManifest()

			expect(manifest.documents).toHaveLength(2)
			expect(manifest.documents[0].sidecarFile).toBe(
				'documents/blob-doc-1/sidecar.json',
			)
			expect(manifest.documents[1].sidecarFile).toBeNull()

			expect(head).toHaveBeenCalledWith('documents/blob-doc-1/sidecar.json')
			expect(head).toHaveBeenCalledWith('documents/blob-doc-2/sidecar.json')

			// Should NOT check local filesystem
			expect(access).not.toHaveBeenCalled()
		})
	})
})
