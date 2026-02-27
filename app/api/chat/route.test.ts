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
				tools: expect.objectContaining({
					bash: expect.objectContaining({ execute: expect.any(Function) }),
				}),
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

	it('configures step limit to 30', async () => {
		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({ messages })

		await POST(req)

		expect(stepCountIs).toHaveBeenCalledWith(30)
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

	it('returns stable bash citations payload on wrapped bash execute', async () => {
		const bashExecute = vi.fn(async () => ({
			stdout:
				'1:/documents/123e4567-e89b-12d3-a456-426614174000/content.md:hello world',
			stderr: '',
			exitCode: 0,
		}))
		vi.mocked(getToolkit).mockResolvedValue({
			tools: {
				bash: {
					description: 'bash',
					inputSchema: {},
					execute: bashExecute,
				},
			},
			sandbox: {},
		} as never)

		const messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
		]
		const req = createJsonRequest({ messages })

		await POST(req)

		const callArgs = vi.mocked(streamText).mock.calls[0][0]
		const wrappedBash = (callArgs.tools as Record<string, unknown>).bash as {
			execute: (args: { command?: string }) => Promise<{
				citations?: Array<{ index: number; documentId: string; text: string }>
				__bashCitations?: Array<{
					index: number
					documentId: string
					text: string
				}>
			}>
		}

		const wrappedResult = await wrappedBash.execute({
			command:
				'grep -n "hello" /documents/123e4567-e89b-12d3-a456-426614174000/content.md',
		})

		expect(wrappedResult.citations).toBeDefined()
		expect(wrappedResult.__bashCitations).toBeDefined()
		expect(wrappedResult.citations?.[0]).toMatchObject({
			index: 1,
			documentId: '123e4567-e89b-12d3-a456-426614174000',
		})
	})

	it('extracts citation doc ID from relative document path in command', async () => {
		const bashExecute = vi.fn(async () => ({
			stdout: 'relevant legal excerpt',
			stderr: '',
			exitCode: 0,
		}))
		vi.mocked(getToolkit).mockResolvedValue({
			tools: {
				bash: {
					description: 'bash',
					inputSchema: {},
					execute: bashExecute,
				},
			},
			sandbox: {},
		} as never)

		const req = createJsonRequest({
			messages: [
				{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
			],
		})

		await POST(req)

		const callArgs = vi.mocked(streamText).mock.calls[0][0]
		const wrappedBash = (callArgs.tools as Record<string, unknown>).bash as {
			execute: (args: { command?: string }) => Promise<{
				citations?: Array<{ index: number; documentId: string; text: string }>
			}>
		}

		const wrappedResult = await wrappedBash.execute({
			command:
				'grep -n "obligación" 123e4567-e89b-12d3-a456-426614174001/content.md',
		})

		expect(wrappedResult.citations?.[0]).toMatchObject({
			index: 1,
			documentId: '123e4567-e89b-12d3-a456-426614174001',
		})
		expect(wrappedResult.citations?.[0]?.text).toContain(
			'relevant legal excerpt',
		)
	})

	it('extracts citation doc ID when UUID appears only in stderr', async () => {
		const bashExecute = vi.fn(async () => ({
			stdout: '',
			stderr:
				'grep: /documents/123e4567-e89b-12d3-a456-426614174002/content.md: No such file or directory',
			exitCode: 2,
		}))
		vi.mocked(getToolkit).mockResolvedValue({
			tools: {
				bash: {
					description: 'bash',
					inputSchema: {},
					execute: bashExecute,
				},
			},
			sandbox: {},
		} as never)

		const req = createJsonRequest({
			messages: [
				{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
			],
		})

		await POST(req)

		const callArgs = vi.mocked(streamText).mock.calls[0][0]
		const wrappedBash = (callArgs.tools as Record<string, unknown>).bash as {
			execute: (args: { command?: string }) => Promise<{
				citations?: Array<{ index: number; documentId: string; text: string }>
			}>
		}

		const wrappedResult = await wrappedBash.execute({
			command: 'grep -n "foo" content.md',
		})

		expect(wrappedResult.citations?.[0]).toMatchObject({
			index: 1,
			documentId: '123e4567-e89b-12d3-a456-426614174002',
		})
		expect(wrappedResult.citations?.[0]?.text).toContain(
			'No such file or directory',
		)
	})

	it('uses fallback excerpt when command references doc but output has no path echoes', async () => {
		const bashExecute = vi.fn(async () => ({
			stdout:
				'This clause describes obligations and payment timelines without echoing paths.',
			stderr: '',
			exitCode: 0,
		}))
		vi.mocked(getToolkit).mockResolvedValue({
			tools: {
				bash: {
					description: 'bash',
					inputSchema: {},
					execute: bashExecute,
				},
			},
			sandbox: {},
		} as never)

		const req = createJsonRequest({
			messages: [
				{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
			],
		})

		await POST(req)

		const callArgs = vi.mocked(streamText).mock.calls[0][0]
		const wrappedBash = (callArgs.tools as Record<string, unknown>).bash as {
			execute: (args: { command?: string }) => Promise<{
				citations?: Array<{ index: number; documentId: string; text: string }>
				__bashCitations?: Array<{
					index: number
					documentId: string
					text: string
				}>
			}>
		}

		const wrappedResult = await wrappedBash.execute({
			command:
				'awk "NR>=10&&NR<=40" ./123e4567-e89b-12d3-a456-426614174003/content.md',
		})

		expect(wrappedResult.citations?.[0]).toMatchObject({
			index: 1,
			documentId: '123e4567-e89b-12d3-a456-426614174003',
		})
		expect(wrappedResult.citations?.[0]?.text).toContain(
			'without echoing paths',
		)
		expect(wrappedResult.__bashCitations?.[0]?.documentId).toBe(
			'123e4567-e89b-12d3-a456-426614174003',
		)
	})
})
