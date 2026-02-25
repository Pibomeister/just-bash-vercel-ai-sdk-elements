'use client'

import type { ChatStatus } from 'ai'
import { ArrowUpIcon, MicIcon, SquareIcon } from 'lucide-react'
import type { ComponentProps } from 'react'
import { useCallback, useRef } from 'react'
import { usePromptInputController } from '@/components/ai-elements/prompt-input'
import { PromptInputDictation } from '@/components/ai-elements/prompt-input-dictation'
import type { SpeechInputHandle } from '@/components/ai-elements/speech-input'
import { InputGroupButton } from '@/components/ui/input-group'
import { cn } from '@/lib/utils'
import { usePromptBoxContext } from './prompt-box-context'

export type PromptBoxSendButtonProps = Omit<
	ComponentProps<typeof InputGroupButton>,
	'children'
> & {
	status?: ChatStatus
	onStop?: () => void
}

export const PromptBoxSendButton = ({
	status,
	onStop,
	className,
	onClick,
	...props
}: PromptBoxSendButtonProps) => {
	const controller = usePromptInputController()
	const { isRecording, stopRecording, startRecording } = usePromptBoxContext()
	const dictationRef = useRef<SpeechInputHandle>(null)
	const hasContent = controller.textInput.value.trim().length > 0
	const hasAttachments = controller.attachments.files.length > 0
	const canSubmit = hasContent || hasAttachments
	const isStreaming = status === 'submitted' || status === 'streaming'
	const shouldShowDictation = !canSubmit
	const isDisabled = false

	const handleRecordingStateChange = useCallback(
		(recording: boolean) => {
			if (recording) {
				startRecording()
			} else {
				stopRecording()
			}
		},
		[startRecording, stopRecording],
	)

	const handleClick = useCallback(
		(e: React.MouseEvent<HTMLButtonElement>) => {
			if (isStreaming && onStop) {
				e.preventDefault()
				onStop()
				return
			}
			if (shouldShowDictation) {
				e.preventDefault()
				if (isRecording) {
					dictationRef.current?.stop()
				} else {
					void dictationRef.current?.start()
				}
				return
			}
			if (isRecording) {
				e.preventDefault()
				dictationRef.current?.stop()
				return
			}
			onClick?.(e)
		},
		[isRecording, isStreaming, onStop, onClick, shouldShowDictation],
	)

	// Determine icon and button type
	let Icon = MicIcon
	let buttonType: 'button' | 'submit' = 'button'
	let ariaLabel = 'Start recording'
	let variant: 'ghost' | 'default' = 'ghost'

	if (isStreaming) {
		Icon = SquareIcon
		buttonType = 'button'
		ariaLabel = 'Stop'
		variant = 'ghost'
	} else if (isRecording || shouldShowDictation) {
		Icon = isRecording ? SquareIcon : MicIcon
		buttonType = 'button'
		ariaLabel = isRecording ? 'Stop recording' : 'Start recording'
		variant = 'ghost'
	} else if (hasContent) {
		Icon = ArrowUpIcon
		buttonType = 'submit'
		ariaLabel = 'Send'
		variant = 'default'
	} else if (hasAttachments) {
		Icon = ArrowUpIcon
		buttonType = 'submit'
		ariaLabel = 'Send attachments'
		variant = 'default'
	} else {
		Icon = MicIcon
	}

	return (
		<>
			<PromptInputDictation
				className="hidden"
				onRecordingStateChange={handleRecordingStateChange}
				ref={dictationRef}
			/>
			<InputGroupButton
				aria-label={ariaLabel}
				className={cn(
					'transition-all duration-200',
					(isRecording || isStreaming) && 'text-prompt-box-red',
					className,
				)}
				onClick={handleClick}
				size="icon-sm"
				type={buttonType}
				variant={variant}
				disabled={isDisabled}
				{...props}
			>
				<Icon className="size-4" />
			</InputGroupButton>
		</>
	)
}
