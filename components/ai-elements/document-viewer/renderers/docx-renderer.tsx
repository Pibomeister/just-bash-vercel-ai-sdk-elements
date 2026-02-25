'use client'

import mammoth from 'mammoth/mammoth.browser'
import { useEffect, useState } from 'react'
import { Shimmer } from '@/components/ai-elements/shimmer'
import { Badge } from '@/components/ui/badge'
import { base64ToArrayBuffer } from '@/lib/file-types'

export function DocxRenderer({
	content,
}: {
	content: string
	filepath: string
}) {
	const [html, setHtml] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const arrayBuffer = base64ToArrayBuffer(content)

		mammoth
			.convertToHtml({ arrayBuffer })
			.then((result) => {
				setHtml(result.value)
			})
			.catch((err: unknown) => {
				setError(
					err instanceof Error ? err.message : 'Failed to render document',
				)
			})
	}, [content])

	if (error) {
		return (
			<div className="flex items-center justify-center p-8">
				<Badge variant="destructive">{error}</Badge>
			</div>
		)
	}

	if (html === null) {
		return (
			<div className="flex items-center justify-center p-8">
				<Shimmer>Loading document...</Shimmer>
			</div>
		)
	}

	return (
		<div
			className="max-h-[80vh] overflow-auto p-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-3 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_table]:w-full [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2 [&_th]:font-semibold"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: mammoth HTML output is from docx parsing
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	)
}
