'use client'

import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import { useMemo } from 'react'
import {
	TransformComponent,
	TransformWrapper,
	useControls,
} from 'react-zoom-pan-pinch'
import { Button } from '@/components/ui/button'
import { base64ToDataUri, getMimeType, isBase64Content } from '@/lib/file-types'

function Controls() {
	const { zoomIn, zoomOut, resetTransform } = useControls()

	return (
		<div className="flex items-center gap-1 p-2">
			<Button variant="outline" size="sm" onClick={() => zoomIn()}>
				<ZoomIn className="size-4" />
			</Button>
			<Button variant="outline" size="sm" onClick={() => zoomOut()}>
				<ZoomOut className="size-4" />
			</Button>
			<Button variant="outline" size="sm" onClick={() => resetTransform()}>
				<RotateCcw className="size-4" />
			</Button>
		</div>
	)
}

export function ImageRenderer({
	content,
	filepath,
	compact,
}: {
	content: string
	filepath: string
	compact?: boolean
}) {
	const src = useMemo(() => {
		if (isBase64Content(content)) {
			return base64ToDataUri(content, getMimeType(filepath))
		}
		// Non-base64 content (e.g. SVG source)
		return `data:image/svg+xml;utf8,${encodeURIComponent(content)}`
	}, [content, filepath])

	if (compact) {
		return (
			// eslint-disable-next-line @next/next/no-img-element
			<img
				src={src}
				alt={filepath.split('/').pop() ?? 'Image'}
				className="max-h-[200px] w-auto object-contain"
			/>
		)
	}

	return (
		<TransformWrapper>
			<Controls />
			<TransformComponent
				wrapperClass="!w-full"
				contentClass="!w-full flex items-center justify-center"
			>
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={src}
					alt={filepath.split('/').pop() ?? 'Image'}
					className="max-h-[85vh] max-w-full object-contain"
				/>
			</TransformComponent>
		</TransformWrapper>
	)
}
