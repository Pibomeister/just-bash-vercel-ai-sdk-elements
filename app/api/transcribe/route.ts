import { openai } from '@ai-sdk/openai'
import { experimental_transcribe as transcribe } from 'ai'

export async function POST(request: Request) {
	try {
		const formData = await request.formData()
		const audio = formData.get('audio')

		if (!(audio instanceof Blob)) {
			return Response.json(
				{ error: "Missing audio payload. Expected multipart field 'audio'." },
				{ status: 400 },
			)
		}

		const result = await transcribe({
			model: openai.transcription('whisper-1'),
			audio: await audio.arrayBuffer(),
		})

		return Response.json({ text: result.text ?? '' })
	} catch (error) {
		return Response.json(
			{
				error:
					error instanceof Error
						? error.message
						: 'An unexpected transcription error occurred.',
			},
			{ status: 500 },
		)
	}
}
