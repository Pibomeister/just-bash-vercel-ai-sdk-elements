'use client'

import type { ClipboardEvent, PropsWithChildren } from 'react'
import { useCallback } from 'react'
import {
	usePromptInputAttachments,
	usePromptInputController,
} from '@/components/ai-elements/prompt-input'

const PASTE_THRESHOLD = 200

export type PromptBoxPasteHandlerProps = PropsWithChildren<{
	className?: string
}>

export const PromptBoxPasteHandler = ({
	children,
	className,
}: PromptBoxPasteHandlerProps) => {
	const controller = usePromptInputController()
	const attachments = usePromptInputAttachments()

	const handlePaste = useCallback(
		(e: ClipboardEvent<HTMLDivElement>) => {
			const text = e.clipboardData?.getData('text/plain')

			if (!text || text.length <= PASTE_THRESHOLD) {
				return
			}

			e.preventDefault()

			// Put truncated preview in textarea
			const truncated = `${text.slice(0, PASTE_THRESHOLD)}\u2026`
			controller.textInput.setInput(controller.textInput.value + truncated)

			// Create a text blob and add as attachment
			const blob = new Blob([text], { type: 'text/plain' })
			const file = new File([blob], 'pasted-text.txt', {
				type: 'text/plain',
			})
			attachments.add([file])
		},
		[controller, attachments],
	)

	return (
		<div onPaste={handlePaste} className={className}>
			{children}
		</div>
	)
}
