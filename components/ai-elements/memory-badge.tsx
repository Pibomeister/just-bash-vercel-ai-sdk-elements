'use client'

import { Brain as BrainIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
				<Badge
					variant="secondary"
					className="mt-2 cursor-pointer gap-1.5 text-xs hover:bg-secondary/80 transition-colors"
					onClick={onClick}
				>
					<BrainIcon className="size-3" />
					Memory updated
				</Badge>
			</TooltipTrigger>
			<TooltipContent side="bottom">
				<p className="text-xs">Click to open Memory Inspector</p>
			</TooltipContent>
		</Tooltip>
	)
}
