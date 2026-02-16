import path from 'node:path'
import { list } from '@vercel/blob'
import type { BashToolkit } from 'bash-tool'
import { createBashTool } from 'bash-tool'
import { Bash, InMemoryFs, MountableFs, OverlayFs } from 'just-bash'
import { getStorageBackend } from '@/lib/document-storage'
import { decodeWithFallback } from '@/lib/encoding'

// Module-level singleton: persists across requests so the sandbox filesystem
// carries state between conversation turns. If creation fails, the cached
// promise is cleared so the next request can retry.
let toolkitPromise: Promise<BashToolkit> | null = null
let bashInstance: Bash | null = null

/**
 * Hydrate an InMemoryFs by fetching all .md and .json files from Vercel Blob.
 * Handles pagination via cursor. Files are written at /documents/{id}/...
 * paths within the InMemoryFs.
 */
export async function hydrateFromBlob(memFs: InMemoryFs): Promise<void> {
	let cursor: string | undefined

	do {
		const result = await list({
			prefix: 'documents/',
			...(cursor ? { cursor } : {}),
		})

		for (const blob of result.blobs) {
			// Only hydrate .md and .json files
			if (!blob.pathname.endsWith('.md') && !blob.pathname.endsWith('.json')) {
				continue
			}

			try {
				const response = await fetch(blob.url)
				if (!response.ok) continue
				const content = await response.text()

				// Ensure parent directory exists in InMemoryFs
				const filePath = `/${blob.pathname}`
				const dir = filePath.substring(0, filePath.lastIndexOf('/'))
				await mkdirRecursive(memFs, dir)
				await memFs.writeFile(filePath, content)
			} catch {
				// Skip files that fail to fetch — resilience for partial availability
			}
		}

		cursor = result.hasMore ? result.cursor : undefined
	} while (cursor)
}

/**
 * Recursively create directories in an InMemoryFs.
 * InMemoryFs may not support recursive mkdir, so we create each segment.
 */
async function mkdirRecursive(
	memFs: InMemoryFs,
	dirPath: string,
): Promise<void> {
	const segments = dirPath.split('/').filter(Boolean)
	let current = ''
	for (const segment of segments) {
		current += `/${segment}`
		try {
			await memFs.mkdir(current)
		} catch {
			// Directory may already exist
		}
	}
}

export function getToolkit(): Promise<BashToolkit> {
	if (!toolkitPromise) {
		const backend = getStorageBackend()

		if (backend === 'blob') {
			// Blob path: hydrate InMemoryFs from Vercel Blob storage
			const blobMemFs = new InMemoryFs()
			const p = hydrateFromBlob(blobMemFs).then(() => {
				const fs = new MountableFs({ base: new InMemoryFs() })
				fs.mount('/documents', blobMemFs)

				const bash = new Bash({ fs, cwd: '/documents', python: true })
				bashInstance = bash

				return createBashTool({
					sandbox: bash,
					destination: '/documents',
				})
			})

			toolkitPromise = p.catch((err) => {
				toolkitPromise = null
				bashInstance = null
				throw err
			})
		} else {
			// Local path: existing OverlayFs behavior (unchanged)
			const uploadsDir = path.resolve(process.env.UPLOADS_DIR || 'uploads')

			// OverlayFs reads from the local uploads/ directory on disk.
			// readOnly: true prevents writes to the real filesystem.
			// maxFileReadSize: 0 removes the 10MB default limit — large markdown
			// files from 50+ page PDFs converted by LlamaParse need this.
			const overlay = new OverlayFs({
				root: uploadsDir,
				readOnly: true,
				maxFileReadSize: 0,
			})

			// Wrap readFile to handle Latin-1 / Windows-1252 encoded files.
			// PDF-extracted markdown for Spanish documents may contain Latin-1
			// bytes that corrupt when decoded as UTF-8.
			const originalReadFile = overlay.readFile.bind(overlay)
			overlay.readFile = async (filePath, options?) => {
				if (options) return originalReadFile(filePath, options)
				const bytes = await overlay.readFileBuffer(filePath)
				return decodeWithFallback(bytes)
			}

			// MountableFs allows mounting OverlayFs at a specific path.
			// The base is InMemoryFs for any writes the agent makes.
			const fs = new MountableFs({ base: new InMemoryFs() })
			fs.mount('/documents', overlay)

			// Bash instance uses the composite filesystem
			const bash = new Bash({ fs, cwd: '/documents', python: true })
			bashInstance = bash

			const p = createBashTool({
				sandbox: bash,
				destination: '/documents',
			})

			// Clear the cache on failure so the next request retries
			toolkitPromise = p.catch((err) => {
				toolkitPromise = null
				bashInstance = null
				throw err
			})
		}
	}
	return toolkitPromise
}

/**
 * Read a file as raw bytes. Used for binary files (PDF, images, DOCX, etc.)
 * where UTF-8 decoding would corrupt the data.
 */
export async function readFileBuffer(filePath: string): Promise<Uint8Array> {
	await getToolkit()
	return bashInstance!.fs.readFileBuffer(filePath)
}
