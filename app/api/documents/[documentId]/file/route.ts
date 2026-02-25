import { getOriginalFile } from '@/lib/document-storage'

export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ documentId: string }> },
) {
	const { documentId } = await params
	try {
		const { buffer, metadata } = await getOriginalFile(documentId)
		return new Response(new Uint8Array(buffer), {
			headers: {
				'Content-Type': metadata.mimeType,
				'Content-Disposition': `inline; filename="${metadata.originalName}"`,
				'Content-Length': String(buffer.byteLength),
			},
		})
	} catch {
		return Response.json({ error: 'File not found' }, { status: 404 })
	}
}
