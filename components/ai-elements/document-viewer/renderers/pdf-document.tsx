'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
	'pdfjs-dist/build/pdf.worker.min.mjs',
	import.meta.url,
).toString()

export function PDFDocument({ data }: { data: ArrayBuffer }) {
	const [numPages, setNumPages] = useState(0)
	const [currentPage, setCurrentPage] = useState(1)
	const [jumpInput, setJumpInput] = useState('')
	const file = useMemo(() => ({ data }), [data])
	const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())

	const setPageRef = useCallback(
		(pageNum: number, el: HTMLDivElement | null) => {
			if (el) {
				pageRefs.current.set(pageNum, el)
			} else {
				pageRefs.current.delete(pageNum)
			}
		},
		[],
	)

	useEffect(() => {
		if (numPages === 0) return

		const observer = new IntersectionObserver(
			(entries) => {
				let bestEntry: IntersectionObserverEntry | null = null
				for (const entry of entries) {
					if (
						entry.isIntersecting &&
						(!bestEntry ||
							entry.intersectionRatio > bestEntry.intersectionRatio)
					) {
						bestEntry = entry
					}
				}
				if (bestEntry) {
					const pageNum = Number(
						(bestEntry.target as HTMLElement).dataset.pageNumber,
					)
					if (pageNum) setCurrentPage(pageNum)
				}
			},
			{ threshold: [0, 0.25, 0.5, 0.75, 1] },
		)

		for (const el of pageRefs.current.values()) {
			observer.observe(el)
		}

		return () => observer.disconnect()
	}, [numPages])

	function handleJump(e: React.FormEvent) {
		e.preventDefault()
		const target = Number(jumpInput)
		if (target >= 1 && target <= numPages) {
			const el = pageRefs.current.get(target)
			el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
			setJumpInput('')
		}
	}

	return (
		<div className="relative">
			<Document
				file={file}
				onLoadSuccess={({ numPages: n }) => setNumPages(n)}
				loading={null}
			>
				<div className="flex flex-col items-center gap-4 p-4">
					{Array.from({ length: numPages }, (_, i) => {
						const pageNum = i + 1
						return (
							<div
								key={pageNum}
								data-page-number={pageNum}
								ref={(el) => setPageRef(pageNum, el)}
							>
								<Page pageNumber={pageNum} width={700} loading={null} />
							</div>
						)
					})}
				</div>
			</Document>

			{numPages > 1 && (
				<div className="sticky bottom-0 z-10 flex items-center justify-center gap-3 border-t bg-background/90 px-4 py-2 backdrop-blur-sm">
					<span className="text-sm text-muted-foreground">
						Page {currentPage} of {numPages}
					</span>
					<form onSubmit={handleJump} className="flex items-center gap-1.5">
						<input
							type="number"
							min={1}
							max={numPages}
							value={jumpInput}
							onChange={(e) => setJumpInput(e.target.value)}
							placeholder="Go to…"
							className="h-7 w-20 rounded-md border bg-transparent px-2 text-center text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
						/>
					</form>
				</div>
			)}
		</div>
	)
}
