vi.mock('ai')
vi.mock('@ai-sdk/openai')
vi.mock('@/lib/sandbox')
vi.mock('bash-tool', () => ({
	createToolPrompt: vi.fn(async () => 'mocked-tool-prompt'),
}))
vi.mock('@/lib/indexing/pipeline-manager', () => ({
	ensurePipeline: vi.fn(async () => ({
		id: 'pipe-1',
		name: 'test',
		status: 'ready',
	})),
}))
vi.mock('@/lib/indexing/semantic-retriever', () => ({
	search: vi.fn(async () => []),
}))
// Mock next/server so `after()` executes its callback immediately in tests
vi.mock('next/server', () => ({
	after: vi.fn((cb: () => Promise<void>) => {
		void cb()
	}),
}))
// Mock resource-id so cookie access doesn't throw outside a request scope
vi.mock('@/lib/resource-id', () => ({
	requireResourceId: vi.fn(async () => ({
		resourceId: 'rid-001',
		isNew: false,
	})),
	getServerResourceId: vi.fn(async () => 'rid-001'),
}))
vi.mock('@/lib/mastra-client', () => ({
	getWorkingMemory: vi.fn(async () => null),
	getMessages: vi.fn(async () => []),
	saveMessages: vi.fn(async () => undefined),
	createThread: vi.fn(async () => ({
		id: 'thread-abc',
		resourceId: 'user-xyz',
		createdAt: new Date(),
		updatedAt: new Date(),
	})),
	getThreads: vi.fn(async () => []),
	getThreadById: vi.fn(async () => null),
	deleteThread: vi.fn(async () => undefined),
}))

import { openai } from '@ai-sdk/openai'
import { convertToModelMessages, stepCountIs, streamText, tool } from 'ai'
import * as mastraClient from '@/lib/mastra-client'
import { getToolkit } from '@/lib/sandbox'
import { createJsonRequest } from '@/test/helpers/mock-request'
import { GET, POST } from './route'

// ---------------------------------------------------------------------------
// POST — memory-enabled path
// ---------------------------------------------------------------------------

