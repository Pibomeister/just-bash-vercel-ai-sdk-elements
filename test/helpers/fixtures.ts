import type { DocumentMetadata } from '@/lib/types/documents'

export function createDocumentMetadata(
	overrides: Partial<DocumentMetadata> = {},
): DocumentMetadata {
	return {
		documentId: 'test-doc-id',
		fileName: 'test-doc-id.pdf',
		originalName: 'test-document.pdf',
		mimeType: 'application/pdf',
		fileSize: 1024,
		status: 'completed',
		uploadedAt: '2026-01-15T00:00:00.000Z',
		...overrides,
	}
}
