import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// vi.mock() is hoisted to the top of the file — use vi.hoisted() so that
// mockMemory is initialized before the factory function runs.
// ---------------------------------------------------------------------------

const mockMemory = vi.hoisted(() => ({
	getWorkingMemory: vi.fn(),
	recall: vi.fn(),
	saveMessages: vi.fn(),
	createThread: vi.fn(),
	listThreads: vi.fn(),
	getThreadById: vi.fn(),
	deleteThread: vi.fn(),
}))

vi.mock('./mastra', () => ({ memory: mockMemory }))

import {
	createThread,
	deleteThread,
	getMessages,
	getThreadById,
	getThreads,
	getWorkingMemory,
	saveMessages,
} from './mastra-client'

describe('mastra-client', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	// -------------------------------------------------------------------------
	// getWorkingMemory
	// -------------------------------------------------------------------------

	describe('getWorkingMemory', () => {
		it('delegates to memory.getWorkingMemory with threadId and resourceId', async () => {
			mockMemory.getWorkingMemory.mockResolvedValue('User prefers dark mode')

			const result = await getWorkingMemory({
				threadId: 'tid-1',
				resourceId: 'uid-1',
			})

			expect(mockMemory.getWorkingMemory).toHaveBeenCalledWith({
				threadId: 'tid-1',
				resourceId: 'uid-1',
			})
			expect(result).toBe('User prefers dark mode')
		})

		it('works without resourceId', async () => {
			mockMemory.getWorkingMemory.mockResolvedValue(null)

			const result = await getWorkingMemory({ threadId: 'tid-2' })

			expect(mockMemory.getWorkingMemory).toHaveBeenCalledWith({
				threadId: 'tid-2',
				resourceId: undefined,
			})
			expect(result).toBeNull()
		})

		it('propagates errors from memory layer', async () => {
			mockMemory.getWorkingMemory.mockRejectedValue(new Error('DB timeout'))

			await expect(getWorkingMemory({ threadId: 'tid-3' })).rejects.toThrow(
				'DB timeout',
			)
		})
	})

	// -------------------------------------------------------------------------
	// getMessages
	// -------------------------------------------------------------------------

	describe('getMessages', () => {
		const fakeMessages = [
			{
				id: 'msg-1',
				role: 'user',
				content: { format: 2, parts: [{ type: 'text', text: 'Hello' }] },
			},
			{
				id: 'msg-2',
				role: 'assistant',
				content: { format: 2, parts: [{ type: 'text', text: 'Hi there' }] },
			},
		]

		beforeEach(() => {
			mockMemory.recall.mockResolvedValue({ messages: fakeMessages })
		})

		it('calls memory.recall with threadId and default limit 50', async () => {
			await getMessages({ threadId: 'tid-1' })

			expect(mockMemory.recall).toHaveBeenCalledWith({
				threadId: 'tid-1',
				perPage: 50,
				page: 0,
			})
		})

		it('uses the provided limit', async () => {
			await getMessages({ threadId: 'tid-1', limit: 20 })

			expect(mockMemory.recall).toHaveBeenCalledWith({
				threadId: 'tid-1',
				perPage: 20,
				page: 0,
			})
		})

		it('returns the messages array from recall result', async () => {
			const result = await getMessages({ threadId: 'tid-1' })

			expect(result).toEqual(fakeMessages)
		})

		it('returns empty array when recall returns empty messages', async () => {
			mockMemory.recall.mockResolvedValue({ messages: [] })

			const result = await getMessages({ threadId: 'tid-1' })

			expect(result).toEqual([])
		})
	})

	// -------------------------------------------------------------------------
	// saveMessages
	// -------------------------------------------------------------------------

	describe('saveMessages', () => {
		it('calls memory.saveMessages with the provided messages', async () => {
			mockMemory.saveMessages.mockResolvedValue(undefined)

			const messages = [
				{
					id: 'msg-1',
					threadId: 'tid-1',
					resourceId: 'uid-1',
					role: 'user' as const,
					content: {
						format: 2 as const,
						parts: [{ type: 'text', text: 'Hello' }],
					},
					createdAt: new Date(),
				},
			]

			await saveMessages({ messages })

			expect(mockMemory.saveMessages).toHaveBeenCalledWith({ messages })
		})

		it('propagates errors from memory layer', async () => {
			mockMemory.saveMessages.mockRejectedValue(new Error('Write failed'))

			await expect(saveMessages({ messages: [] })).rejects.toThrow(
				'Write failed',
			)
		})
	})

	// -------------------------------------------------------------------------
	// createThread
	// -------------------------------------------------------------------------

	describe('createThread', () => {
		const fakeThread = {
			id: 'new-thread',
			resourceId: 'uid-1',
			createdAt: new Date(),
			updatedAt: new Date(),
		}

		it('calls memory.createThread with resourceId and optional title', async () => {
			mockMemory.createThread.mockResolvedValue(fakeThread)

			const result = await createThread({
				resourceId: 'uid-1',
				title: 'My Chat',
			})

			expect(mockMemory.createThread).toHaveBeenCalledWith({
				resourceId: 'uid-1',
				title: 'My Chat',
			})
			expect(result).toEqual(fakeThread)
		})

		it('works without a title', async () => {
			mockMemory.createThread.mockResolvedValue(fakeThread)

			await createThread({ resourceId: 'uid-1' })

			expect(mockMemory.createThread).toHaveBeenCalledWith({
				resourceId: 'uid-1',
				title: undefined,
			})
		})
	})

	// -------------------------------------------------------------------------
	// getThreads
	// -------------------------------------------------------------------------

	describe('getThreads', () => {
		it('calls memory.listThreads with resourceId filter and returns threads', async () => {
			const fakeThreads = [{ id: 'tid-1', resourceId: 'uid-1' }]
			mockMemory.listThreads.mockResolvedValue({ threads: fakeThreads })

			const result = await getThreads({ resourceId: 'uid-1' })

			expect(mockMemory.listThreads).toHaveBeenCalledWith({
				filter: { resourceId: 'uid-1' },
				perPage: 100,
				page: 0,
			})
			expect(result).toEqual(fakeThreads)
		})

		it('returns empty array when no threads exist', async () => {
			mockMemory.listThreads.mockResolvedValue({ threads: [] })

			const result = await getThreads({ resourceId: 'uid-1' })

			expect(result).toEqual([])
		})
	})

	// -------------------------------------------------------------------------
	// getThreadById
	// -------------------------------------------------------------------------

	describe('getThreadById', () => {
		it('calls memory.getThreadById with threadId', async () => {
			const fakeThread = { id: 'tid-1', resourceId: 'uid-1' }
			mockMemory.getThreadById.mockResolvedValue(fakeThread)

			const result = await getThreadById({ threadId: 'tid-1' })

			expect(mockMemory.getThreadById).toHaveBeenCalledWith({
				threadId: 'tid-1',
			})
			expect(result).toEqual(fakeThread)
		})

		it('returns null when thread does not exist', async () => {
			mockMemory.getThreadById.mockResolvedValue(null)

			const result = await getThreadById({ threadId: 'missing' })

			expect(result).toBeNull()
		})
	})

	// -------------------------------------------------------------------------
	// deleteThread
	// -------------------------------------------------------------------------

	describe('deleteThread', () => {
		it('calls memory.deleteThread with the threadId string', async () => {
			mockMemory.deleteThread.mockResolvedValue(undefined)

			await deleteThread({ threadId: 'tid-1' })

			// Note: deleteThread receives the string directly, not an object
			expect(mockMemory.deleteThread).toHaveBeenCalledWith('tid-1')
		})

		it('propagates errors from memory layer', async () => {
			mockMemory.deleteThread.mockRejectedValue(new Error('Thread not found'))

			await expect(deleteThread({ threadId: 'tid-1' })).rejects.toThrow(
				'Thread not found',
			)
		})
	})
})
