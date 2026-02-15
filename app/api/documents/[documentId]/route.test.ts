vi.mock('@/lib/document-storage')

import { deleteDocument, getDocumentMetadata } from '@/lib/document-storage'
import { createDocumentMetadata } from '@/test/helpers/fixtures'
import { DELETE, GET } from './route'

const req = new Request('http://localhost:3000')

function withParams(documentId: string) {
	return { params: Promise.resolve({ documentId }) }
}

describe('GET /api/documents/[documentId]', () => {
	it('returns metadata for a valid document ID', async () => {
		const metadata = createDocumentMetadata({ documentId: 'abc-123' })
		vi.mocked(getDocumentMetadata).mockResolvedValue(metadata)

		const res = await GET(req, withParams('abc-123'))
		const data = await res.json()

		expect(res.status).toBe(200)
		expect(data).toEqual(metadata)
		expect(getDocumentMetadata).toHaveBeenCalledWith('abc-123')
	})

	it('returns 404 when the document does not exist', async () => {
		vi.mocked(getDocumentMetadata).mockRejectedValue(
			new Error('ENOENT: no such file or directory'),
		)

		const res = await GET(req, withParams('missing-id'))
		const data = await res.json()

		expect(res.status).toBe(404)
		expect(data).toEqual({ error: 'Document not found' })
	})
})

describe('DELETE /api/documents/[documentId]', () => {
	it('returns success true on successful deletion', async () => {
		vi.mocked(deleteDocument).mockResolvedValue(undefined)

		const res = await DELETE(req, withParams('doc-to-delete'))
		const data = await res.json()

		expect(res.status).toBe(200)
		expect(data).toEqual({ success: true })
		expect(deleteDocument).toHaveBeenCalledWith('doc-to-delete')
	})

	it('returns 500 when deletion fails', async () => {
		vi.mocked(deleteDocument).mockRejectedValue(new Error('permission denied'))

		const res = await DELETE(req, withParams('locked-doc'))
		const data = await res.json()

		expect(res.status).toBe(500)
		expect(data).toEqual({ error: 'Failed to delete document' })
	})

	it('correctly awaits and destructures the params promise', async () => {
		vi.mocked(deleteDocument).mockResolvedValue(undefined)

		await DELETE(req, withParams('param-test-id'))

		expect(deleteDocument).toHaveBeenCalledWith('param-test-id')
	})
})
