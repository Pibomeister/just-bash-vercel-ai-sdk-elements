'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import { Shimmer } from '@/components/ai-elements/shimmer'
import { base64ToArrayBuffer } from '@/lib/file-types'

const DynamicPDFDocument = dynamic(
	() => import('./pdf-document').then((mod) => mod.PDFDocument),
	{
		ssr: false,
		loading: () => (
			<Shimmer className="h-96 w-full">Loading PDF viewer...</Shimmer>
		),
	},
)

export function PDFRenderer({
	content,
}: {
	content: string
	filepath: string
}) {
	const data = useMemo(() => base64ToArrayBuffer(content), [content])
	return <DynamicPDFDocument data={data} />
}
