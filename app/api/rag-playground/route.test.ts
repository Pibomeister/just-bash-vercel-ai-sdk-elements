vi.mock('ai')
vi.mock('@ai-sdk/openai')
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

import { openai } from '@ai-sdk/openai'
import { convertToModelMessages, stepCountIs, streamText, tool } from 'ai'
import { z } from 'zod'
import { search } from '@/lib/indexing/semantic-retriever'
import { createJsonRequest } from '@/test/helpers/mock-request'
import {
	buildSearchTool,
	executeSearch,
	formatSearchResult,
	maxDuration,
	POST,
} from './route'

type MockSearchTool = {
	__toolConfig: {
		description?: string
		execute: (input: {
			query: string
			documentType?: string
		}) => Promise<unknown>
		inputSchema: unknown
	}
}

type MockToolSet = Record<string, MockSearchTool>

describe('POST /api/rag-playground', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(openai).mockReturnValue('mock-model' as never)
		vi.mocked(convertToModelMessages).mockResolvedValue([])
		vi.mocked(stepCountIs).mockReturnValue('mock-stop-condition' as never)
		vi.mocked(tool).mockImplementation(
			(config) => ({ __toolConfig: config }) as never,
		)
		vi.mocked(streamText).mockReturnValue({
			toUIMessageStreamResponse: vi.fn(() => new Response('stream')),
		} as never)
	})

	it('returns 400 on invalid JSON', async () => {
		const req = new Request('http://localhost:3000', {
			method: 'POST',
			body: '{{bad json',
			headers: { 'Content-Type': 'application/json' },
		})

		const res = await POST(req)

		expect(res.status).toBe(400)
		expect(await res.text()).toBe('Invalid JSON')
	})

	it('returns 400 when messages is not an array', async () => {
		const req = createJsonRequest({ messages: 'not an array' })

		const res = await POST(req)

		expect(res.status).toBe(400)
	})

	it('returns 400 for unknown model ID', async () => {
		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({ messages, model: 'unknown-model' })

		const res = await POST(req)

		expect(res.status).toBe(400)
		expect(await res.text()).toBe('Unknown model: unknown-model')
	})

	it('returns 400 for out-of-range alpha (< 0)', async () => {
		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({ messages, alpha: -0.1 })

		const res = await POST(req)

		expect(res.status).toBe(400)
	})

	it('returns 400 for out-of-range alpha (> 1)', async () => {
		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({ messages, alpha: 1.5 })

		const res = await POST(req)

		expect(res.status).toBe(400)
	})

	it('returns 400 for out-of-range topK (< 1)', async () => {
		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({ messages, topK: 0 })

		const res = await POST(req)

		expect(res.status).toBe(400)
	})

	it('returns 400 for out-of-range topK (> 100)', async () => {
		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({ messages, topK: 101 })

		const res = await POST(req)

		expect(res.status).toBe(400)
	})

	it('returns 400 for out-of-range rerankTopN (< 1)', async () => {
		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({ messages, rerankTopN: 0 })

		const res = await POST(req)

		expect(res.status).toBe(400)
	})

	it('returns 400 for out-of-range rerankTopN (> 50)', async () => {
		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({ messages, rerankTopN: 51 })

		const res = await POST(req)

		expect(res.status).toBe(400)
	})

	it('returns streamed response with default params', async () => {
		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({ messages })

		const res = await POST(req)

		expect(res.status).toBe(200)
		expect(await res.text()).toBe('stream')
		expect(streamText).toHaveBeenCalledWith(
			expect.objectContaining({
				model: 'mock-model',
			}),
		)
	})

	it('passes custom alpha/topK/rerankTopN to search() via tool execute', async () => {
		vi.mocked(search).mockResolvedValue([
			{
				text: 'result text',
				score: 0.95,
				documentId: 'doc-1',
				metadata: {},
			},
		])
		let executePromise: Promise<unknown> | undefined
		vi.mocked(streamText).mockImplementation((opts) => {
			const searchTool = (opts.tools as unknown as MockToolSet).searchDocuments
			executePromise = searchTool.__toolConfig.execute({
				query: 'test query',
			})
			return {
				toUIMessageStreamResponse: vi.fn(() => new Response('stream')),
			} as never
		})

		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({
			messages,
			alpha: 0.8,
			topK: 50,
			rerankTopN: 10,
		})

		await POST(req)
		const result = await executePromise

		expect(result).toEqual([
			{ index: 1, text: 'result text', score: 0.95, documentId: 'doc-1' },
		])
		expect(search).toHaveBeenCalledWith(
			'pipe-1',
			expect.objectContaining({
				query: 'test query',
				alpha: 0.8,
				topK: 50,
				rerankTopN: 10,
			}),
		)
	})

	it('uses correct model when model param is provided', async () => {
		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({ messages, model: 'gpt-4o-mini' })

		await POST(req)

		expect(openai).toHaveBeenCalledWith('gpt-4o-mini')
	})

	it('includes providerOptions.openai.reasoningEffort for reasoning models', async () => {
		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({ messages, model: 'gpt-5.2' })

		await POST(req)

		const callArgs = vi.mocked(streamText).mock.calls[0][0]
		expect(callArgs.providerOptions).toEqual({
			openai: expect.objectContaining({
				reasoningEffort: 'high',
				reasoningSummary: 'detailed',
			}),
		})
	})

	it('does NOT include providerOptions for non-reasoning models', async () => {
		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({ messages, model: 'gpt-4o' })

		await POST(req)

		const callArgs = vi.mocked(streamText).mock.calls[0][0]
		expect(callArgs.providerOptions).toBeUndefined()
	})

	it('sends sendReasoning: true only for reasoning models', async () => {
		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({ messages, model: 'gpt-5.2' })

		await POST(req)

		const result = vi.mocked(streamText).mock.results[0].value as {
			toUIMessageStreamResponse: ReturnType<typeof vi.fn>
		}
		expect(result.toUIMessageStreamResponse).toHaveBeenCalledWith({
			sendReasoning: true,
		})
	})

	it('sends sendReasoning: false for non-reasoning models', async () => {
		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({ messages, model: 'gpt-4o' })

		await POST(req)

		const result = vi.mocked(streamText).mock.results[0].value as {
			toUIMessageStreamResponse: ReturnType<typeof vi.fn>
		}
		expect(result.toUIMessageStreamResponse).toHaveBeenCalledWith({
			sendReasoning: false,
		})
	})

	it('system prompt does NOT contain bash/readFile/writeFile references', async () => {
		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({ messages })

		await POST(req)

		const callArgs = vi.mocked(streamText).mock.calls[0][0]
		const systemPrompt = callArgs.system as string

		expect(systemPrompt).not.toContain('bash')
		expect(systemPrompt).not.toContain('readFile')
		expect(systemPrompt).not.toContain('writeFile')
	})

	it('system prompt contains searchDocuments guidance', async () => {
		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({ messages })

		await POST(req)

		const callArgs = vi.mocked(streamText).mock.calls[0][0]
		const systemPrompt = callArgs.system as string

		expect(systemPrompt).toContain('searchDocuments')
		expect(systemPrompt).toContain('semantic search')
	})

	it('system prompt instructs model to use numbered [N] citation format', async () => {
		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({ messages })

		await POST(req)

		const callArgs = vi.mocked(streamText).mock.calls[0][0]
		const systemPrompt = callArgs.system as string

		expect(systemPrompt).toContain('[1], [2]')
		expect(systemPrompt).toContain('numbered citations')
		expect(systemPrompt).toContain('result index')
	})

	it('appends and truncates instructions to 2000 chars when provided', async () => {
		const longInstructions = 'x'.repeat(3000)
		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({
			messages,
			instructions: longInstructions,
		})

		await POST(req)

		const callArgs = vi.mocked(streamText).mock.calls[0][0]
		const systemPrompt = callArgs.system as string

		expect(systemPrompt).toContain('Active User Instructions')
		expect(systemPrompt).not.toContain('x'.repeat(2001))
		expect(systemPrompt).toContain('x'.repeat(2000))
	})

	it('searchDocuments tool description mentions citation indexing', async () => {
		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({ messages })

		await POST(req)

		const callArgs = vi.mocked(streamText).mock.calls[0][0]
		const searchTool = (callArgs.tools as unknown as MockToolSet)
			.searchDocuments
		const description = searchTool.__toolConfig.description

		expect(description).toContain('index')
		expect(description).toContain('citation')
	})

	it('exports maxDuration as 120', () => {
		expect(maxDuration).toBe(120)
	})

	it('tool inputSchema includes query (required) and documentType (optional enum)', async () => {
		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({ messages })

		await POST(req)

		const callArgs = vi.mocked(streamText).mock.calls[0][0]
		const searchTool = (callArgs.tools as unknown as MockToolSet)
			.searchDocuments
		const schema = searchTool.__toolConfig.inputSchema as z.ZodObject<{
			query: z.ZodString
			documentType: z.ZodOptional<z.ZodString>
		}>

		const validResult = schema.safeParse({ query: 'test' })
		expect(validResult.success).toBe(true)

		const withType = schema.safeParse({
			query: 'test',
			documentType: 'contrato',
		})
		expect(withType.success).toBe(true)

		const invalidType = schema.safeParse({
			query: 'test',
			documentType: 'invalid',
		})
		expect(invalidType.success).toBe(false)

		const missingQuery = schema.safeParse({})
		expect(missingQuery.success).toBe(false)
	})

	it('returns 400 when convertToModelMessages throws', async () => {
		vi.mocked(convertToModelMessages).mockRejectedValue(
			new Error('Invalid message shape'),
		)
		const messages = [{ bad: 'shape' }]
		const req = createJsonRequest({ messages })

		const res = await POST(req)

		expect(res.status).toBe(400)
		expect(await res.text()).toBe('Invalid message format')
	})

	it('uses stopWhen: stepCountIs(10)', async () => {
		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({ messages })

		await POST(req)

		expect(stepCountIs).toHaveBeenCalledWith(10)
		const callArgs = vi.mocked(streamText).mock.calls[0][0]
		expect(callArgs.stopWhen).toBe('mock-stop-condition')
	})
})

