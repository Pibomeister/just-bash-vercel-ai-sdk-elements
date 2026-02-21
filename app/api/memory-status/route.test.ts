import { GET } from './route'

// ---------------------------------------------------------------------------
// GET /api/memory-status
// ---------------------------------------------------------------------------

describe('GET /api/memory-status', () => {
	it('returns 200 with status payload', async () => {
		const res = await GET()

		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body.status).toBe('ok')
		expect(body).toHaveProperty('tier')
		expect(body).toHaveProperty('observationalMemory')
		expect(body.observationalMemory.enabled).toBe(true)
	})
})
