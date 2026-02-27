'use client'

import type { LucideIcon } from 'lucide-react'
import type { ComponentProps } from 'react'
import { useCallback } from 'react'
import type { ActiveTool } from '@/components/ai-elements/prompt-input'
import { usePromptInputController } from '@/components/ai-elements/prompt-input'
import { cn } from '@/lib/utils'

const activeColorMap = {
	cyan: {
		bg: 'oklch(0.78 0.11 225 / 0.20)',
		border: 'oklch(0.78 0.11 225 / 0.90)',
		text: 'oklch(0.84 0.12 225)',
	},
	purple: {
		bg: 'oklch(0.72 0.15 310 / 0.20)',
		border: 'oklch(0.72 0.15 310 / 0.90)',
		text: 'oklch(0.79 0.16 310)',
	},
	amber: {
		bg: 'oklch(0.80 0.14 80 / 0.20)',
		border: 'oklch(0.80 0.14 80 / 0.90)',
		text: 'oklch(0.86 0.15 80)',
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
			aria-label={label}
			onClick={handleClick}
			className={cn(
				'inline-flex h-8 items-center rounded-md border py-1 text-xs font-medium transition-all duration-200',
				'hover:bg-accent',
				isActive
					? 'gap-1 px-2 border'
					: 'gap-0 border-transparent px-1.5 text-muted-foreground',
				className,
			)}
			style={
				isActive
					? {
							backgroundColor: colors.bg,
							borderColor: colors.border,
							color: colors.text,
						}
					: undefined
			}
			{...props}
		>
			<Icon
				className={cn(
					'size-4 shrink-0 transition-all duration-500',
					isActive && 'rotate-[1turn] scale-[1.15]',
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