describe('formatSearchResult', () => {
	it('extracts text, score, and documentId from a result with given index', () => {
		const result = formatSearchResult(
			{
				text: 'passage text',
				score: 0.92,
				documentId: 'doc-1',
			},
			3,
		)
		expect(result).toEqual({
			index: 3,
			text: 'passage text',
			score: 0.92,
			documentId: 'doc-1',
		})
	})

	it('preserves null score and documentId', () => {
		const result = formatSearchResult(
			{
				text: 'no score',
				score: null,
				documentId: null,
			},
			0,
		)
		expect(result).toEqual({
			index: 0,
			text: 'no score',
			score: null,
			documentId: null,
		})
	})
})

describe('executeSearch', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('throws when ensurePipeline rejects', async () => {
		const { ensurePipeline } = await import('@/lib/indexing/pipeline-manager')
		vi.mocked(ensurePipeline).mockRejectedValueOnce(
			new Error('LLAMA_CLOUD_PROJECT_ID is required'),
		)

		await expect(
			executeSearch({ query: 'test' }, { alpha: 0.5, topK: 20, rerankTopN: 5 }),
		).rejects.toThrow('LLAMA_CLOUD_PROJECT_ID is required')
	})

	it('calls search with merged params and maps results', async () => {
		vi.mocked(search).mockResolvedValue([
			{
				text: 'found text',
				score: 0.85,
				documentId: 'doc-42',
				metadata: { extra: 'ignored' },
			},
			{
				text: 'second result',
				score: 0.6,
				documentId: 'doc-7',
				metadata: {},
			},
		])

		const result = await executeSearch(
			{ query: 'test', documentType: 'ley' },
			{ alpha: 0.3, topK: 10, rerankTopN: 3 },
		)

		expect(result).toEqual([
			{ index: 0, text: 'found text', score: 0.85, documentId: 'doc-42' },
			{ index: 0, text: 'second result', score: 0.6, documentId: 'doc-7' },
		])
		expect(search).toHaveBeenCalledWith('pipe-1', {
			query: 'test',
			documentType: 'ley',
			alpha: 0.3,
			topK: 10,
			rerankTopN: 3,
		})
	})

	it('increments counter sequentially across multiple calls', async () => {
		vi.mocked(search).mockResolvedValue([
			{ text: 'a', score: 0.9, documentId: 'doc-1', metadata: {} },
			{ text: 'b', score: 0.8, documentId: 'doc-2', metadata: {} },
		])

		const counter = { value: 0 }
		const first = await executeSearch(
			{ query: 'first' },
			{ alpha: 0.5, topK: 20, rerankTopN: 5 },
			counter,
		)
		const second = await executeSearch(
			{ query: 'second' },
			{ alpha: 0.5, topK: 20, rerankTopN: 5 },
			counter,
		)

		expect(first.map((r) => r.index)).toEqual([1, 2])
		expect(second.map((r) => r.index)).toEqual([3, 4])
		expect(counter.value).toBe(4)
	})
})

