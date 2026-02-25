'use client'

import type { LucideIcon } from 'lucide-react'
import type { ComponentProps } from 'react'
import { useCallback } from 'react'
import type { ActiveTool } from '@/components/ai-elements/prompt-input'
import { usePromptInputController } from '@/components/ai-elements/prompt-input'
import { cn } from '@/lib/utils'

const activeColorMap = {
	cyan: {
		bg: 'bg-prompt-box-cyan/12',
		border: 'border-prompt-box-cyan/70',
		text: 'text-prompt-box-cyan',
	},
	purple: {
		bg: 'bg-prompt-box-purple/12',
		border: 'border-prompt-box-purple/70',
		text: 'text-prompt-box-purple',
	},
	amber: {
		bg: 'bg-prompt-box-amber/12',
		border: 'border-prompt-box-amber/70',
		text: 'text-prompt-box-amber',
	},
} as const

export type PromptBoxToolToggleProps = Omit<
	ComponentProps<'button'>,
	'children'
> & {
	tool: NonNullable<ActiveTool>
	icon: LucideIcon
	label: string
	activeColor: keyof typeof activeColorMap
}

export const PromptBoxToolToggle = ({
	tool,
	icon: Icon,
	label,
	activeColor,
	className,
	...props
}: PromptBoxToolToggleProps) => {
	const { activeTool } = usePromptInputController()
	const isActive = activeTool.value === tool
	const colors = activeColorMap[activeColor]

	const handleClick = useCallback(() => {
		activeTool.toggle(tool)
	}, [activeTool, tool])

	return (
		<button
			type="button"
			onClick={handleClick}
			className={cn(
				'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium transition-all duration-200',
				'hover:bg-accent',
				isActive
					? [colors.bg, colors.border, colors.text]
					: 'border-transparent text-muted-foreground',
				className,
			)}
			{...props}
		>
			<Icon
				className={cn(
					'size-3.5 shrink-0 transition-all duration-500',
					isActive && 'rotate-[360deg] scale-[1.15]',
				)}
			/>
			<span
				className={cn(
					'overflow-hidden whitespace-nowrap transition-all duration-250',
					isActive ? 'max-w-28 opacity-100' : 'max-w-0 opacity-0',
				)}
			>
				{label}
			</span>
		</button>
	)
}
