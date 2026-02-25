'use client'

import { scoreColor } from '@/components/ai-elements/citation-renderer'
import { Badge } from '@/components/ui/badge'

export type SearchDocumentResult = {
	index: number
	text: string
	score: number | null
	documentId: string | null
}

function scoreBorderColor(score: number | null): string {
	if (score === null) return 'border-l-muted'
	if (score >= 0.8) return 'border-l-emerald-500/60'
	if (score >= 0.5) return 'border-l-amber-500/60'
	return 'border-l-red-500/60'
}

function parseSearchDocumentResults(output: unknown): SearchDocumentResult[] {
	if (!Array.isArray(output)) return []

	const parsed: SearchDocumentResult[] = []
	for (const item of output) {
		if (!item || typeof item !== 'object') continue

		const result = item as {
			index?: unknown
			text?: unknown
			score?: unknown
			documentId?: unknown
		}

		if (typeof result.index !== 'number' || !Number.isFinite(result.index)) {
			continue
		}
		if (typeof result.text !== 'string') continue
		if (typeof result.score !== 'number' && result.score !== null) continue
		if (typeof result.documentId !== 'string' && result.documentId !== null) {
			continue
		}

		parsed.push({
			index: result.index,
			text: result.text,
			score: result.score,
			documentId: result.documentId,
		})
	}

	return parsed
}

export function SearchResultCards({ output }: { output: unknown }) {
	const results = parseSearchDocumentResults(output)
	if (results.length === 0) {
		return (
			<div className="rounded-md border border-dashed border-muted-foreground/25 px-4 py-6 text-center text-xs text-muted-foreground">
				No results returned
			</div>
		)
	}

	return (
		<div className="space-y-2">
			{results.map((result, i) => (
				<div
					key={`${result.documentId ?? 'unknown'}-${result.index}-${i}`}
					className={`rounded-md border border-l-[3px] bg-card/50 p-3 ${scoreBorderColor(result.score)}`}
				>
					<div className="mb-2 flex items-center gap-2">
						<Badge
							variant="secondary"
							className="font-mono text-[10px] tabular-nums"
						>
							[{result.index}]
						</Badge>
						<Badge
							variant="outline"
							className={`font-mono text-[10px] tabular-nums ${scoreColor(result.score)}`}
						>
							{result.score !== null ? result.score.toFixed(4) : 'n/a'}
						</Badge>
						{result.documentId && (
							<span className="truncate font-mono text-[10px] text-muted-foreground">
								{result.documentId}
							</span>
						)}
					</div>
					<p className="text-xs leading-relaxed text-foreground/90">
						{result.text.length > 500
							? `${result.text.slice(0, 500)}...`
							: result.text}
					</p>
				</div>
			))}
		</div>
	)
}
