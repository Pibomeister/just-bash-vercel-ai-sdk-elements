'use client'

import { useCallback, useRef, useState } from 'react'
import { Suggestion } from '@/components/ai-elements/suggestion'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function FollowUpSuggestions({
	suggestions,
	isLoading,
	onSelect,
}: {
	suggestions: string[]
	isLoading: boolean
	onSelect: (suggestion: string) => void
}) {
	const scrollRef = useRef<HTMLDivElement>(null)
	const [showLeftFade, setShowLeftFade] = useState(false)

	const handleScroll = useCallback(() => {
		if (scrollRef.current) {
			setShowLeftFade(scrollRef.current.scrollLeft > 0)
		}
	}, [])

	if (!isLoading && suggestions.length === 0) return null

	return (
		<div className="relative">
			{/* Left fade gradient */}
			<div
				className={cn(
					'pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-background to-transparent transition-opacity duration-150',
					showLeftFade ? 'opacity-100' : 'opacity-0',
				)}
			/>

			{/* Scroll container */}
			<div
				ref={scrollRef}
				onScroll={handleScroll}
				className="scrollbar-hide flex gap-2 overflow-x-auto py-1"
			>
				{isLoading
					? Array.from({ length: 3 }, (_, i) => (
							<Skeleton
								key={`skeleton-${i}`}
								className="h-8 w-[180px] shrink-0 rounded-full"
							/>
						))
					: suggestions.map((suggestion, index) => (
							<Suggestion
								key={suggestion}
								suggestion={suggestion}
								onClick={onSelect}
								className="animate-pop-in shrink-0 whitespace-nowrap"
								style={{ animationDelay: `${index * 60}ms` }}
							/>
						))}
			</div>

			{/* Right fade gradient */}
			<div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background to-transparent" />
		</div>
	)
}
