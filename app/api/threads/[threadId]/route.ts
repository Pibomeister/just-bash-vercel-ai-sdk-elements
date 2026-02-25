import * as mastraClient from '@/lib/mastra-client'
import { requireResourceId } from '@/lib/resource-id'

// ---------------------------------------------------------------------------
// DELETE /api/threads/:threadId — delete with ownership validation
// ---------------------------------------------------------------------------

export async function DELETE(
	_req: Request,
	{ params }: { params: Promise<{ threadId: string }> },
) {
	const { threadId } = await params

	// Derive resourceId from signed cookie — never trust query params
	const { resourceId } = await requireResourceId()

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
