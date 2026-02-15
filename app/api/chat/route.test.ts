vi.mock('ai')
vi.mock('@ai-sdk/openai')
vi.mock('@/lib/sandbox')

import { openai } from '@ai-sdk/openai'
import { convertToModelMessages, stepCountIs, streamText } from 'ai'
import { getToolkit } from '@/lib/sandbox'
import { createJsonRequest } from '@/test/helpers/mock-request'
import { maxDuration, POST } from './route'

describe('POST /api/chat', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(openai).mockReturnValue('mock-model' as never)
		vi.mocked(getToolkit).mockResolvedValue({
			tools: { bash: {} },
		} as never)
		vi.mocked(convertToModelMessages).mockResolvedValue([])
		vi.mocked(stepCountIs).mockReturnValue('mock-stop-condition' as never)
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

	it('exports maxDuration as 120', () => {
		expect(maxDuration).toBe(120)
	})
})
