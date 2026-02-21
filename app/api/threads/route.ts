import * as mastraClient from '@/lib/mastra-client'

// ---------------------------------------------------------------------------
// POST /api/threads — create a new thread
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
	let body: { resourceId?: unknown; title?: unknown }
	try {
		body = await req.json()
	} catch {
		return new Response('Invalid JSON', { status: 400 })
	}

	const { resourceId, title } = body as { resourceId?: string; title?: string }

	if (!resourceId || typeof resourceId !== 'string') {
		return new Response('Missing resourceId', { status: 400 })
	}

	try {
		const thread = await mastraClient.createThread({
			resourceId,
			title: typeof title === 'string' ? title : undefined,
		})

		return Response.json({
			threadId: thread.id,
			createdAt: thread.createdAt,
		})
	} catch (err) {
		console.error('[threads] createThread failed:', err)
		return new Response('Internal server error', { status: 500 })
	}
}

// ---------------------------------------------------------------------------
// GET /api/threads?resourceId=... — list threads for a resource
// ---------------------------------------------------------------------------

export async function GET(req: Request) {
	const { searchParams } = new URL(req.url)
	const resourceId = searchParams.get('resourceId')

	if (!resourceId) {
		return Response.json({ threads: [] })
	}

	try {
		const threads = await mastraClient.getThreads({ resourceId })

		const sorted = [...threads].sort(
			(a, b) =>
				new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
		)

		return Response.json({
			threads: sorted.map((t) => ({
				threadId: t.id,
				title: t.title,
				createdAt: t.createdAt,
				updatedAt: t.updatedAt,
				messageCount: 0,
			})),
		})
	} catch (err) {
		console.error('[threads] listThreads failed:', err)
		return new Response('Internal server error', { status: 500 })
	}
}
