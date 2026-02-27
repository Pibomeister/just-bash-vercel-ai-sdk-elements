'use client'

import {
	BrainIcon,
	GlobeIcon,
	LightbulbIcon,
	PaintbrushIcon,
	PlusIcon,
	TelescopeIcon,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import type { ActiveTool } from '@/components/ai-elements/prompt-input'
import {
	PromptInputButton,
	usePromptInputController,
} from '@/components/ai-elements/prompt-input'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface ToolOption {
	id: NonNullable<ActiveTool>
	label: string
	icon: typeof GlobeIcon
	badge?: string
}

const toolOptions: ToolOption[] = [
	{ id: 'create-image', label: 'Create image', icon: PaintbrushIcon },
	{ id: 'search', label: 'Search web', icon: GlobeIcon },
	{
		id: 'deep-research',
		label: 'Deep research',
		icon: TelescopeIcon,
		badge: '5 left',
	},
	{ id: 'think', label: 'Think longer', icon: LightbulbIcon },
]

export type PromptBoxToolsPopoverProps = {
	className?: string
	onOpenMemoryInspector?: () => void
}

export const PromptBoxToolsPopover = ({
	className,
	onOpenMemoryInspector,
}: PromptBoxToolsPopoverProps) => {
	const { activeTool } = usePromptInputController()
	const [open, setOpen] = useState(false)

	const handleSelect = useCallback(
		(id: NonNullable<ActiveTool>) => {
			activeTool.set(id)
			setOpen(false)
		},
		[activeTool],
	)

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<PromptInputButton tooltip="Tools" className={className}>
					<PlusIcon className="size-4" />
				</PromptInputButton>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				sideOffset={8}
				className="animate-pop-in w-56 p-1.5"
			>
				{toolOptions.map((option) => {
					const Icon = option.icon
					const isSelected = activeTool.value === option.id

					return (
						<button
							key={option.id}
							type="button"
							onClick={() => handleSelect(option.id)}
							className={cn(
								'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
								'hover:bg-accent',
								isSelected && 'bg-accent text-accent-foreground',
							)}
						>
							<Icon className="size-4 shrink-0 text-muted-foreground" />
							<span className="flex-1 text-left">{option.label}</span>
							{option.badge && (
								<span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
									{option.badge}
								</span>
							)}
						</button>
					)
				})}
				{onOpenMemoryInspector && (
					<button
						type="button"
						onClick={() => {
							setOpen(false)
							onOpenMemoryInspector()
						}}
						className={cn(
							'mt-1 flex w-full items-center gap-2.5 rounded-md border-t px-2.5 pt-3 pb-2 text-sm transition-colors',
							'hover:bg-accent',
						)}
					>
						<BrainIcon className="size-4 shrink-0 text-muted-foreground" />
						<span className="flex-1 text-left">Memory Inspector</span>
					</button>
				)}
			</PopoverContent>
		</Popover>
	)
}
