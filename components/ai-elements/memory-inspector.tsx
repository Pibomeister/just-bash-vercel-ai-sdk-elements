'use client'

import { RefreshCw as RefreshIcon, Loader2 as SpinnerIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MemoryItem {
	id: string
	role: string
	createdAt: string | Date
	content: {
		format: 2
		parts: Array<{ type: string; text?: string }>
		metadata?: Record<string, unknown>
	}
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MemoryInspectorProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	threadId: string | null
	resourceId: string | null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MemoryInspector({
	open,
	onOpenChange,
	threadId,
	resourceId,
}: MemoryInspectorProps) {
	const [items, setItems] = useState<MemoryItem[]>([])
	const [isLoading, setIsLoading] = useState(false)

	const refresh = useCallback(async () => {
		if (!threadId || !resourceId) return
		setIsLoading(true)
		try {
			const res = await fetch(
				`/api/memories?threadId=${encodeURIComponent(threadId)}&resourceId=${encodeURIComponent(resourceId)}&limit=100`,
			)
			if (!res.ok) return
			const data = (await res.json()) as { items: MemoryItem[] }
			setItems(data.items ?? [])
		} catch {
			// Silently ignore network errors
		} finally {
			setIsLoading(false)
		}
	}, [threadId, resourceId])

	// Refresh when the sheet opens
	useEffect(() => {
		if (open) {
			void refresh()
		}
	}, [open, refresh])

	const observations = items.filter((m) => m.role === 'assistant')
	const reflections = items.filter((m) => m.role === 'user')

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="flex w-96 flex-col gap-0 p-0">
				<SheetHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
					<SheetTitle className="text-base">Memory Inspector</SheetTitle>
					<div className="flex items-center gap-2">
						{isLoading && (
							<Badge variant="secondary" className="gap-1 text-xs">
								<SpinnerIcon className="size-3 animate-spin" />
								Pending
							</Badge>
						)}
						<Button
							variant="ghost"
							size="icon"
							className="size-7"
							onClick={() => void refresh()}
							disabled={isLoading}
						>
							<RefreshIcon className="size-3.5" />
							<span className="sr-only">Refresh</span>
						</Button>
					</div>
				</SheetHeader>

				<Tabs defaultValue="observations" className="flex flex-1 flex-col">
					<TabsList className="mx-4 mt-3 mb-1 grid w-auto grid-cols-2">
						<TabsTrigger value="observations">
							Observations
							{observations.length > 0 && (
								<Badge
									variant="secondary"
									className="ml-1.5 size-4 rounded-full p-0 text-[10px] leading-none flex items-center justify-center"
								>
									{observations.length}
								</Badge>
							)}
						</TabsTrigger>
						<TabsTrigger value="reflections">
							Reflections
							{reflections.length > 0 && (
								<Badge
									variant="secondary"
									className="ml-1.5 size-4 rounded-full p-0 text-[10px] leading-none flex items-center justify-center"
								>
									{reflections.length}
								</Badge>
							)}
						</TabsTrigger>
					</TabsList>

					<TabsContent
						value="observations"
						className="flex-1 overflow-hidden mt-0"
					>
						<ScrollArea className="h-full px-4 pb-4">
							{observations.length === 0 ? (
								<div className="py-8 text-center text-sm text-muted-foreground">
									{isLoading ? 'Loading...' : 'No observations yet'}
								</div>
							) : (
								<div className="space-y-3 pt-2">
									{observations.map((item) => (
										<MemoryCard key={item.id} item={item} />
									))}
								</div>
							)}
						</ScrollArea>
					</TabsContent>

					<TabsContent
						value="reflections"
						className="flex-1 overflow-hidden mt-0"
					>
						<ScrollArea className="h-full px-4 pb-4">
							{reflections.length === 0 ? (
								<div className="py-8 text-center text-sm text-muted-foreground">
									{isLoading ? 'Loading...' : 'No reflections yet'}
								</div>
							) : (
								<div className="space-y-3 pt-2">
									{reflections.map((item) => (
										<MemoryCard key={item.id} item={item} />
									))}
								</div>
							)}
						</ScrollArea>
					</TabsContent>
				</Tabs>
			</SheetContent>
		</Sheet>
	)
}

// ---------------------------------------------------------------------------
// MemoryCard — single memory item
// ---------------------------------------------------------------------------

function MemoryCard({ item }: { item: MemoryItem }) {
	const textPart = item.content.parts.find(
		(p) => p.type === 'text' && typeof p.text === 'string',
	) as { type: 'text'; text: string } | undefined

	const text = textPart?.text ?? ''
	const createdAt = new Date(item.createdAt)

	return (
		<div className="rounded-md border bg-muted/40 p-3 text-sm">
			<div className="flex items-start justify-between gap-2">
				<p className="flex-1 text-foreground leading-relaxed line-clamp-4">
					{text}
				</p>
			</div>
			<p className="mt-2 text-xs text-muted-foreground">
				{createdAt.toLocaleDateString(undefined, {
					month: 'short',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit',
				})}
			</p>
		</div>
	)
}
