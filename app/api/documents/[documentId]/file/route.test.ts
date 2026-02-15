vi.mock('@/lib/document-storage')

import { getOriginalFile } from '@/lib/document-storage'
import { createDocumentMetadata } from '@/test/helpers/fixtures'
import { GET } from './route'

const req = new Request('http://localhost:3000')

function withParams(documentId: string) {
	return { params: Promise.resolve({ documentId }) }
}

describe('GET /api/documents/[documentId]/file', () => {
	it('returns binary response with correct headers', async () => {
		const metadata = createDocumentMetadata({
			documentId: 'file-doc',
			originalName: 'report.pdf',
			mimeType: 'application/pdf',
		})
		const buffer = Buffer.from('fake-pdf-content')

		vi.mocked(getOriginalFile).mockResolvedValue({ buffer, metadata })

		const res = await GET(req, withParams('file-doc'))

		expect(res.status).toBe(200)
		expect(res.headers.get('Content-Type')).toBe('application/pdf')
		expect(res.headers.get('Content-Disposition')).toBe(
			'inline; filename="report.pdf"',
		)
		expect(res.headers.get('Content-Length')).toBe(String(buffer.byteLength))

		const body = new Uint8Array(await res.arrayBuffer())
		expect(body).toEqual(new Uint8Array(buffer))
	})

	it('returns 404 when file is not found', async () => {
		vi.mocked(getOriginalFile).mockRejectedValue(
			new Error('ENOENT: no such file or directory'),
		)

		const res = await GET(req, withParams('nonexistent'))
		const data = await res.json()

		expect(res.status).toBe(404)
		expect(data).toEqual({ error: 'File not found' })
	})

	it('passes the correct documentId to getOriginalFile', async () => {
		vi.mocked(getOriginalFile).mockClear()
		const metadata = createDocumentMetadata({ documentId: 'verify-id' })
		const buffer = Buffer.from('content')
		vi.mocked(getOriginalFile).mockResolvedValue({ buffer, metadata })

		await GET(req, withParams('verify-id'))

		expect(getOriginalFile).toHaveBeenCalledWith('verify-id')
		expect(getOriginalFile).toHaveBeenCalledOnce()
	})
})
