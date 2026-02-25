'use client'

import { cn } from '@/lib/utils'

const colorMap = {
	purple: 'via-prompt-box-purple/50',
	cyan: 'via-prompt-box-cyan/50',
	amber: 'via-prompt-box-amber/50',
} as const

export type PromptBoxNeonDividerProps = {
	color: keyof typeof colorMap
	className?: string
}

export const PromptBoxNeonDivider = ({
	color,
	className,
}: PromptBoxNeonDividerProps) => (
	<div
		aria-hidden
		className={cn(
			'h-5 w-[1.5px] mx-0.5 bg-gradient-to-b from-transparent to-transparent',
			colorMap[color],
			className,
		)}
	/>
)
