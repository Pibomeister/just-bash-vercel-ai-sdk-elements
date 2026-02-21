vi.mock('@/lib/mastra-client', () => ({
	createThread: vi.fn(async () => ({
		id: 'new-thread-id',
		resourceId: 'user-abc',
		createdAt: new Date('2026-01-01T00:00:00Z'),
		updatedAt: new Date('2026-01-01T00:00:00Z'),
	})),
	getThreads: vi.fn(async () => [
		{
			id: 'thread-1',
			resourceId: 'user-abc',
			title: 'First thread',
			createdAt: new Date('2026-01-01T00:00:00Z'),
			updatedAt: new Date('2026-01-02T00:00:00Z'),
		},
		{
			id: 'thread-2',
			resourceId: 'user-abc',
			title: 'Second thread',
			createdAt: new Date('2026-01-03T00:00:00Z'),
			updatedAt: new Date('2026-01-04T00:00:00Z'),
		},
	]),
	getThreadById: vi.fn(async () => null),
	deleteThread: vi.fn(async () => undefined),
}))

import * as mastraClient from '@/lib/mastra-client'
import { createJsonRequest } from '@/test/helpers/mock-request'
import { GET, POST } from './route'

// ---------------------------------------------------------------------------
// POST /api/threads — create thread
// ---------------------------------------------------------------------------

describe('POST /api/threads', () => {
	beforeEach(() => vi.clearAllMocks())

	it('returns 400 on invalid JSON', async () => {
		const req = new Request('http://localhost/api/threads', {
			method: 'POST',
			body: '{invalid}',
			headers: { 'Content-Type': 'application/json' },
		})

		const res = await POST(req)

		expect(res.status).toBe(400)
	})

	it('returns 400 when resourceId is missing', async () => {
		const req = createJsonRequest({})

		const res = await POST(req)

		expect(res.status).toBe(400)
	})

	it('creates a thread and returns threadId + createdAt', async () => {
		const req = createJsonRequest({ resourceId: 'user-abc' })

		const res = await POST(req)
		const body = await res.json()

		expect(res.status).toBe(200)
		expect(body).toHaveProperty('threadId', 'new-thread-id')
		expect(body).toHaveProperty('createdAt')
		expect(mastraClient.createThread).toHaveBeenCalledWith({
			resourceId: 'user-abc',
			title: undefined,
		})
	})

	it('passes optional title to createThread', async () => {
		const req = createJsonRequest({ resourceId: 'user-abc', title: 'My Chat' })

		await POST(req)

		expect(mastraClient.createThread).toHaveBeenCalledWith({
			resourceId: 'user-abc',
			title: 'My Chat',
		})
	})

	it('returns 500 when createThread throws', async () => {
		vi.mocked(mastraClient.createThread).mockRejectedValueOnce(
			new Error('DB error'),
		)
		const req = createJsonRequest({ resourceId: 'user-abc' })

		const res = await POST(req)

		expect(res.status).toBe(500)
	})
})

// ---------------------------------------------------------------------------
// GET /api/threads — list threads
// ---------------------------------------------------------------------------

describe('GET /api/threads', () => {
	beforeEach(() => vi.clearAllMocks())

	it('returns empty threads when resourceId is missing', async () => {
		const req = new Request('http://localhost/api/threads')

		const res = await GET(req)
		const body = await res.json()

		expect(res.status).toBe(200)
		expect(body).toEqual({ threads: [] })
	})

	it('returns threads ordered by updatedAt descending', async () => {
		const req = new Request('http://localhost/api/threads?resourceId=user-abc')

		const res = await GET(req)
		const body = await res.json()

		expect(res.status).toBe(200)
		expect(body.threads).toHaveLength(2)
		// Second thread has newer updatedAt (2026-01-04) so it should be first
		expect(body.threads[0].threadId).toBe('thread-2')
		expect(body.threads[1].threadId).toBe('thread-1')
	})

	it('returns correct thread shape', async () => {
		const req = new Request('http://localhost/api/threads?resourceId=user-abc')

		const res = await GET(req)
		const body = await res.json()

		const thread = body.threads[0]
		expect(thread).toHaveProperty('threadId')
		expect(thread).toHaveProperty('createdAt')
		expect(thread).toHaveProperty('updatedAt')
		expect(thread).toHaveProperty('messageCount')
	})

	it('returns 500 when getThreads throws', async () => {
		vi.mocked(mastraClient.getThreads).mockRejectedValueOnce(
			new Error('DB error'),
		)
		const req = new Request('http://localhost/api/threads?resourceId=user-abc')

		const res = await GET(req)

		expect(res.status).toBe(500)
	})
})
