'use client'

import { forwardRef, type Ref, useCallback } from 'react'

import { usePromptInputController } from '@/components/ai-elements/prompt-input'
import type {
	SpeechInputHandle,
	SpeechInputProps,
} from '@/components/ai-elements/speech-input'
import { SpeechInput } from '@/components/ai-elements/speech-input'

export type PromptInputDictationProps = Omit<
	SpeechInputProps,
	'onTranscriptionChange' | 'onAudioRecorded'
> & {
	onRecordingStateChange?: (isRecording: boolean) => void
	endpoint?: string
}

const DEFAULT_TRANSCRIBE_ENDPOINT = '/api/transcribe'

const normalizeTranscription = (text: string): string =>
	text.trim().replace(/\s+/g, ' ')

export const PromptInputDictation = forwardRef<
	SpeechInputHandle,
	PromptInputDictationProps
>(
	(
		{
			endpoint = DEFAULT_TRANSCRIBE_ENDPOINT,
			className,
			variant = 'ghost',
			size = 'icon-sm',
			onRecordingStateChange,
			...props
		},
		ref: Ref<SpeechInputHandle>,
	) => {
		const controller = usePromptInputController()

		const appendTranscription = useCallback(
			(rawTranscript: string) => {
				const transcript = normalizeTranscription(rawTranscript)
				if (!transcript) {
					return
				}

				const current = controller.textInput.value
				const needsSpace = current.length > 0 && !/[\s\n]$/.test(current)
				const nextText = `${current}${needsSpace ? ' ' : ''}${transcript}`

				controller.textInput.setInput(nextText)
			},
			[controller],
		)

		const transcribeAudioBlob = useCallback(
			async (audioBlob: Blob): Promise<string> => {
				try {
					const payload = new FormData()
					payload.set('audio', audioBlob, 'dictation.webm')

					const response = await fetch(endpoint, {
						method: 'POST',
						body: payload,
					})

					if (!response.ok) {
						throw new Error(
							`Transcription request failed (${response.status} ${response.statusText})`,
						)
					}

					const { text } = (await response.json()) as { text?: string }
					return typeof text === 'string' ? text : ''
				} catch (error) {
					console.error('Speech transcription request failed', error)
					return ''
				}
			},
			[endpoint],
		)

		return (
			<SpeechInput
				ref={ref}
				className={className}
				onListeningChange={onRecordingStateChange}
				onAudioRecorded={transcribeAudioBlob}
				onTranscriptionChange={appendTranscription}
				size={size}
				variant={variant}
				{...props}
			/>
		)
	},
)

PromptInputDictation.displayName = 'PromptInputDictation'
