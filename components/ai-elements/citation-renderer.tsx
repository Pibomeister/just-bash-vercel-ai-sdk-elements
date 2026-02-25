'use client'

import type { UIMessage } from 'ai'
import {
	BookOpenIcon,
	ChevronDownIcon,
	ChevronUpIcon,
	ExternalLinkIcon,
} from 'lucide-react'
import type { HTMLAttributes } from 'react'
import { memo, useCallback, useMemo, useState } from 'react'
import { Streamdown } from 'streamdown'
import { useDocumentViewer } from '@/components/ai-elements/document-viewer/document-viewer-provider'
import {
	InlineCitationCard,
	InlineCitationCardBody,
	InlineCitationQuote,
	InlineCitationSource,
} from '@/components/ai-elements/inline-citation'
import { streamdownPlugins } from '@/components/ai-elements/message'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HoverCardTrigger } from '@/components/ui/hover-card'
import { detectFileCategory } from '@/lib/file-types'
import type { DocumentMetadata } from '@/lib/types/documents'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CitationSource = {
	index: number
	text: string
	score: number | null
	documentId: string | null
}

export type EnrichedCitationSource = CitationSource & {
	title: string
	originalName: string
}

// ---------------------------------------------------------------------------
// Source map builder
// ---------------------------------------------------------------------------

export function buildSourceMap(
	message: UIMessage,
): Map<number, CitationSource> {
	const map = new Map<number, CitationSource>()

	for (const part of message.parts) {
		if (!part.type.startsWith('tool-')) continue
		const toolName = part.type.slice(5)

		const toolPart = part as unknown as {
			state: string
			output?: unknown
		}
		if (toolPart.state !== 'output-available') continue

		if (toolName === 'searchDocuments') {
			const output = toolPart.output as
				| Array<{
						index: number
						text: string
						score: number | null
						documentId: string | null
				  }>
				| undefined

			if (!Array.isArray(output)) continue

			for (const result of output) {
				if (typeof result.index === 'number') {
					map.set(result.index, {
						index: result.index,
						text: result.text,
						score: result.score,
						documentId: result.documentId,
					})
				}
			}
		}

		if (toolName === 'bash') {
			const output = toolPart.output as
				| {
						stdout?: string
						stderr?: string
						exitCode?: number
						__bashCitations?: Array<{
							index: number
							documentId: string
							text: string
						}>
				  }
				| undefined

			if (!output?.__bashCitations || !Array.isArray(output.__bashCitations))
				continue

			for (const citation of output.__bashCitations) {
				if (typeof citation.index === 'number' && !map.has(citation.index)) {
					map.set(citation.index, {
						index: citation.index,
						text: citation.text,
						score: null,
						documentId: citation.documentId,
					})
				}
			}
		}
	}

	return map
}

export function enrichSourceMap(
	sourceMap: Map<number, CitationSource>,
	documents: DocumentMetadata[],
): Map<number, EnrichedCitationSource> {
	const enriched = new Map<number, EnrichedCitationSource>()

	for (const [index, source] of sourceMap) {
		const doc = source.documentId
			? documents.find((d) => d.documentId === source.documentId)
			: null
		const title = doc
			? doc.originalName.replace(/\.[^.]+$/, '')
			: 'Unknown document'

		const originalName = doc ? doc.originalName : 'Unknown document'
		enriched.set(index, { ...source, title, originalName })
	}

	return enriched
}

// ---------------------------------------------------------------------------
// Score color helper (shared with page.tsx)
// ---------------------------------------------------------------------------

export function scoreColor(score: number | null): string {
	if (score === null) return 'bg-muted text-muted-foreground'
	if (score >= 0.8)
		return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
	if (score >= 0.5) return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
	return 'bg-red-500/15 text-red-400 border-red-500/30'
}

// ---------------------------------------------------------------------------
// Citation Pill
// ---------------------------------------------------------------------------

function CitationPill({ source }: { source: EnrichedCitationSource }) {
	const { open, openLoading } = useDocumentViewer()

	const handleViewInDocument = useCallback(async () => {
		if (!source.documentId) return

		openLoading(source.originalName)

		try {
			const res = await fetch(`/api/documents/${source.documentId}/file`)
			if (!res.ok) return

			const category = detectFileCategory(source.originalName)
			if (
				category === 'pdf' ||
				category === 'docx' ||
				category === 'image' ||
				category === 'spreadsheet'
			) {
				const buffer = await res.arrayBuffer()
				const bytes = new Uint8Array(buffer)
				let binary = ''
				for (let i = 0; i < bytes.length; i++) {
					binary += String.fromCharCode(bytes[i])
				}
				const base64 = btoa(binary)
				open(source.originalName, base64)
			} else {
				const text = await res.text()
				open(source.originalName, text)
			}
		} catch {
			// Silently fail — modal will just not open
		}
	}, [source.documentId, source.originalName, open, openLoading])

	const excerpt =
		source.text.length > 200 ? `${source.text.slice(0, 200)}...` : source.text

	return (
		<InlineCitationCard>
			<HoverCardTrigger asChild>
				<Badge
					variant="secondary"
					className={cn(
						'mx-0.5 inline-flex cursor-pointer rounded-full px-2 py-0 text-[11px] font-medium',
						'align-baseline leading-tight',
					)}
				>
					{source.title.length > 20
						? `${source.title.slice(0, 20)}...`
						: source.title}
				</Badge>
			</HoverCardTrigger>
			<InlineCitationCardBody>
				<div className="space-y-3 p-4">
					<InlineCitationSource title={source.title}>
						{source.score !== null && (
							<Badge
								variant="outline"
								className={`mt-1 font-mono text-[10px] tabular-nums ${scoreColor(source.score)}`}
							>
								{source.score.toFixed(4)}
							</Badge>
						)}
					</InlineCitationSource>
					<InlineCitationQuote>{excerpt}</InlineCitationQuote>
					{source.documentId && (
						<Button
							variant="ghost"
							size="sm"
							className="h-7 w-full gap-1.5 text-xs"
							onClick={handleViewInDocument}
						>
							<BookOpenIcon className="size-3.5" />
							View in document
						</Button>
					)}
				</div>
			</InlineCitationCardBody>
		</InlineCitationCard>
	)
}

