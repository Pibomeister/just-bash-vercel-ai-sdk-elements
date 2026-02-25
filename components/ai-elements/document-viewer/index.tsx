'use client'

import { XIcon } from 'lucide-react'
import { Dialog as DialogPrimitive, VisuallyHidden } from 'radix-ui'
import {
	Dialog,
	DialogClose,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useDocumentViewer } from './document-viewer-provider'
import { RendererSwitch } from './renderer-switch'

function ViewerSkeleton() {
	return (
		<div className="space-y-3 p-6">
			<Skeleton className="h-4 w-3/4" />
			<Skeleton className="h-4 w-full" />
			<Skeleton className="h-4 w-5/6" />
			<Skeleton className="h-32 w-full" />
			<Skeleton className="h-4 w-2/3" />
			<Skeleton className="h-4 w-full" />
			<Skeleton className="h-4 w-4/5" />
		</div>
	)
}

export function DocumentViewer() {
	const { isOpen, isLoading, file, close } = useDocumentViewer()

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) close()
			}}
		>
			<DialogPortal>
				<DialogOverlay className="pointer-events-none backdrop-blur-sm bg-black/70" />
				<DialogPrimitive.Content
					className="fixed inset-0 z-50 flex flex-col items-center justify-center p-8 outline-none"
					onInteractOutside={(e) => e.preventDefault()}
					onClick={(e) => {
						if (e.target === e.currentTarget) close()
					}}
				>
					<div className="flex w-full max-w-4xl items-center justify-between mb-2">
						<span className="text-sm text-white/70 font-mono truncate">
							{file?.path}
						</span>
						<DialogClose className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors">
							<XIcon className="size-5" />
						</DialogClose>
					</div>
					<div className="w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden rounded-lg bg-background border">
						<ScrollArea className="flex-1 min-h-0 [&_[data-slot=scroll-area-viewport]>div]:!block">
							{isLoading ? (
								<ViewerSkeleton />
							) : (
								file && (
									<RendererSwitch
										content={file.content}
										filepath={file.path}
										category={file.category}
									/>
								)
							)}
						</ScrollArea>
					</div>
					<VisuallyHidden.Root>
						<DialogTitle>Document viewer</DialogTitle>
					</VisuallyHidden.Root>
				</DialogPrimitive.Content>
			</DialogPortal>
		</Dialog>
	)
}

export {
	DocumentViewerProvider,
	useDocumentViewer,
} from './document-viewer-provider'
export { RendererSwitch } from './renderer-switch'
