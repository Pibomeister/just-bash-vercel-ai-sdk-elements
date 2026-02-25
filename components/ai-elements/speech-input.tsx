'use client'

import { MicIcon, SquareIcon } from 'lucide-react'
import type { ComponentProps } from 'react'
import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

interface SpeechRecognition extends EventTarget {
	continuous: boolean
	interimResults: boolean
	lang: string
	start(): void
	stop(): void
	onstart: ((this: SpeechRecognition, ev: Event) => void) | null
	onend: ((this: SpeechRecognition, ev: Event) => void) | null
	onresult:
		| ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void)
		| null
	onerror:
		| ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void)
		| null
}

interface SpeechRecognitionEvent extends Event {
	results: SpeechRecognitionResultList
	resultIndex: number
}

interface SpeechRecognitionResultList {
	readonly length: number
	item(index: number): SpeechRecognitionResult
	[index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
	readonly length: number
	item(index: number): SpeechRecognitionAlternative
	[index: number]: SpeechRecognitionAlternative
	isFinal: boolean
}

interface SpeechRecognitionAlternative {
	transcript: string
	confidence: number
}

interface SpeechRecognitionErrorEvent extends Event {
	error: string
}

declare global {
	interface Window {
		SpeechRecognition: new () => SpeechRecognition
		webkitSpeechRecognition: new () => SpeechRecognition
	}
}

type SpeechInputMode = 'speech-recognition' | 'media-recorder' | 'none'

export type SpeechInputProps = ComponentProps<typeof Button> & {
	onTranscriptionChange?: (text: string) => void
	onListeningChange?: (isListening: boolean) => void
	/**
	 * Callback for when audio is recorded using MediaRecorder fallback.
	 * This is called in browsers that don't support the Web Speech API (Firefox, Safari).
	 * The callback receives an audio Blob that should be sent to a transcription service.
	 * Return the transcribed text, which will be passed to onTranscriptionChange.
	 */
	onAudioRecorded?: (audioBlob: Blob) => Promise<string>
	lang?: string
}

export type SpeechInputHandle = {
	start: () => Promise<void>
	stop: () => void
	toggle: () => void
	isListening: boolean
}

const detectSpeechInputMode = (): SpeechInputMode => {
	if (typeof window === 'undefined') {
		return 'none'
	}

	if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
		return 'speech-recognition'
	}

	if ('MediaRecorder' in window && 'mediaDevices' in navigator) {
		return 'media-recorder'
	}

	return 'none'
}

