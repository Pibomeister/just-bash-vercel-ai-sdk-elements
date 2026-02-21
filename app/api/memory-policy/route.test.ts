import { createJsonRequest } from '@/test/helpers/mock-request'
import { POST } from './route'

// ---------------------------------------------------------------------------
// POST /api/memory-policy
// ---------------------------------------------------------------------------

describe('POST /api/memory-policy', () => {
	it('returns 400 on invalid JSON', async () => {
		const req = new Request('http://localhost/api/memory-policy', {
			method: 'POST',
			body: 'bad json',
			headers: { 'Content-Type': 'application/json' },
		})

		const res = await POST(req)

		expect(res.status).toBe(400)
	})

	it('accepts valid policy flags and returns them', async () => {
		const req = createJsonRequest({
			useMemory: true,
			updateMemory: false,
			temporaryChat: true,
		})

		const res = await POST(req)
		const body = await res.json()

		expect(res.status).toBe(200)
		expect(body).toEqual({
			success: true,
			policy: {
				useMemory: true,
				updateMemory: false,
				temporaryChat: true,
			},
		})
	})

	it('applies defaults for omitted flags', async () => {
		const req = createJsonRequest({})

		const res = await POST(req)
		const body = await res.json()

		expect(body.policy).toEqual({
			useMemory: true,
			updateMemory: true,
			temporaryChat: false,
		})
	})

	it('returns 400 when flags are non-boolean', async () => {
		const req = createJsonRequest({ useMemory: 'yes' })

		const res = await POST(req)

		expect(res.status).toBe(400)
	})
})