describe('buildSearchTool', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(tool).mockImplementation(
			(config) => ({ __toolConfig: config }) as never,
		)
	})

	it('returns an object with searchDocuments tool', () => {
		const result = buildSearchTool({ alpha: 0.5, topK: 20, rerankTopN: 5 })
		expect(result).toHaveProperty('searchDocuments')
	})

	it('execute arrow delegates to executeSearch with bound params', async () => {
		vi.mocked(search).mockResolvedValue([
			{ text: 'hit', score: 0.9, documentId: 'doc-1', metadata: {} },
		])

		const { searchDocuments } = buildSearchTool({
			alpha: 0.7,
			topK: 30,
			rerankTopN: 8,
		})
		const config = (
			searchDocuments as unknown as {
				__toolConfig: {
					execute: (input: {
						query: string
						documentType?: string
					}) => Promise<unknown>
				}
			}
		).__toolConfig
		const result = await config.execute({ query: 'q', documentType: 'nom' })

		expect(result).toEqual([
			{ index: 0, text: 'hit', score: 0.9, documentId: 'doc-1' },
		])
		expect(search).toHaveBeenCalledWith(
			'pipe-1',
			expect.objectContaining({ alpha: 0.7, topK: 30, rerankTopN: 8 }),
		)
	})
})
