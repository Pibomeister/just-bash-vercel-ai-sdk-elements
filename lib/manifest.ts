import { access } from 'node:fs/promises'
import { head } from '@vercel/blob'
import {
	getSidecarPath,
	getStorageBackend,
	listDocuments,
} from '@/lib/document-storage'

export interface ManifestEntry {
	id: string
	name: string
	type: string
	contentFile: string
	sidecarFile: string | null
	status: string
}

export interface Manifest {
	generatedAt: string
	documents: ManifestEntry[]
}

async function hasSidecarLocal(documentId: string): Promise<boolean> {
	try {
		await access(getSidecarPath(documentId))
		return true
	} catch {
		return false
	}
}

async function hasSidecarBlob(documentId: string): Promise<boolean> {
	try {
		await head(`documents/${documentId}/sidecar.json`)
		return true
	} catch {
		return false
	}
}

export async function generateManifest(): Promise<Manifest> {
	const documents = await listDocuments()
	const backend = getStorageBackend()

	const entries: ManifestEntry[] = []

	for (const doc of documents) {
		const hasSidecar =
			backend === 'blob'
				? await hasSidecarBlob(doc.documentId)
				: await hasSidecarLocal(doc.documentId)

		entries.push({
			id: doc.documentId,
			name: doc.originalName,
			type: doc.mimeType,
			contentFile: `documents/${doc.documentId}/content.md`,
			sidecarFile: hasSidecar
				? `documents/${doc.documentId}/sidecar.json`
				: null,
			status: doc.status,
		})
	}

	return {
		generatedAt: new Date().toISOString(),
		documents: entries,
	}
}