describe('POST /api/chat — memory-enabled path', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(openai).mockReturnValue('mock-model' as never)
		vi.mocked(getToolkit).mockResolvedValue({
			tools: { bash: {} },
			sandbox: {},
		} as never)
		vi.mocked(convertToModelMessages).mockResolvedValue([])
		vi.mocked(stepCountIs).mockReturnValue('mock-stop-condition' as never)
		vi.mocked(tool).mockImplementation(
			(config) => ({ __toolConfig: config }) as never,
		)
		vi.mocked(streamText).mockReturnValue({
			toUIMessageStreamResponse: vi.fn(() => new Response('stream')),
		} as never)
	})

	it('falls back to stateless path when no threadId is provided', async () => {
		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({ messages })

		const res = await POST(req)

		expect(res.status).toBe(200)
		expect(mastraClient.getWorkingMemory).not.toHaveBeenCalled()
		expect(mastraClient.getMessages).not.toHaveBeenCalled()
		expect(mastraClient.saveMessages).not.toHaveBeenCalled()
	})

	it('uses server-derived resourceId when client omits it (cookie present)', async () => {
		// The route derives resourceId from a signed cookie via requireResourceId()
		// even when the client does not supply one. Memory path should be taken.
		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({ messages, threadId: 'tid-001' })

		const res = await POST(req)

		expect(res.status).toBe(200)
		// requireResourceId mock returns 'rid-001', so memory path is triggered
		expect(mastraClient.getWorkingMemory).toHaveBeenCalled()
	})

	it('calls getWorkingMemory and getMessages when threadId and resourceId are provided', async () => {
		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hello' }] },
		]
		const req = createJsonRequest({
			messages,
			threadId: 'tid-001',
			resourceId: 'rid-001',
		})

		await POST(req)

		expect(mastraClient.getWorkingMemory).toHaveBeenCalledWith({
			threadId: 'tid-001',
			resourceId: 'rid-001',
		})
		expect(mastraClient.getMessages).toHaveBeenCalledWith({
			threadId: 'tid-001',
			limit: 50,
		})
	})

	it('injects working memory into system prompt when present', async () => {
		vi.mocked(mastraClient.getWorkingMemory).mockResolvedValue(
			'User prefers dark mode.',
		)
		vi.mocked(mastraClient.getMessages).mockResolvedValue([])

		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({
			messages,
			threadId: 'tid-001',
			resourceId: 'rid-001',
		})

		await POST(req)

		const callArgs = vi.mocked(streamText).mock.calls[0][0]
		expect(callArgs.system).toContain('<working_memory>')
		expect(callArgs.system).toContain('User prefers dark mode.')
	})

	it('injects recent messages into system prompt when present', async () => {
		vi.mocked(mastraClient.getWorkingMemory).mockResolvedValue(null)
		vi.mocked(mastraClient.getMessages).mockResolvedValue([
			{
				id: 'msg-1',
				role: 'user',
				createdAt: new Date(),
				threadId: 'tid-001',
				content: {
					format: 2,
					parts: [{ type: 'text', text: 'Previous question' }],
				},
			},
		] as never)

		const messages = [
			{ id: '2', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({
			messages,
			threadId: 'tid-001',
			resourceId: 'rid-001',
		})

		await POST(req)

		const callArgs = vi.mocked(streamText).mock.calls[0][0]
		expect(callArgs.system).toContain('<recent_conversation>')
		expect(callArgs.system).toContain('Previous question')
	})

	it('does not inject memory context section when memory is empty', async () => {
		vi.mocked(mastraClient.getWorkingMemory).mockResolvedValue(null)
		vi.mocked(mastraClient.getMessages).mockResolvedValue([])

		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({
			messages,
			threadId: 'tid-001',
			resourceId: 'rid-001',
		})

		await POST(req)

		const callArgs = vi.mocked(streamText).mock.calls[0][0]
		expect(callArgs.system).not.toContain('<memory_context>')
		expect(callArgs.system).not.toContain('<working_memory>')
		expect(callArgs.system).not.toContain('<recent_conversation>')
	})

	it('calls saveMessages in onFinish with format: 2', async () => {
		let capturedOnFinish:
			| ((args: { text: string }) => Promise<void>)
			| undefined

		vi.mocked(streamText).mockImplementation((opts) => {
			capturedOnFinish = opts.onFinish as never
			return {
				toUIMessageStreamResponse: vi.fn(() => new Response('stream')),
			} as never
		})

		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hello there' }] },
		]
		const req = createJsonRequest({
			messages,
			threadId: 'tid-001',
			resourceId: 'rid-001',
		})

		await POST(req)

		expect(capturedOnFinish).toBeDefined()

		// Trigger the onFinish callback
		await capturedOnFinish!({ text: 'assistant reply' })

		// Give the non-blocking save a chance to resolve
		await new Promise((resolve) => setTimeout(resolve, 0))

		expect(mastraClient.saveMessages).toHaveBeenCalledWith(
			expect.objectContaining({
				messages: expect.arrayContaining([
					expect.objectContaining({
						role: 'user',
						content: expect.objectContaining({ format: 2 }),
					}),
					expect.objectContaining({
						role: 'assistant',
						content: expect.objectContaining({ format: 2 }),
					}),
				]),
			}),
		)
	})

	it('saves messages with threadId and resourceId in each message', async () => {
		let capturedOnFinish:
			| ((args: { text: string }) => Promise<void>)
			| undefined

		vi.mocked(streamText).mockImplementation((opts) => {
			capturedOnFinish = opts.onFinish as never
			return {
				toUIMessageStreamResponse: vi.fn(() => new Response('stream')),
			} as never
		})

		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'test' }] },
		]
		const req = createJsonRequest({
			messages,
			threadId: 'tid-001',
			resourceId: 'rid-001',
		})

		await POST(req)
		await capturedOnFinish!({ text: 'reply' })
		await new Promise((resolve) => setTimeout(resolve, 0))

		const savedMessages = vi.mocked(mastraClient.saveMessages).mock.calls[0][0]
			.messages
		expect(savedMessages).toHaveLength(2)
		expect(savedMessages[0].threadId).toBe('tid-001')
		expect(savedMessages[0].resourceId).toBe('rid-001')
		expect(savedMessages[1].threadId).toBe('tid-001')
		expect(savedMessages[1].resourceId).toBe('rid-001')
	})

	it('each saved message has a unique id', async () => {
		let capturedOnFinish:
			| ((args: { text: string }) => Promise<void>)
			| undefined

		vi.mocked(streamText).mockImplementation((opts) => {
			capturedOnFinish = opts.onFinish as never
			return {
				toUIMessageStreamResponse: vi.fn(() => new Response('stream')),
			} as never
		})

		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({
			messages,
			threadId: 'tid-001',
			resourceId: 'rid-001',
		})

		await POST(req)
		await capturedOnFinish!({ text: 'reply' })
		await new Promise((resolve) => setTimeout(resolve, 0))

		const savedMessages = vi.mocked(mastraClient.saveMessages).mock.calls[0][0]
			.messages
		expect(savedMessages[0].id).not.toBe(savedMessages[1].id)
		expect(typeof savedMessages[0].id).toBe('string')
		expect(savedMessages[0].id.length).toBeGreaterThan(0)
	})

	it('does not block streaming when saveMessages fails', async () => {
		vi.mocked(mastraClient.saveMessages).mockRejectedValue(
			new Error('DB error'),
		)

		let capturedOnFinish:
			| ((args: { text: string }) => Promise<void>)
			| undefined

		vi.mocked(streamText).mockImplementation((opts) => {
			capturedOnFinish = opts.onFinish as never
			return {
				toUIMessageStreamResponse: vi.fn(() => new Response('stream')),
			} as never
		})

		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({
			messages,
			threadId: 'tid-001',
			resourceId: 'rid-001',
		})

		const res = await POST(req)
		expect(res.status).toBe(200)

		// Should not throw even when DB fails
		await expect(capturedOnFinish!({ text: 'reply' })).resolves.toBeUndefined()
	})

	it('memory-enabled path preserves existing tools and provider options', async () => {
		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({
			messages,
			threadId: 'tid-001',
			resourceId: 'rid-001',
		})

		await POST(req)

		const callArgs = vi.mocked(streamText).mock.calls[0][0]
		expect(callArgs.model).toBe('mock-model')
		expect(callArgs.stopWhen).toBe('mock-stop-condition')
		expect(callArgs.providerOptions).toEqual({
			openai: {
				reasoningEffort: 'xhigh',
				reasoningSummary: 'detailed',
			},
		})
	})
})

