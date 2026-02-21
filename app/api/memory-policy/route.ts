// ---------------------------------------------------------------------------
// POST /api/memory-policy — toggle memory behavior flags
// ---------------------------------------------------------------------------
// In MVP, policy flags are client-managed via localStorage. This endpoint
// validates and acknowledges the policy update. Future versions will
// persist policy server-side per authenticated user.

export async function POST(req: Request) {
	let body: {
		useMemory?: unknown
		updateMemory?: unknown
		temporaryChat?: unknown
	}
	try {
		body = await req.json()
	} catch {
		return new Response('Invalid JSON', { status: 400 })
	}

	const { useMemory, updateMemory, temporaryChat } = body as {
		useMemory?: boolean
		updateMemory?: boolean
		temporaryChat?: boolean
	}

	// Validate boolean fields
	if (
		(useMemory !== undefined && typeof useMemory !== 'boolean') ||
		(updateMemory !== undefined && typeof updateMemory !== 'boolean') ||
		(temporaryChat !== undefined && typeof temporaryChat !== 'boolean')
	) {
		return new Response('Invalid policy flags — must be boolean', {
			status: 400,
		})
	}

	return Response.json({
		success: true,
		policy: {
			useMemory: useMemory ?? true,
			updateMemory: updateMemory ?? true,
			temporaryChat: temporaryChat ?? false,
		},
	})
}
