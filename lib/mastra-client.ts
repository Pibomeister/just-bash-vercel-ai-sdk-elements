import type { MastraDBMessage } from '@mastra/core/agent'
import type { StorageThreadType } from '@mastra/core/memory'
import { memory } from './mastra'

// ---------------------------------------------------------------------------
// Working memory
// ---------------------------------------------------------------------------

export async function getWorkingMemory({
	threadId,
	resourceId,
}: {
	threadId: string
	resourceId?: string
}): Promise<string | null> {
	return memory.getWorkingMemory({ threadId, resourceId })
}

// ---------------------------------------------------------------------------
// Message recall
// ---------------------------------------------------------------------------

export async function getMessages({
	threadId,
	limit,
}: {
	threadId: string
	limit?: number
}): Promise<MastraDBMessage[]> {
	const result = await memory.recall({
		threadId,
		perPage: limit ?? 50,
		page: 0,
	})
	return result.messages
}

// ---------------------------------------------------------------------------
// Message persistence
// ---------------------------------------------------------------------------

export async function saveMessages({
	messages,
}: {
	messages: MastraDBMessage[]
}): Promise<void> {
	await memory.saveMessages({ messages })
}

// ---------------------------------------------------------------------------
// Thread management
// ---------------------------------------------------------------------------

export async function createThread({
	resourceId,
	title,
}: {
	resourceId: string
	title?: string
}): Promise<StorageThreadType> {
	return memory.createThread({ resourceId, title })
}

export async function getThreads({
	resourceId,
}: {
	resourceId: string
}): Promise<StorageThreadType[]> {
	const result = await memory.listThreads({
		filter: { resourceId },
		perPage: 100,
		page: 0,
	})
	return result.threads
}

export async function getThreadById({
	threadId,
}: {
	threadId: string
}): Promise<StorageThreadType | null> {
	return memory.getThreadById({ threadId })
}

export async function deleteThread({
	threadId,
}: {
	threadId: string
}): Promise<void> {
	return memory.deleteThread(threadId)
}
