import { listDocuments } from '@/lib/document-storage'

export async function GET() {
	try {
		const documents = await listDocuments()
		const safeDocuments = documents.map((document) => {
			const safeDocument = { ...document }
			delete safeDocument.sidecarPath
			return safeDocument
		})
		return Response.json(safeDocuments)
	} catch (error) {
		// Missing uploads directory on first run is expected — return empty list
		if (error instanceof Error && error.message.includes('ENOENT')) {
			return Response.json([], { status: 200 })
		}
		return Response.json({ error: 'Failed to list documents' }, { status: 500 })
	}
}
