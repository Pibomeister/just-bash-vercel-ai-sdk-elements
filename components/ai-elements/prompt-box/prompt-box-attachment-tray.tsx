'use client'

import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

export type PromptBoxAttachmentTrayProps = HTMLAttributes<HTMLDivElement>

export const PromptBoxAttachmentTray = ({
	className,
	children,
	...props
}: PromptBoxAttachmentTrayProps) => {
	if (!children) return null

	return (
		<div
			className={cn(
				'flex gap-2 overflow-x-auto border-t border-zinc-800/50 p-2 scrollbar-thin',
				className,
			)}
			{...props}
		>
			{children}
		</div>
	)
}
