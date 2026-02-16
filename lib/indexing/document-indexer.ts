import { createClient } from '@/lib/indexing/pipeline-manager'
import type { IndexDocumentParams } from '@/lib/indexing/types'
import type { DocumentMetadata } from '@/lib/types/documents'

export function buildMetadata(
	sidecar: Record<string, unknown> | null,
	docMeta: DocumentMetadata,
): Record<string, unknown> {
	const meta: Record<string, unknown> = {
		documentId: docMeta.documentId,
		originalName: docMeta.originalName,
		mimeType: docMeta.mimeType,
		uploadedAt: docMeta.uploadedAt,
	}

	if (sidecar) {
		const doc = sidecar.document as Record<string, unknown> | undefined
		if (doc) {
			meta.documentType = doc.type
			meta.title = doc.title
			meta.totalLines = doc.totalLines
			meta.totalWords = doc.totalWords
			if (doc.parties) meta.parties = JSON.stringify(doc.parties)
		}
	}

	return meta
}

export async function indexDocument(
	pipelineId: string,
	params: IndexDocumentParams,
): Promise<void> {
	const client = createClient()
	await client.pipelines.documents.upsert(pipelineId, {
		body: [
			{
				text: params.text,
				id: params.documentId,
				metadata: params.metadata ?? {},
			},
		],
	})
}

export async function removeDocument(
	pipelineId: string,
	documentId: string,
): Promise<void> {
	const client = createClient()
	await client.pipelines.documents.delete(documentId, {
		pipeline_id: pipelineId,
	})
}
