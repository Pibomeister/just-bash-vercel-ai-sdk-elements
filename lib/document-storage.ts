import { randomUUID } from 'node:crypto'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { DocumentMetadata } from '@/lib/types/documents'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100 MB

const ACCEPTED_EXTENSIONS = new Set(['.pdf', '.docx'])
const ACCEPTED_MIME_TYPES = new Set([
	'application/pdf',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

function getUploadsDir(): string {
	return path.resolve(process.env.UPLOADS_DIR || 'uploads')
}

function getDocumentDir(documentId: string): string {
	if (!/^[\w-]+$/.test(documentId)) {
		throw new Error(`Invalid documentId format: ${documentId}`)
	}
	return path.join(getUploadsDir(), documentId)
}

export function getMarkdownPath(documentId: string): string {
	return path.join(getDocumentDir(documentId), 'content.md')
}

export function getSidecarPath(documentId: string): string {
	return path.join(getDocumentDir(documentId), 'sidecar.json')
}

export async function saveSidecar(
	documentId: string,
	sidecar: Record<string, unknown>,
): Promise<string> {
	const sidecarPath = getSidecarPath(documentId)
	await writeFile(sidecarPath, JSON.stringify(sidecar, null, 2), 'utf-8')
	await updateMetadata(documentId, { sidecarPath })
	return sidecarPath
}

function getMetadataPath(documentId: string): string {
	return path.join(getDocumentDir(documentId), 'metadata.json')
}

function getOriginalExtension(mimeType: string): string {
	if (mimeType === 'application/pdf') return '.pdf'
	return '.docx'
}

export function validateFileType(
	fileName: string,
	mimeType: string,
): string | null {
	const ext = path.extname(fileName).toLowerCase()
	if (!ACCEPTED_EXTENSIONS.has(ext)) {
		return 'Only .pdf and .docx files are supported.'
	}
	if (!ACCEPTED_MIME_TYPES.has(mimeType)) {
		return 'Only .pdf and .docx files are supported.'
	}
	return null
}

export async function saveUploadedFile(file: File): Promise<{
	documentId: string
	filePath: string
	metadata: DocumentMetadata
}> {
	const error = validateFileType(file.name, file.type)
	if (error) throw new Error(error)

	const documentId = randomUUID()
	const docDir = getDocumentDir(documentId)
	await mkdir(docDir, { recursive: true })

	// Read file with size validation via stream accumulator
	const reader = file.stream().getReader()
	const chunks: Uint8Array[] = []
	let totalSize = 0

	while (true) {
		const { done, value } = await reader.read()
		if (done) break
		totalSize += value.byteLength
		if (totalSize > MAX_FILE_SIZE) {
			// Clean up partial directory
			await rm(docDir, { recursive: true, force: true })
			throw new Error('File exceeds 100MB limit.')
		}
		chunks.push(value)
	}

	const buffer = Buffer.concat(chunks)
	const ext = getOriginalExtension(file.type)
	const originalFileName = `original${ext}`
	const filePath = path.join(docDir, originalFileName)

	await writeFile(filePath, buffer)

	const metadata: DocumentMetadata = {
		documentId,
		fileName: originalFileName,
		originalName: file.name,
		mimeType: file.type,
		fileSize: buffer.byteLength,
		uploadedAt: new Date().toISOString(),
		status: 'uploading',
	}

	await writeFile(
		getMetadataPath(documentId),
		JSON.stringify(metadata, null, 2),
	)

	return { documentId, filePath, metadata }
}

export async function updateMetadata(
	documentId: string,
	updates: Partial<DocumentMetadata>,
): Promise<DocumentMetadata> {
	const existing = await getDocumentMetadata(documentId)
	const updated = { ...existing, ...updates }
	await writeFile(getMetadataPath(documentId), JSON.stringify(updated, null, 2))
	return updated
}

export async function saveMarkdown(
	documentId: string,
	markdown: string,
): Promise<string> {
	const mdPath = getMarkdownPath(documentId)
	await writeFile(mdPath, markdown, 'utf-8')
	await updateMetadata(documentId, { status: 'completed' })
	return mdPath
}

export async function getDocumentMetadata(
	documentId: string,
): Promise<DocumentMetadata> {
	const raw = await readFile(getMetadataPath(documentId), 'utf-8')
	return JSON.parse(raw) as DocumentMetadata
}

export async function getOriginalFile(
	documentId: string,
): Promise<{ buffer: Buffer; metadata: DocumentMetadata }> {
	const metadata = await getDocumentMetadata(documentId)
	const filePath = path.join(getDocumentDir(documentId), metadata.fileName)
	const buffer = await readFile(filePath)
	return { buffer, metadata }
}

export async function listDocuments(): Promise<DocumentMetadata[]> {
	const uploadsDir = getUploadsDir()
	let entries: string[]
	try {
		entries = await readdir(uploadsDir)
	} catch {
		return []
	}

	const results: DocumentMetadata[] = []
	for (const entry of entries) {
		try {
			const meta = await getDocumentMetadata(entry)
			results.push(meta)
		} catch {
			// Skip directories without valid metadata
		}
	}

	return results.sort(
		(a, b) =>
			new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
	)
}

export async function deleteDocument(documentId: string): Promise<void> {
	const docDir = getDocumentDir(documentId)
	await rm(docDir, { recursive: true, force: true })
}
