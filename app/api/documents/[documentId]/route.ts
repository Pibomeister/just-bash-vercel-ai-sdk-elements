import { deleteDocument, getDocumentMetadata } from '@/lib/document-storage'

export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ documentId: string }> },
) {
	const { documentId } = await params
	try {
		const metadata = await getDocumentMetadata(documentId)
		const safeMetadata = { ...metadata }
		delete safeMetadata.sidecarPath
		return Response.json(safeMetadata)
	} catch {
		return Response.json({ error: 'Document not found' }, { status: 404 })
	}
}

export async function DELETE(
	_req: Request,
	{ params }: { params: Promise<{ documentId: string }> },
) {
	const { documentId } = await params
	try {
		await deleteDocument(documentId)
		return Response.json({ success: true })
	} catch {
		return Response.json(
			{ error: 'Failed to delete document' },
			{ status: 500 },
		)
	}
}
