export type DocumentStatus = 'uploading' | 'processing' | 'completed' | 'failed'

export interface DocumentMetadata {
	documentId: string
	fileName: string
	originalName: string
	mimeType: string
	fileSize: number
	uploadedAt: string // ISO 8601
	status: DocumentStatus
	llamaJobId?: string
	workflowRunId?: string
	error?: string
	sidecarPath?: string
}

export interface ParseResult {
	documentId: string
	markdownPath: string
	pageCount?: number
}
