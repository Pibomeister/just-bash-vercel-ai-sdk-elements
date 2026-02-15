vi.mock('@/lib/sandbox')
vi.mock('@/lib/encoding')

import { decodeWithFallback } from '@/lib/encoding'
import { readFileBuffer } from '@/lib/sandbox'
import { createJsonRequest } from '@/test/helpers/mock-request'
import { POST } from './route'

describe('POST /api/read-file', () => {
	it('returns 400 on invalid JSON body', async () => {
		const req = new Request('http://localhost:3000', {
			method: 'POST',
			body: 'not json',
			headers: { 'Content-Type': 'application/json' },
		})

		const res = await POST(req)
		const data = await res.json()

		expect(res.status).toBe(400)
		expect(data).toEqual({ error: 'Invalid JSON' })
	})

	it('returns 400 when path is missing', async () => {
		const req = createJsonRequest({})

		const res = await POST(req)
		const data = await res.json()

		expect(res.status).toBe(400)
		expect(data).toEqual({ error: 'Missing or invalid path' })
	})

	it('returns 400 when path is not a string', async () => {
		const req = createJsonRequest({ path: 42 })

		const res = await POST(req)
		const data = await res.json()

		expect(res.status).toBe(400)
		expect(data).toEqual({ error: 'Missing or invalid path' })
	})

	it('returns text content for text files', async () => {
		const bytes = new Uint8Array([72, 101, 108, 108, 111])
		vi.mocked(readFileBuffer).mockResolvedValue(bytes)
		vi.mocked(decodeWithFallback).mockReturnValue('Hello')

		const req = createJsonRequest({ path: 'readme.md' })

		const res = await POST(req)
		const data = await res.json()

		expect(res.status).toBe(200)
		expect(data).toEqual({ content: 'Hello' })
		expect(decodeWithFallback).toHaveBeenCalledWith(bytes)
	})

	it('returns base64-encoded content for binary files', async () => {
		const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46])
		vi.mocked(readFileBuffer).mockResolvedValue(bytes)

		const req = createJsonRequest({ path: 'report.pdf' })

		const res = await POST(req)
		const data = await res.json()

		expect(res.status).toBe(200)
		expect(data).toEqual({
			content: Buffer.from(bytes).toString('base64'),
		})
		// Binary path uses Buffer.toString('base64') directly, not decodeWithFallback
		expect(readFileBuffer).toHaveBeenCalledWith('/documents/report.pdf')
	})

	it('strips "documents/" prefix from the path', async () => {
		const bytes = new Uint8Array([65])
		vi.mocked(readFileBuffer).mockResolvedValue(bytes)
		vi.mocked(decodeWithFallback).mockReturnValue('A')

		const req = createJsonRequest({ path: 'documents/notes.txt' })

		await POST(req)

		expect(readFileBuffer).toHaveBeenCalledWith('/documents/notes.txt')
	})

	it('returns 404 when readFileBuffer throws', async () => {
		vi.mocked(readFileBuffer).mockRejectedValue(
			new Error('ENOENT: no such file'),
		)

		const req = createJsonRequest({ path: 'missing.txt' })

		const res = await POST(req)
		const data = await res.json()

		expect(res.status).toBe(404)
		expect(data).toEqual({ error: 'File not found' })
	})
})