// ---------------------------------------------------------------------------
// Cited Message Response
// ---------------------------------------------------------------------------

const CITATION_REPLACE_PATTERN = /\[(\d+)\]/g

function preprocessCitations(text: string): string {
	return text.replace(
		CITATION_REPLACE_PATTERN,
		(_, index) => `<cite data-index="${index}"></cite>`,
	)
}

const CITATION_ALLOWED_TAGS: Record<string, string[]> = {
	cite: ['dataIndex'],
}

export const CitedMessageResponse = memo(function CitedMessageResponse({
	text,
	sources,
}: {
	text: string
	sources: Map<number, EnrichedCitationSource>
}) {
	const processedText = useMemo(() => preprocessCitations(text), [text])

	const components = useMemo(
		() => ({
			cite: (
				props: HTMLAttributes<HTMLElement> & {
					node?: unknown
					'data-index'?: string
				},
			) => {
				const index = Number(props['data-index'])
				if (Number.isNaN(index)) return null
				const source = sources.get(index)
				if (!source) return <span>[{index}]</span>
				return <CitationPill source={source} />
			},
		}),
		[sources],
	)

	if (sources.size === 0) {
		return (
			<Streamdown
				className="size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
				plugins={streamdownPlugins}
			>
				{text}
			</Streamdown>
		)
	}

	return (
		<Streamdown
			className="size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
			plugins={streamdownPlugins}
			components={components}
			allowedTags={CITATION_ALLOWED_TAGS}
		>
			{processedText}
		</Streamdown>
	)
})

// ---------------------------------------------------------------------------
// Sources Bar — card-based with preview / expand
// ---------------------------------------------------------------------------

type UniqueDocEntry = {
	documentId: string
	title: string
	originalName: string
	excerpt: string
}

function buildUniqueDocuments(
	sources: Map<number, EnrichedCitationSource>,
): UniqueDocEntry[] {
	const seen = new Set<string>()
	const docs: UniqueDocEntry[] = []
	for (const source of sources.values()) {
		if (!source.documentId || seen.has(source.documentId)) continue
		seen.add(source.documentId)
		const raw = source.text.replace(/\s+/g, ' ').trim()
		const excerpt = raw.length > 80 ? `${raw.slice(0, 80)}...` : raw
		docs.push({
			documentId: source.documentId,
			title: source.title,
			originalName: source.originalName,
			excerpt,
		})
	}
	return docs
}

const PREVIEW_COUNT = 2

export function SourcesBar({
	sources,
}: {
	sources: Map<number, EnrichedCitationSource>
}) {
	const { open, openLoading } = useDocumentViewer()
	const [isExpanded, setIsExpanded] = useState(false)

	const uniqueDocs = useMemo(() => buildUniqueDocuments(sources), [sources])

	const handleOpenDocument = useCallback(
		async (documentId: string, originalName: string) => {
			openLoading(originalName)
			try {
				const res = await fetch(`/api/documents/${documentId}/file`)
				if (!res.ok) return

				const category = detectFileCategory(originalName)
				if (
					category === 'pdf' ||
					category === 'docx' ||
					category === 'image' ||
					category === 'spreadsheet'
				) {
					const buffer = await res.arrayBuffer()
					const bytes = new Uint8Array(buffer)
					let binary = ''
					for (let i = 0; i < bytes.length; i++) {
						binary += String.fromCharCode(bytes[i])
					}
					const base64 = btoa(binary)
					open(originalName, base64)
				} else {
					const text = await res.text()
					open(originalName, text)
				}
			} catch {
				// Silently fail
			}
		},
		[open, openLoading],
	)

	if (uniqueDocs.length === 0) return null

	const visibleDocs = isExpanded
		? uniqueDocs
		: uniqueDocs.slice(0, PREVIEW_COUNT)
	const hasMore = uniqueDocs.length > PREVIEW_COUNT

	return (
		<div className="mt-4 rounded-lg border bg-card text-card-foreground">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-2.5">
				<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					Sources
				</span>
				{hasMore && (
					<button
						type="button"
						className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
						onClick={() => setIsExpanded((prev) => !prev)}
					>
						{isExpanded ? (
							<>
								Show less
								<ChevronUpIcon className="size-3.5" />
							</>
						) : (
							<>
								Show all ({uniqueDocs.length})
								<ChevronDownIcon className="size-3.5" />
							</>
						)}
					</button>
				)}
			</div>

			{/* Items */}
			<div className="divide-y">
				{visibleDocs.map((doc) => (
					<button
						key={doc.documentId}
						type="button"
						className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
						onClick={() => handleOpenDocument(doc.documentId, doc.originalName)}
					>
						<ExternalLinkIcon className="size-4 shrink-0 text-muted-foreground" />
						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-medium">{doc.title}</p>
							<p className="line-clamp-1 text-xs text-muted-foreground">
								{doc.excerpt}
							</p>
						</div>
					</button>
				))}
			</div>
		</div>
	)
}
