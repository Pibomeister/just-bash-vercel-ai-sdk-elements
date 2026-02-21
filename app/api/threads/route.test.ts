// Mock resource-id before any imports — cookie access requires a request scope
vi.mock('@/lib/resource-id', () => ({
	requireResourceId: vi.fn(async () => ({
		resourceId: 'user-abc',
		isNew: false,
	})),
	getServerResourceId: vi.fn(async () => 'user-abc'),
}))

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

	it('creates a thread using the server-derived resourceId from cookie', async () => {
		// resourceId comes from the signed cookie, not the request body
		const req = createJsonRequest({})

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
		const req = createJsonRequest({ title: 'My Chat' })

		await POST(req)

		expect(mastraClient.createThread).toHaveBeenCalledWith({
			resourceId: 'user-abc',
			title: 'My Chat',
		})
	})

	it('ignores any client-supplied resourceId in the body', async () => {
		// The route must never use a client-supplied resourceId
		const req = createJsonRequest({ resourceId: 'attacker-controlled-id' })

		await POST(req)

		// Only the cookie-derived 'user-abc' should be used
		expect(mastraClient.createThread).toHaveBeenCalledWith({
			resourceId: 'user-abc',
			title: undefined,
		})
	})

	it('returns 500 when createThread throws', async () => {
		vi.mocked(mastraClient.createThread).mockRejectedValueOnce(
			new Error('DB error'),
		)
		const req = createJsonRequest({})

		const res = await POST(req)

		expect(res.status).toBe(500)
	})
})

// ---------------------------------------------------------------------------
// GET /api/threads — list threads
// ---------------------------------------------------------------------------

describe('GET /api/threads', () => {
	beforeEach(() => vi.clearAllMocks())

	it('returns empty threads when no cookie resourceId is available', async () => {
		// Mock cookie returning null
		const { getServerResourceId } = await import('@/lib/resource-id')
		vi.mocked(getServerResourceId).mockResolvedValueOnce(null)

		const res = await GET()
		const body = await res.json()

		expect(res.status).toBe(200)
		expect(body).toEqual({ threads: [] })
	})

	it('returns threads ordered by updatedAt descending', async () => {
		// resourceId comes from the signed cookie mock (returns 'user-abc')
		const res = await GET()
		const body = await res.json()

		expect(res.status).toBe(200)
		expect(body.threads).toHaveLength(2)
		// Second thread has newer updatedAt (2026-01-04) so it should be first
		expect(body.threads[0].threadId).toBe('thread-2')
		expect(body.threads[1].threadId).toBe('thread-1')
	})

	it('returns correct thread shape', async () => {
		const res = await GET()
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

		const res = await GET()

		expect(res.status).toBe(500)
	})
})
