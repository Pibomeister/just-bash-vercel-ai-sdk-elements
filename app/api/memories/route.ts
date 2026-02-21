import * as mastraClient from '@/lib/mastra-client'

// ---------------------------------------------------------------------------
// GET /api/memories — paginated observation listing
// ---------------------------------------------------------------------------

export async function GET(req: Request) {
	const { searchParams } = new URL(req.url)
	const threadId = searchParams.get('threadId')
	const resourceId = searchParams.get('resourceId')
	const limitParam = searchParams.get('limit')
	const limit = limitParam ? Number.parseInt(limitParam, 10) : 50

	if (!threadId || !resourceId) {
		return new Response('Missing threadId or resourceId', { status: 400 })
	}

	try {
		// Return stored messages as memory items for inspection
		const messages = await mastraClient.getMessages({
			threadId,
			limit: limit > 0 ? limit : 50,
		})

		// Filter out items that have been soft-deleted via metadata
		const activeMessages = messages.filter((m) => {
			const meta = m.content.metadata as { status?: string } | undefined
			return meta?.status !== 'deleted'
		})

		return Response.json({
			items: activeMessages,
			totalApprox: activeMessages.length,
		})
	} catch (err) {
		console.error('[memories] listMessages failed:', err)
		return new Response('Internal server error', { status: 500 })
	}
}
