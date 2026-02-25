'use client'

import {
	CopyIcon,
	FileTextIcon,
	ImageIcon,
	Loader2Icon,
	Music2Icon,
	VideoIcon,
	XIcon,
} from 'lucide-react'
import type { ComponentProps } from 'react'
import { useCallback } from 'react'
import { cn } from '@/lib/utils'
import { usePromptBoxContext } from './prompt-box-context'

const typeIcons: Record<string, typeof ImageIcon> = {
	image: ImageIcon,
	video: VideoIcon,
	audio: Music2Icon,
	document: FileTextIcon,
}

const getFileCategory = (mediaType: string) => {
	if (mediaType.startsWith('image/')) return 'image'
	if (mediaType.startsWith('video/')) return 'video'
	if (mediaType.startsWith('audio/')) return 'audio'
	return 'document'
}

const getTypeLabel = (mediaType: string) => {
	const ext = mediaType.split('/')[1]
	if (!ext) return 'FILE'
	return ext.toUpperCase().replace(/^X-/, '')
}

export type PromptBoxFileCardProps = Omit<ComponentProps<'div'>, 'children'> & {
	url: string
	filename: string
	mediaType: string
	textPreview?: string
	isUploading?: boolean
	onRemove?: () => void
	onCopy?: () => void
}

export const PromptBoxFileCard = ({
	url,
	filename,
	mediaType,
	textPreview,
	isUploading,
	onRemove,
	onCopy,
	className,
	...props
}: PromptBoxFileCardProps) => {
	const { setPreviewImage } = usePromptBoxContext()
	const category = getFileCategory(mediaType)
	const TypeIcon = typeIcons[category] ?? FileTextIcon
	const label = getTypeLabel(mediaType)

	const handleClick = useCallback(() => {
		if (category === 'image') {
			setPreviewImage(url)
		}
	}, [category, url, setPreviewImage])

	return (
		// biome-ignore lint/a11y/useSemanticElements: div with interactive content and spread props
		<div
			role="button"
			tabIndex={0}
			className={cn(
				'group relative size-[120px] shrink-0 cursor-pointer overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800',
				className,
			)}
			onClick={handleClick}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()
					handleClick()
				}
			}}
			{...props}
		>
			{/* Content */}
			{category === 'image' ? (
				// eslint-disable-next-line @next/next/no-img-element
				<img src={url} alt={filename} className="size-full object-cover" />
			) : (
				<div className="flex size-full flex-col items-center justify-center gap-2 p-3">
					<TypeIcon className="size-6 text-zinc-600" />
					{textPreview && (
						<p className="line-clamp-4 w-full font-mono text-[7px] leading-tight text-zinc-500">
							{textPreview.slice(0, 100)}
						</p>
					)}
				</div>
			)}

			{/* Badge overlay */}
			<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950/90 to-transparent px-2 pb-2 pt-6">
				<span className="inline-flex items-center gap-1 rounded-full bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
					<TypeIcon className="size-2.5" />
					{label}
				</span>
			</div>

			{/* Hover actions */}
			{!isUploading && (
				<div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
					{onCopy && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation()
								onCopy()
							}}
							className="flex size-6 items-center justify-center rounded-md bg-zinc-800/90 text-zinc-400 hover:text-zinc-200"
						>
							<CopyIcon className="size-3" />
						</button>
					)}
					{onRemove && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation()
								onRemove()
							}}
							className="flex size-6 items-center justify-center rounded-md bg-zinc-800/90 text-zinc-400 hover:text-zinc-200"
						>
							<XIcon className="size-3" />
						</button>
					)}
				</div>
			)}

			{/* Upload spinner */}
			{isUploading && (
				<div className="absolute inset-0 flex items-center justify-center bg-zinc-900/60">
					<Loader2Icon className="size-6 animate-spin text-prompt-box-cyan" />
				</div>
			)}
		</div>
	)
}
