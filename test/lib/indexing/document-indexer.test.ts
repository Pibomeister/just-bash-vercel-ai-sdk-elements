import { vi } from 'vitest'

const mockDocumentsUpsert = vi.fn()
const mockDocumentsDelete = vi.fn()

vi.mock('@llamaindex/llama-cloud', () => ({
	LlamaCloud: vi.fn().mockImplementation(function () {
		return {
			pipelines: {
				documents: {
					upsert: mockDocumentsUpsert,
					delete: mockDocumentsDelete,
				},
			},
		}
	}),
}))

import {
	buildMetadata,
	indexDocument,
	removeDocument,
} from '@/lib/indexing/document-indexer'
import type { DocumentMetadata } from '@/lib/types/documents'

const baseDocMeta: DocumentMetadata = {
	documentId: 'doc-123',
	fileName: 'contrato.pdf',
	originalName: 'Contrato de Servicios.pdf',
	mimeType: 'application/pdf',
	fileSize: 102400,
	uploadedAt: '2026-02-15T12:00:00.000Z',
	status: 'completed',
}

describe('buildMetadata', () => {
	it('extracts correct fields from docMeta when sidecar is null', () => {
		const meta = buildMetadata(null, baseDocMeta)
		expect(meta).toEqual({
			documentId: 'doc-123',
			originalName: 'Contrato de Servicios.pdf',
			mimeType: 'application/pdf',
			uploadedAt: '2026-02-15T12:00:00.000Z',
		})
	})

	it('extracts document info from sidecar', () => {
		const sidecar = {
			document: {
				type: 'contrato',
				title: 'Contrato de Servicios Profesionales',
				totalLines: 250,
				totalWords: 1500,
			},
		}
		const meta = buildMetadata(sidecar, baseDocMeta)
		expect(meta.documentType).toBe('contrato')
		expect(meta.title).toBe('Contrato de Servicios Profesionales')
		expect(meta.totalLines).toBe(250)
		expect(meta.totalWords).toBe(1500)
	})

	it('serializes parties from sidecar as JSON string', () => {
		const sidecar = {
			document: {
				type: 'contrato',
				title: 'Test',
				totalLines: 10,
				totalWords: 50,
				parties: ['Acme Corp', 'Juan Perez'],
			},
		}
		const meta = buildMetadata(sidecar, baseDocMeta)
		expect(meta.parties).toBe(JSON.stringify(['Acme Corp', 'Juan Perez']))
	})

	it('does not include parties when absent in sidecar document', () => {
		const sidecar = {
			document: {
				type: 'ley',
				title: 'Ley General',
				totalLines: 500,
				totalWords: 5000,
			},
		}
		const meta = buildMetadata(sidecar, baseDocMeta)
		expect(meta.parties).toBeUndefined()
	})

	it('handles sidecar without document property', () => {
		const sidecar = { otherField: 'value' }
		const meta = buildMetadata(sidecar, baseDocMeta)
		expect(meta.documentType).toBeUndefined()
		expect(meta.title).toBeUndefined()
		expect(meta.documentId).toBe('doc-123')
	})
})

describe('indexDocument', () => {
	beforeEach(() => {
		vi.stubEnv('LLAMA_CLOUD_API_KEY', 'test-api-key')
		mockDocumentsUpsert.mockReset()
		mockDocumentsUpsert.mockResolvedValue(undefined)
	})

	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it('calls documents.upsert with correct params', async () => {
		await indexDocument('pipe-123', {
			documentId: 'doc-1',
			text: 'Legal document content here',
			metadata: { documentType: 'ley', title: 'Ley Aduanera' },
		})

		expect(mockDocumentsUpsert).toHaveBeenCalledWith('pipe-123', {
			body: [
				{
					text: 'Legal document content here',
					id: 'doc-1',
					metadata: { documentType: 'ley', title: 'Ley Aduanera' },
				},
			],
		})
	})

	it('uses empty object for metadata when not provided', async () => {
		await indexDocument('pipe-123', {
			documentId: 'doc-2',
			text: 'Content',
		})

		expect(mockDocumentsUpsert).toHaveBeenCalledWith('pipe-123', {
			body: [
				{
					text: 'Content',
					id: 'doc-2',
					metadata: {},
				},
			],
		})
	})
})

describe('removeDocument', () => {
	beforeEach(() => {
		vi.stubEnv('LLAMA_CLOUD_API_KEY', 'test-api-key')
		mockDocumentsDelete.mockReset()
		mockDocumentsDelete.mockResolvedValue(undefined)
	})

	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it('calls documents.delete with correct params', async () => {
		await removeDocument('pipe-123', 'doc-456')

		expect(mockDocumentsDelete).toHaveBeenCalledWith('doc-456', {
			pipeline_id: 'pipe-123',
		})
	})
})
