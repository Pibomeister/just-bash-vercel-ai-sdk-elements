vi.mock('@/lib/document-storage')

import { listDocuments } from '@/lib/document-storage'
import { createDocumentMetadata } from '@/test/helpers/fixtures'
import { GET } from './route'

describe('GET /api/documents', () => {
	it('returns document list from listDocuments as JSON', async () => {
		const docs = [
			createDocumentMetadata({ documentId: 'doc-1' }),
			createDocumentMetadata({ documentId: 'doc-2' }),
		]
		vi.mocked(listDocuments).mockResolvedValue(docs)

		const res = await GET()
		const data = await res.json()

		expect(res.status).toBe(200)
		expect(data).toEqual(docs)
	})

	it('returns empty array with 200 when listDocuments throws', async () => {
		vi.mocked(listDocuments).mockRejectedValue(new Error('disk failure'))

		const res = await GET()
		const data = await res.json()

		expect(res.status).toBe(200)
		expect(data).toEqual([])
	})

	it('calls listDocuments exactly once per invocation', async () => {
		vi.mocked(listDocuments).mockClear()
		vi.mocked(listDocuments).mockResolvedValue([])

		await GET()

		expect(listDocuments).toHaveBeenCalledOnce()
	})
})
