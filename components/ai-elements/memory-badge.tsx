'use client'

import { Brain as BrainIcon } from 'lucide-react'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MemoryBadgeProps {
	onClick?: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MemoryBadge({ onClick }: MemoryBadgeProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				{/* P2-2: Use a semantic <button> so the element is focusable,
				    keyboard-activatable, and screen-reader accessible (WCAG 2.1 AA). */}
				<button
					type="button"
					onClick={onClick}
					className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-transparent bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
					aria-label="Memory updated — click to open Memory Inspector"
				>
					<BrainIcon className="size-3" aria-hidden="true" />
					Memory updated
				</button>
			</TooltipTrigger>
			<TooltipContent side="bottom">
				<p className="text-xs">Click to open Memory Inspector</p>
			</TooltipContent>
		</Tooltip>
	)
}
