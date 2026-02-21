vi.mock('@/lib/mastra-client', () => ({
	getThreadById: vi.fn(async () => null),
	deleteThread: vi.fn(async () => undefined),
}))

import * as mastraClient from '@/lib/mastra-client'
import { DELETE } from './route'

// ---------------------------------------------------------------------------
// DELETE /api/threads/:threadId — ownership-validated deletion
// ---------------------------------------------------------------------------

describe('DELETE /api/threads/:threadId', () => {
	beforeEach(() => vi.clearAllMocks())

	function makeDeleteRequest(threadId: string, resourceId?: string) {
		const url = resourceId
			? `http://localhost/api/threads/${threadId}?resourceId=${encodeURIComponent(resourceId)}`
			: `http://localhost/api/threads/${threadId}`
		return {
			req: new Request(url, { method: 'DELETE' }),
			params: Promise.resolve({ threadId }),
		}
	}

	it('returns 400 when resourceId query param is missing', async () => {
		const { req, params } = makeDeleteRequest('tid-001')

		const res = await DELETE(req, { params })

		expect(res.status).toBe(400)
	})

	it('returns 404 when thread does not exist', async () => {
		vi.mocked(mastraClient.getThreadById).mockResolvedValue(null)
		const { req, params } = makeDeleteRequest('tid-nonexistent', 'user-abc')

		const res = await DELETE(req, { params })

		expect(res.status).toBe(404)
	})

	it('returns 403 when resourceId does not match thread owner', async () => {
		vi.mocked(mastraClient.getThreadById).mockResolvedValue({
			id: 'tid-001',
			resourceId: 'user-abc',
			createdAt: new Date(),
			updatedAt: new Date(),
		})
		const { req, params } = makeDeleteRequest('tid-001', 'user-xyz')

		const res = await DELETE(req, { params })

		expect(res.status).toBe(403)
	})

	it('deletes the thread and returns success when ownership matches', async () => {
		vi.mocked(mastraClient.getThreadById).mockResolvedValue({
			id: 'tid-001',
			resourceId: 'user-abc',
			createdAt: new Date(),
			updatedAt: new Date(),
		})
		const { req, params } = makeDeleteRequest('tid-001', 'user-abc')

		const res = await DELETE(req, { params })
		const body = await res.json()

		expect(res.status).toBe(200)
		expect(body).toEqual({ success: true })
		expect(mastraClient.deleteThread).toHaveBeenCalledWith({
			threadId: 'tid-001',
		})
	})

	it('returns 500 when deleteThread throws', async () => {
		vi.mocked(mastraClient.getThreadById).mockResolvedValue({
			id: 'tid-001',
			resourceId: 'user-abc',
			createdAt: new Date(),
			updatedAt: new Date(),
		})
		vi.mocked(mastraClient.deleteThread).mockRejectedValueOnce(
			new Error('DB error'),
		)
		const { req, params } = makeDeleteRequest('tid-001', 'user-abc')

		const res = await DELETE(req, { params })

		expect(res.status).toBe(500)
	})
})
