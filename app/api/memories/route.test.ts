vi.mock('@/lib/resource-id', () => ({
	getServerResourceId: vi.fn(async () => 'rid-001'),
}))

vi.mock('@/lib/mastra-client', () => ({
	getMessages: vi.fn(async () => []),
}))

import * as mastraClient from '@/lib/mastra-client'
import { getServerResourceId } from '@/lib/resource-id'
import { GET } from './route'

// ---------------------------------------------------------------------------
// GET /api/memories — paginated listing
// ---------------------------------------------------------------------------

describe('GET /api/memories', () => {
	beforeEach(() => vi.clearAllMocks())

	it('returns 400 when threadId is missing', async () => {
		const req = new Request('http://localhost/api/memories')

		const res = await GET(req)

		expect(res.status).toBe(400)
	})

	it('returns 400 when resourceId cookie is missing', async () => {
		vi.mocked(getServerResourceId).mockResolvedValueOnce(null)
		const req = new Request('http://localhost/api/memories?threadId=tid-001')

		const res = await GET(req)

		expect(res.status).toBe(400)
	})

	it('returns paginated items when both params provided', async () => {
		vi.mocked(mastraClient.getMessages).mockResolvedValue([
			{
				id: 'msg-1',
				role: 'assistant',
				createdAt: new Date(),
				content: {
					format: 2,
					parts: [{ type: 'text', text: 'observation 1' }],
				},
			},
			{
				id: 'msg-2',
				role: 'user',
				createdAt: new Date(),
				content: { format: 2, parts: [{ type: 'text', text: 'user msg' }] },
			},
		] as never)

		const req = new Request('http://localhost/api/memories?threadId=tid-001')

		const res = await GET(req)
		const body = await res.json()

		expect(res.status).toBe(200)
		expect(body.items).toHaveLength(2)
		expect(body.totalApprox).toBe(2)
	})

	it('excludes soft-deleted items from results', async () => {
		vi.mocked(mastraClient.getMessages).mockResolvedValue([
			{
				id: 'msg-active',
				role: 'assistant',
				createdAt: new Date(),
				content: { format: 2, parts: [{ type: 'text', text: 'active' }] },
			},
			{
				id: 'msg-deleted',
				role: 'assistant',
				createdAt: new Date(),
				content: {
					format: 2,
					parts: [{ type: 'text', text: 'deleted' }],
					metadata: { status: 'deleted' },
				},
			},
		] as never)

		const req = new Request('http://localhost/api/memories?threadId=tid-001')

		const res = await GET(req)
		const body = await res.json()

		expect(body.items).toHaveLength(1)
		expect(body.items[0].id).toBe('msg-active')
	})

	it('passes limit param to getMessages', async () => {
		const req = new Request(
			'http://localhost/api/memories?threadId=tid-001&limit=25',
		)

		await GET(req)

		expect(mastraClient.getMessages).toHaveBeenCalledWith({
			threadId: 'tid-001',
			limit: 25,
		})
	})

	it('returns 500 when getMessages throws', async () => {
		vi.mocked(mastraClient.getMessages).mockRejectedValueOnce(
			new Error('DB error'),
		)
		const req = new Request('http://localhost/api/memories?threadId=tid-001')

		const res = await GET(req)

		expect(res.status).toBe(500)
	})
})
