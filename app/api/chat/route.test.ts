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

import { openai } from '@ai-sdk/openai'
import { convertToModelMessages, stepCountIs, streamText, tool } from 'ai'
import { getToolkit } from '@/lib/sandbox'
import { createJsonRequest } from '@/test/helpers/mock-request'
import { maxDuration, POST } from './route'

describe('POST /api/chat', () => {
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
		expect(await res.text()).toBe('Missing or invalid messages array')
	})

	it('returns streamed response on success', async () => {
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
				tools: { bash: {} },
			}),
		)
	})

	it('includes toolPrompt in system prompt even without instructions', async () => {
		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({ messages })

		await POST(req)

		const callArgs = vi.mocked(streamText).mock.calls[0][0]
		const systemPrompt = callArgs.system as string

		expect(systemPrompt).toContain('mocked-tool-prompt')
	})

	it('appends and truncates instructions to 2000 characters', async () => {
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

		// Verify the instructions section is appended
		expect(systemPrompt).toContain('Active User Instructions')
		// Verify the instructions are truncated to 2000 chars (not 3000)
		expect(systemPrompt).not.toContain('x'.repeat(2001))
		expect(systemPrompt).toContain('x'.repeat(2000))
	})

	it('system prompt contains sidecar navigation instructions', async () => {
		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({ messages })

		await POST(req)

		const callArgs = vi.mocked(streamText).mock.calls[0][0]
		const systemPrompt = callArgs.system as string

		expect(systemPrompt).toContain('ALWAYS read the sidecar.json sidecar FIRST')
		expect(systemPrompt).toContain('navigation.warnings')
		expect(systemPrompt).toContain('quickCommands')
		expect(systemPrompt).toContain('sidecar.json')
		expect(systemPrompt).toContain('tableOfContents')
	})

	it('system prompt handles legacy documents without sidecar', async () => {
		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({ messages })

		await POST(req)

		const callArgs = vi.mocked(streamText).mock.calls[0][0]
		const systemPrompt = callArgs.system as string

		expect(systemPrompt).toContain('Not all documents have sidecars')
		expect(systemPrompt).toContain('fall back to searching content.md')
	})

	it('exports maxDuration as 120', () => {
		expect(maxDuration).toBe(120)
	})

	it('does not include searchDocuments tool when LLAMA_CLOUD_PROJECT_ID is not set', async () => {
		delete process.env.LLAMA_CLOUD_PROJECT_ID
		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({ messages })

		await POST(req)

		const callArgs = vi.mocked(streamText).mock.calls[0][0]
		const passedTools = callArgs.tools as Record<string, unknown>

		expect(passedTools).not.toHaveProperty('searchDocuments')
	})

	it('includes searchDocuments tool when LLAMA_CLOUD_PROJECT_ID is set', async () => {
		vi.stubEnv('LLAMA_CLOUD_PROJECT_ID', 'test-project')
		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({ messages })

		await POST(req)

		const callArgs = vi.mocked(streamText).mock.calls[0][0]
		const passedTools = callArgs.tools as Record<string, unknown>

		expect(passedTools).toHaveProperty('searchDocuments')
		expect(passedTools.bash).toBeDefined()
		vi.unstubAllEnvs()
	})

	it('system prompt includes semantic search guidance', async () => {
		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({ messages })

		await POST(req)

		const callArgs = vi.mocked(streamText).mock.calls[0][0]
		const systemPrompt = callArgs.system as string

		expect(systemPrompt).toContain('searchDocuments')
		expect(systemPrompt).toContain('Semantic Search')
		expect(systemPrompt).toContain('higher scores mean better relevance')
	})
})