// ---------------------------------------------------------------------------
// GET /api/chat — history hydration
// ---------------------------------------------------------------------------

describe('GET /api/chat', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns empty array when threadId is missing', async () => {
		const req = new Request('http://localhost/api/chat?resourceId=rid-001')

		const res = await GET(req)

		expect(res.status).toBe(200)
		expect(await res.json()).toEqual([])
	})

	it('returns empty array when resourceId is missing', async () => {
		const req = new Request('http://localhost/api/chat?threadId=tid-001')

		const res = await GET(req)

		expect(res.status).toBe(200)
		expect(await res.json()).toEqual([])
	})

	it('returns empty array when both params are missing', async () => {
		const req = new Request('http://localhost/api/chat')

		const res = await GET(req)

		expect(res.status).toBe(200)
		expect(await res.json()).toEqual([])
	})

	it('returns messages from mastraClient when threadId and resourceId are provided', async () => {
		const mockMessages = [
			{
				id: 'msg-1',
				role: 'user',
				createdAt: new Date().toISOString(),
				content: { format: 2, parts: [{ type: 'text', text: 'hello' }] },
			},
		]
		vi.mocked(mastraClient.getMessages).mockResolvedValue(mockMessages as never)

		const req = new Request(
			'http://localhost/api/chat?threadId=tid-001&resourceId=rid-001',
		)

		const res = await GET(req)

		expect(res.status).toBe(200)
		expect(await res.json()).toEqual(mockMessages)
		expect(mastraClient.getMessages).toHaveBeenCalledWith({
			threadId: 'tid-001',
			limit: 50,
		})
	})

	it('returns empty array when getMessages throws', async () => {
		vi.mocked(mastraClient.getMessages).mockRejectedValue(new Error('DB error'))

		const req = new Request(
			'http://localhost/api/chat?threadId=tid-001&resourceId=rid-001',
		)

		const res = await GET(req)

		expect(res.status).toBe(200)
		expect(await res.json()).toEqual([])
	})
})
