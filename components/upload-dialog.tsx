'use client'

import {
	AlertCircle as AlertIcon,
	CheckCircle2 as CheckIcon,
	Loader2 as LoaderIcon,
	Upload as UploadIcon,
} from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type UploadState = 'idle' | 'uploading' | 'processing' | 'completed' | 'error'

interface UploadResult {
	documentId: string
	fileName: string
	runId?: string
}

interface UploadDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onUploadComplete?: (result: UploadResult) => void
}

export function UploadDialog({
	open,
	onOpenChange,
	onUploadComplete,
}: UploadDialogProps) {
	const [state, setState] = useState<UploadState>('idle')
	const [error, setError] = useState<string | null>(null)
	const [fileName, setFileName] = useState<string | null>(null)
	const [isDragOver, setIsDragOver] = useState(false)
	const fileInputRef = useRef<HTMLInputElement>(null)

	const resetState = useCallback(() => {
		setState('idle')
		setError(null)
		setFileName(null)
		setIsDragOver(false)
	}, [])

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			if (!nextOpen) resetState()
			onOpenChange(nextOpen)
		},
		[onOpenChange, resetState],
	)

	const uploadFile = useCallback(
		async (file: File) => {
			// Validate file type client-side
			const ext = file.name.split('.').pop()?.toLowerCase()
			if (ext !== 'pdf' && ext !== 'docx') {
				setError('Only .pdf and .docx files are supported.')
				setState('error')
				return
			}

			// Validate size client-side (100MB)
			if (file.size > 100 * 1024 * 1024) {
				setError('File exceeds 100MB limit.')
				setState('error')
				return
			}

			setFileName(file.name)
			setState('uploading')
			setError(null)

			try {
				const formData = new FormData()
				formData.append('file', file)

				const res = await fetch('/api/upload', {
					method: 'POST',
					body: formData,
				})

				if (!res.ok) {
					const data = await res
						.json()
						.catch(() => ({ error: 'Upload failed' }))
					throw new Error(data.error || `Upload failed (${res.status})`)
				}

				const result = (await res.json()) as {
					documentId: string
					fileName: string
					runId?: string
					status: string
				}

				setState('processing')

				// Poll workflow status
				if (result.runId) {
					const maxPolls = 120
					for (let i = 0; i < maxPolls; i++) {
						await new Promise((r) => setTimeout(r, 5000))
						const pollRes = await fetch(`/api/parse/${result.runId}`)
						if (!pollRes.ok) continue
						const pollData = (await pollRes.json()) as {
							status: string
							error?: string
						}
						if (pollData.status === 'completed') {
							setState('completed')
							onUploadComplete?.({
								documentId: result.documentId,
								fileName: result.fileName,
								runId: result.runId,
							})
							return
						}
						if (pollData.status === 'failed') {
							throw new Error(pollData.error || 'Document processing failed')
						}
					}
					throw new Error(
						'Document processing timed out. Please try again with a smaller file.',
					)
				} else {
					// No workflow runId — mark as completed (manual poll needed)
					setState('completed')
					onUploadComplete?.({
						documentId: result.documentId,
						fileName: result.fileName,
					})
				}
			} catch (err) {
				setError(
					err instanceof Error ? err.message : 'An unexpected error occurred',
				)
				setState('error')
			}
		},
		[onUploadComplete],
	)

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault()
			setIsDragOver(false)
			const file = e.dataTransfer.files[0]
			if (file) uploadFile(file)
		},
		[uploadFile],
	)

	const handleFileChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0]
			if (file) uploadFile(file)
			// Reset input so the same file can be re-selected
			e.target.value = ''
		},
		[uploadFile],
	)

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent data-slot="upload-dialog" className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Upload Document</DialogTitle>
					<DialogDescription>
						Upload a PDF or DOCX file to make it searchable by the AI agent.
					</DialogDescription>
				</DialogHeader>

				{state === 'idle' && (
					<button
						type="button"
						data-slot="upload-dropzone"
						className={cn(
							'flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed bg-transparent p-8 transition-colors cursor-pointer',
							isDragOver
								? 'border-primary bg-primary/5'
								: 'border-muted-foreground/25 hover:border-muted-foreground/50',
						)}
						onDragOver={(e) => {
							e.preventDefault()
							setIsDragOver(true)
						}}
						onDragLeave={() => setIsDragOver(false)}
						onDrop={handleDrop}
						onClick={() => fileInputRef.current?.click()}
					>
						<UploadIcon className="size-8 text-muted-foreground" />
						<div className="text-center">
							<p className="text-sm font-medium">
								Drop a file here or click to browse
							</p>
							<p className="text-xs text-muted-foreground mt-1">
								.pdf and .docx files up to 100MB
							</p>
						</div>
						<input
							ref={fileInputRef}
							type="file"
							accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
							className="hidden"
							onChange={handleFileChange}
						/>
					</button>
				)}

				{state === 'uploading' && (
					<div
						data-slot="upload-progress"
						className="flex flex-col items-center gap-3 py-8"
					>
						<LoaderIcon className="size-8 animate-spin text-primary" />
						<div className="text-center">
							<p className="text-sm font-medium">Uploading {fileName}...</p>
							<p className="text-xs text-muted-foreground mt-1">
								Sending file to LlamaParse
							</p>
						</div>
					</div>
				)}

				{state === 'processing' && (
					<div
						data-slot="upload-processing"
						className="flex flex-col items-center gap-3 py-8"
					>
						<LoaderIcon className="size-8 animate-spin text-primary" />
						<div className="text-center">
							<p className="text-sm font-medium">Processing {fileName}...</p>
							<p className="text-xs text-muted-foreground mt-1">
								Converting to searchable format. This may take a few minutes.
							</p>
						</div>
					</div>
				)}

				{state === 'completed' && (
					<div
						data-slot="upload-completed"
						className="flex flex-col items-center gap-3 py-8"
					>
						<CheckIcon className="size-8 text-green-500" />
						<div className="text-center">
							<p className="text-sm font-medium">
								{fileName} uploaded successfully
							</p>
							<p className="text-xs text-muted-foreground mt-1">
								The document is now searchable by the AI agent.
							</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={() => handleOpenChange(false)}
						>
							Close
						</Button>
					</div>
				)}

				{state === 'error' && (
					<div
						data-slot="upload-error"
						className="flex flex-col items-center gap-3 py-8"
					>
						<AlertIcon className="size-8 text-destructive" />
						<div className="text-center">
							<p className="text-sm font-medium">Upload failed</p>
							<p className="text-xs text-destructive mt-1">{error}</p>
						</div>
						<Button variant="outline" size="sm" onClick={resetState}>
							Try again
						</Button>
					</div>
				)}
			</DialogContent>
		</Dialog>
	)
}