export const SpeechInput = forwardRef<SpeechInputHandle, SpeechInputProps>(
	(
		{
			className,
			onTranscriptionChange,
			onAudioRecorded,
			onListeningChange,
			lang = 'en-US',
			...props
		},
		ref,
	) => {
		const [isListening, setIsListening] = useState(false)
		const [isProcessing, setIsProcessing] = useState(false)
		const [mode] = useState<SpeechInputMode>(detectSpeechInputMode)
		const [isRecognitionReady, setIsRecognitionReady] = useState(false)
		const recognitionRef = useRef<SpeechRecognition | null>(null)
		const mediaRecorderRef = useRef<MediaRecorder | null>(null)
		const streamRef = useRef<MediaStream | null>(null)
		const pendingMicPermissionRef = useRef<boolean>(false)
		const audioChunksRef = useRef<Blob[]>([])
		const onTranscriptionChangeRef = useRef<
			SpeechInputProps['onTranscriptionChange']
		>(onTranscriptionChange)
		const onListeningChangeRef =
			useRef<SpeechInputProps['onListeningChange']>(onListeningChange)
		const onAudioRecordedRef =
			useRef<SpeechInputProps['onAudioRecorded']>(onAudioRecorded)
		const buttonRef = useRef<HTMLButtonElement>(null)

		// Keep refs in sync
		onTranscriptionChangeRef.current = onTranscriptionChange
		onListeningChangeRef.current = onListeningChange
		onAudioRecordedRef.current = onAudioRecorded

		useEffect(() => {
			onListeningChangeRef.current?.(isListening)
		}, [isListening])

		// Initialize Speech Recognition when mode is speech-recognition
		useEffect(() => {
			if (mode !== 'speech-recognition') {
				return
			}

			const SpeechRecognition =
				window.SpeechRecognition || window.webkitSpeechRecognition
			const speechRecognition = new SpeechRecognition()

			speechRecognition.continuous = true
			speechRecognition.interimResults = true
			speechRecognition.lang = lang

			const handleStart = () => {
				setIsListening(true)
			}

			const handleEnd = () => {
				setIsListening(false)
			}

			const handleResult = (event: Event) => {
				const speechEvent = event as SpeechRecognitionEvent
				let finalTranscript = ''

				for (
					let i = speechEvent.resultIndex;
					i < speechEvent.results.length;
					i += 1
				) {
					const result = speechEvent.results[i]
					if (result.isFinal) {
						finalTranscript += result[0]?.transcript ?? ''
					}
				}

				if (finalTranscript) {
					onTranscriptionChangeRef.current?.(finalTranscript)
				}
			}

			const handleError = () => {
				console.warn('Speech recognition failed while dictating.')
				setIsListening(false)
			}

			speechRecognition.addEventListener('start', handleStart)
			speechRecognition.addEventListener('end', handleEnd)
			speechRecognition.addEventListener('result', handleResult)
			speechRecognition.addEventListener('error', handleError)

			recognitionRef.current = speechRecognition
			setIsRecognitionReady(true)

			return () => {
				speechRecognition.removeEventListener('start', handleStart)
				speechRecognition.removeEventListener('end', handleEnd)
				speechRecognition.removeEventListener('result', handleResult)
				speechRecognition.removeEventListener('error', handleError)
				speechRecognition.stop()
				recognitionRef.current = null
				setIsRecognitionReady(false)
			}
		}, [mode, lang])

		// Cleanup MediaRecorder and stream on unmount
		useEffect(
			() => () => {
				if (mediaRecorderRef.current?.state === 'recording') {
					mediaRecorderRef.current.stop()
				}
				if (streamRef.current) {
					for (const track of streamRef.current.getTracks()) {
						track.stop()
					}
				}
			},
			[],
		)

		const ensureMicrophonePermission = useCallback(async () => {
			if (
				!('mediaDevices' in navigator) ||
				!('getUserMedia' in navigator.mediaDevices)
			) {
				return
			}

			if (pendingMicPermissionRef.current) {
				return
			}

			try {
				pendingMicPermissionRef.current = true
				const stream = await navigator.mediaDevices.getUserMedia({
					audio: true,
				})
				for (const track of stream.getTracks()) {
					track.stop()
				}
			} finally {
				pendingMicPermissionRef.current = false
			}
		}, [])

		// Start MediaRecorder recording
		const startMediaRecorder = useCallback(async () => {
			if (!onAudioRecordedRef.current) {
				return
			}

			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					audio: true,
				})
				streamRef.current = stream
				const mediaRecorder = new MediaRecorder(stream)
				audioChunksRef.current = []

				const handleDataAvailable = (event: BlobEvent) => {
					if (event.data.size > 0) {
						audioChunksRef.current.push(event.data)
					}
				}

				const handleStop = async () => {
					for (const track of stream.getTracks()) {
						track.stop()
					}
					streamRef.current = null

					const audioBlob = new Blob(audioChunksRef.current, {
						type: 'audio/webm',
					})

					if (audioBlob.size > 0 && onAudioRecordedRef.current) {
						setIsProcessing(true)
						try {
							const transcript = await onAudioRecordedRef.current(audioBlob)
							if (transcript) {
								onTranscriptionChangeRef.current?.(transcript)
							}
						} catch {
							// Error handling delegated to the onAudioRecorded caller
						} finally {
							setIsProcessing(false)
						}
					}
				}

				const handleError = () => {
					setIsListening(false)
					for (const track of stream.getTracks()) {
						track.stop()
					}
					streamRef.current = null
				}

				mediaRecorder.addEventListener('dataavailable', handleDataAvailable)
				mediaRecorder.addEventListener('stop', handleStop)
				mediaRecorder.addEventListener('error', handleError)

				mediaRecorderRef.current = mediaRecorder
				mediaRecorder.start()
				setIsListening(true)
			} catch {
				setIsListening(false)
			}
		}, [])

		// Stop MediaRecorder recording
		const stopMediaRecorder = useCallback(() => {
			if (mediaRecorderRef.current?.state === 'recording') {
				mediaRecorderRef.current.stop()
			}
			setIsListening(false)
		}, [])

		const startSpeechRecognition = useCallback(async () => {
			if (!recognitionRef.current) {
				return
			}

			try {
				await ensureMicrophonePermission()
				recognitionRef.current.start()
			} catch (error) {
				console.warn(
					'Failed to start speech recognition, trying media recorder fallback',
					error,
				)
				setIsListening(false)

				if (!onAudioRecordedRef.current) {
					return
				}

				if (!('mediaDevices' in navigator) || !('MediaRecorder' in window)) {
					return
				}

				await startMediaRecorder()
			}
		}, [ensureMicrophonePermission, startMediaRecorder])

		const startListening = useCallback(async () => {
			if (mode === 'speech-recognition') {
				await startSpeechRecognition()
			} else {
				await startMediaRecorder()
			}
		}, [mode, startMediaRecorder, startSpeechRecognition])

		const stopListening = useCallback(() => {
			if (mode === 'speech-recognition' && recognitionRef.current) {
				if (isListening) {
					recognitionRef.current.stop()
				}
			} else if (mode === 'media-recorder') {
				stopMediaRecorder()
			} else {
				setIsListening(false)
			}
		}, [isListening, mode, stopMediaRecorder])

		const toggleListening = useCallback(async () => {
			if (isListening) {
				stopListening()
				return
			}
			await startListening()
		}, [isListening, startListening, stopListening])

		useImperativeHandle(
			ref,
			() => ({
				start: async () => {
					await startListening()
				},
				stop: () => {
					stopListening()
				},
				toggle: () => {
					void toggleListening()
				},
				get isListening() {
					return isListening
				},
			}),
			[isListening, startListening, stopListening, toggleListening],
		)

		// Determine if button should be disabled
		const isDisabled =
			mode === 'none' ||
			(mode === 'speech-recognition' && !isRecognitionReady) ||
			(mode === 'media-recorder' && !onAudioRecorded) ||
			isProcessing

		return (
			<div className="relative inline-flex items-center justify-center">
				{/* Animated pulse rings */}
				{isListening &&
					[0, 1, 2].map((index) => (
						<div
							className="absolute inset-0 animate-ping rounded-full border-2 border-red-400/30"
							key={index}
							style={{
								animationDelay: `${index * 0.3}s`,
								animationDuration: '2s',
							}}
						/>
					))}

				{/* Main record button */}
				<Button
					ref={buttonRef}
					className={cn(
						'relative z-10 rounded-full transition-all duration-300',
						isListening
							? 'bg-destructive text-white hover:bg-destructive/80 hover:text-white'
							: 'bg-primary text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground',
						className,
					)}
					disabled={isDisabled}
					onClick={toggleListening}
					{...props}
				>
					{isProcessing && <Spinner />}
					{!isProcessing && isListening && <SquareIcon className="size-4" />}
					{!(isProcessing || isListening) && <MicIcon className="size-4" />}
				</Button>
			</div>
		)
	},
)

SpeechInput.displayName = 'SpeechInput'
