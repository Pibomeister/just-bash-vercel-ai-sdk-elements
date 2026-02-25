import { randomUUID } from 'node:crypto'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { del, head, list, put } from '@vercel/blob'
import type { DocumentMetadata } from '@/lib/types/documents'

// Security note: All Vercel Blob `put()` calls use `access: 'public'` because
// Vercel Blob does not support private/signed URLs. File downloads are proxied
// through `/api/documents/[id]/file` which can enforce auth checks. The
// `sidecarPath` field in metadata may contain a blob URL and MUST be stripped
// from API responses to avoid leaking internal storage URLs.

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100 MB
const BLOB_PREFIX = 'documents'

export type StorageBackend = 'local' | 'blob'

export function getStorageBackend(): StorageBackend {
	const value = process.env.STORAGE_BACKEND
	if (value === 'blob') return 'blob'
	return 'local'
}

export function validateDocumentId(documentId: string): void {
	if (!/^[\w-]+$/.test(documentId)) {
		throw new Error(`Invalid documentId format: ${documentId}`)
	}
}

function blobPath(documentId: string, fileName: string): string {
	return `${BLOB_PREFIX}/${documentId}/${fileName}`
}

const ACCEPTED_EXTENSIONS = new Set(['.pdf', '.docx'])
const ACCEPTED_MIME_TYPES = new Set([
	'application/pdf',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

function getUploadsDir(): string {
	return path.resolve(process.env.UPLOADS_DIR || 'uploads')
}

function getDocumentDir(documentId: string): string {
	validateDocumentId(documentId)
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
	if (getStorageBackend() === 'blob') {
		const pathname = blobPath(documentId, 'sidecar.json')
		const blob = await put(pathname, JSON.stringify(sidecar, null, 2), {
			access: 'public',
			allowOverwrite: true,
		})
		await updateMetadata(documentId, { sidecarPath: blob.url })
		return blob.url
	}
	const sidecarPath = getSidecarPath(documentId)
	await writeFile(sidecarPath, JSON.stringify(sidecar, null, 2), 'utf-8')
	await updateMetadata(documentId, { sidecarPath })
	return sidecarPath
}

export async function readSidecar(
	documentId: string,
): Promise<Record<string, unknown>> {
	if (getStorageBackend() === 'blob') {
		const pathname = blobPath(documentId, 'sidecar.json')
		const blobMeta = await head(pathname)
		const response = await fetch(blobMeta.url)
		if (!response.ok) {
			throw new Error(
				`Failed to fetch sidecar for ${documentId}: ${response.statusText}`,
			)
		}
		const raw = await response.text()
		return JSON.parse(raw) as Record<string, unknown>
	}

	const raw = await readFile(getSidecarPath(documentId), 'utf-8')
	return JSON.parse(raw) as Record<string, unknown>
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

	// Read file with size validation via stream accumulator
	const reader = file.stream().getReader()
	const chunks: Uint8Array[] = []
	let totalSize = 0

	if (getStorageBackend() === 'blob') {
		while (true) {
			const { done, value } = await reader.read()
			if (done) break
			totalSize += value.byteLength
			if (totalSize > MAX_FILE_SIZE) {
				throw new Error('File exceeds 100MB limit.')
			}
			chunks.push(value)
		}

		const buffer = Buffer.concat(chunks)
		const ext = getOriginalExtension(file.type)
		const originalFileName = `original${ext}`

		const originalBlob = await put(
			blobPath(documentId, originalFileName),
			buffer,
			{ access: 'public', allowOverwrite: true },
		)

		const metadata: DocumentMetadata = {
			documentId,
			fileName: originalFileName,
			originalName: file.name,
			mimeType: file.type,
			fileSize: buffer.byteLength,
			uploadedAt: new Date().toISOString(),
			status: 'uploading',
		}

		await put(
			blobPath(documentId, 'metadata.json'),
			JSON.stringify(metadata, null, 2),
			{ access: 'public', allowOverwrite: true },
		)

		return { documentId, filePath: originalBlob.url, metadata }
	}

	const docDir = getDocumentDir(documentId)
	await mkdir(docDir, { recursive: true })

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

/**
 * Non-atomic read-modify-write: reads existing metadata, merges `updates`, and
 * writes back. All current callers are sequential per document so there is no
 * race condition today. If concurrent access is needed in the future, consider
 * ETag-based optimistic locking (blob) or file locking (local).
 */
export async function updateMetadata(
	documentId: string,
	updates: Partial<DocumentMetadata>,
): Promise<DocumentMetadata> {
	const existing = await getDocumentMetadata(documentId)
	const updated = { ...existing, ...updates }

	if (getStorageBackend() === 'blob') {
		await put(
			blobPath(documentId, 'metadata.json'),
			JSON.stringify(updated, null, 2),
			{ access: 'public', allowOverwrite: true },
		)
		return updated
	}

	await writeFile(getMetadataPath(documentId), JSON.stringify(updated, null, 2))
	return updated
}

export async function saveMarkdown(
	documentId: string,
	markdown: string,
): Promise<string> {
	if (getStorageBackend() === 'blob') {
		const blob = await put(blobPath(documentId, 'content.md'), markdown, {
			access: 'public',
			allowOverwrite: true,
		})
		await updateMetadata(documentId, { status: 'completed' })
		return blob.url
	}

	const mdPath = getMarkdownPath(documentId)
	await writeFile(mdPath, markdown, 'utf-8')
	await updateMetadata(documentId, { status: 'completed' })
	return mdPath
}

export async function getDocumentMetadata(
	documentId: string,
): Promise<DocumentMetadata> {
	if (getStorageBackend() === 'blob') {
		const pathname = blobPath(documentId, 'metadata.json')
		const blobMeta = await head(pathname)
		const response = await fetch(blobMeta.url)
		if (!response.ok) {
			throw new Error(
				`Failed to fetch metadata for ${documentId}: ${response.statusText}`,
			)
		}
		const raw = await response.text()
		return JSON.parse(raw) as DocumentMetadata
	}

	const raw = await readFile(getMetadataPath(documentId), 'utf-8')
	return JSON.parse(raw) as DocumentMetadata
}

export async function getOriginalFile(
	documentId: string,
): Promise<{ buffer: Buffer; metadata: DocumentMetadata }> {
	const metadata = await getDocumentMetadata(documentId)

	if (getStorageBackend() === 'blob') {
		const pathname = blobPath(documentId, metadata.fileName)
		const blobMeta = await head(pathname)
		const response = await fetch(blobMeta.url)
		if (!response.ok) {
			throw new Error(
				`Failed to fetch original file for ${documentId}: ${response.statusText}`,
			)
		}
		const arrayBuffer = await response.arrayBuffer()
		return { buffer: Buffer.from(arrayBuffer), metadata }
	}

	const filePath = path.join(getDocumentDir(documentId), metadata.fileName)
	const buffer = await readFile(filePath)
	return { buffer, metadata }
}

export async function listDocuments(): Promise<DocumentMetadata[]> {
	if (getStorageBackend() === 'blob') {
		// Collect all metadata.json pathnames using paginated list
		const metadataPathnames: string[] = []
		let cursor: string | undefined

		do {
			const result = await list({
				prefix: `${BLOB_PREFIX}/`,
				...(cursor ? { cursor } : {}),
			})
			for (const blob of result.blobs) {
				if (blob.pathname.endsWith('/metadata.json')) {
					metadataPathnames.push(blob.pathname)
				}
			}
			cursor = result.hasMore ? result.cursor : undefined
		} while (cursor)

		const results: DocumentMetadata[] = []
		for (const pathname of metadataPathnames) {
			try {
				const blobMeta = await head(pathname)
				const response = await fetch(blobMeta.url)
				if (!response.ok) continue
				const raw = await response.text()
				results.push(JSON.parse(raw) as DocumentMetadata)
			} catch {
				// Skip blobs with invalid metadata
			}
		}

		return results.sort(
			(a, b) =>
				new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
		)
	}

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
	if (getStorageBackend() === 'blob') {
		validateDocumentId(documentId)
		const prefix = `${BLOB_PREFIX}/${documentId}/`
		let cursor: string | undefined

		do {
			const result = await list({ prefix, ...(cursor ? { cursor } : {}) })
			const urls = result.blobs.map((b) => b.url)
			if (urls.length > 0) {
				await del(urls)
			}
			cursor = result.hasMore ? result.cursor : undefined
		} while (cursor)

		return
	}

	const docDir = getDocumentDir(documentId)
	await rm(docDir, { recursive: true, force: true })
}
