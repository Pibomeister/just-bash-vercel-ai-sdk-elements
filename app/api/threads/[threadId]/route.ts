import * as mastraClient from '@/lib/mastra-client'

// ---------------------------------------------------------------------------
// DELETE /api/threads/:threadId — delete with ownership validation
// ---------------------------------------------------------------------------

export async function DELETE(
	req: Request,
	{ params }: { params: Promise<{ threadId: string }> },
) {
	const { threadId } = await params
	const { searchParams } = new URL(req.url)
	const resourceId = searchParams.get('resourceId')

	if (!resourceId) {
		return new Response('Missing resourceId', { status: 400 })
	}

	try {
		const thread = await mastraClient.getThreadById({ threadId })

		if (!thread) {
			return new Response('Thread not found', { status: 404 })
		}

		if (thread.resourceId !== resourceId) {
			return new Response('Forbidden', { status: 403 })
		}

		await mastraClient.deleteThread({ threadId })

		return Response.json({ success: true })
	} catch (err) {
		console.error('[threads] deleteThread failed:', err)
		return new Response('Internal server error', { status: 500 })
	}
}
