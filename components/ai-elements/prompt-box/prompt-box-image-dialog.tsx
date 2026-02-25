'use client'

import { XIcon } from 'lucide-react'
import { VisuallyHidden } from 'radix-ui'
import {
	Dialog,
	DialogClose,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { usePromptBoxContext } from './prompt-box-context'

export type PromptBoxImageDialogProps = {
	className?: string
}

export const PromptBoxImageDialog = ({
	className,
}: PromptBoxImageDialogProps) => {
	const { previewImage, setPreviewImage } = usePromptBoxContext()

	return (
		<Dialog
			open={previewImage !== null}
			onOpenChange={(open) => {
				if (!open) setPreviewImage(null)
			}}
		>
			<DialogPortal>
				<DialogOverlay className="backdrop-blur-sm bg-black/70" />
				<div
					className={cn(
						'fixed inset-0 z-50 flex items-center justify-center p-8',
						className,
					)}
				>
					<DialogClose className="absolute top-4 right-4 z-50 flex size-10 items-center justify-center rounded-full bg-zinc-800/80 text-zinc-400 transition-colors hover:text-zinc-200">
						<XIcon className="size-5" />
						<span className="sr-only">Close</span>
					</DialogClose>
					{previewImage && (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={previewImage}
							alt="Preview"
							className="max-h-[85vh] max-w-full object-contain rounded-lg animate-scale-in-image"
						/>
					)}
					<VisuallyHidden.Root>
						<DialogTitle>Image preview</DialogTitle>
					</VisuallyHidden.Root>
				</div>
			</DialogPortal>
		</Dialog>
	)
}
