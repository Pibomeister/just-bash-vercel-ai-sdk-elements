vi.mock('ai')
vi.mock('@ai-sdk/openai')

import { openai } from '@ai-sdk/openai'
import { experimental_transcribe as transcribe } from 'ai'
import { createFormDataRequest } from '@/test/helpers/mock-request'
import { POST } from './route'

describe('POST /api/transcribe', () => {
	it('returns 400 when the audio field is missing', async () => {
		const formData = new FormData()
		const req = createFormDataRequest(formData)

		const res = await POST(req)
		const data = await res.json()

		expect(res.status).toBe(400)
		expect(data).toEqual({
			error: "Missing audio payload. Expected multipart field 'audio'.",
		})
	})

	it('returns transcribed text on success', async () => {
		vi.mocked(openai.transcription).mockReturnValue('mock-model' as never)
		vi.mocked(transcribe).mockResolvedValue({
			text: 'Hello world',
		} as never)

		const formData = new FormData()
		formData.append(
			'audio',
			new Blob([new ArrayBuffer(16)], { type: 'audio/wav' }),
		)
		const req = createFormDataRequest(formData)

		const res = await POST(req)
		const data = await res.json()

		expect(res.status).toBe(200)
		expect(data).toEqual({ text: 'Hello world' })
	})

	it('returns empty text when provider response has null text', async () => {
		vi.mocked(openai.transcription).mockReturnValue('mock-model' as never)
		vi.mocked(transcribe).mockResolvedValue({
			text: null,
		} as never)

		const formData = new FormData()
		formData.append(
			'audio',
			new Blob([new ArrayBuffer(16)], { type: 'audio/wav' }),
		)
		const req = createFormDataRequest(formData)

		const res = await POST(req)
		const data = await res.json()

		expect(res.status).toBe(200)
		expect(data).toEqual({ text: '' })
	})

	it('returns error message from Error instances', async () => {
		vi.mocked(openai.transcription).mockReturnValue('mock-model' as never)
		vi.mocked(transcribe).mockRejectedValue(
			new Error('API rate limit exceeded'),
		)

		const formData = new FormData()
		formData.append(
			'audio',
			new Blob([new ArrayBuffer(8)], { type: 'audio/wav' }),
		)
		const req = createFormDataRequest(formData)

		const res = await POST(req)
		const data = await res.json()

		expect(res.status).toBe(500)
		expect(data).toEqual({ error: 'API rate limit exceeded' })
	})

	it('returns generic message for non-Error exceptions', async () => {
		vi.mocked(openai.transcription).mockReturnValue('mock-model' as never)
		vi.mocked(transcribe).mockRejectedValue('something went wrong')

		const formData = new FormData()
		formData.append(
			'audio',
			new Blob([new ArrayBuffer(8)], { type: 'audio/wav' }),
		)
		const req = createFormDataRequest(formData)

		const res = await POST(req)
		const data = await res.json()

		expect(res.status).toBe(500)
		expect(data).toEqual({
			error: 'An unexpected transcription error occurred.',
		})
	})
})
