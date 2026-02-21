// ---------------------------------------------------------------------------
// Memory item management routes
// Note: Versioned edits and soft deletes are MVP stubs — full implementation
// requires direct storage access for observation records.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// PATCH /api/memories/:id — versioned edit (MVP: returns stub)
// ---------------------------------------------------------------------------

export async function PATCH(
	req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params

	let body: { text?: unknown }
	try {
		body = await req.json()
	} catch {
		return new Response('Invalid JSON', { status: 400 })
	}

	const { text } = body as { text?: string }

	if (!text || typeof text !== 'string') {
		return new Response('Missing text', { status: 400 })
	}

	// MVP: acknowledge the edit request
	// Full versioning requires direct OM storage access via Mastra internals
	return Response.json({
		id,
		text,
		version: 2,
		status: 'active',
		updatedAt: new Date(),
	})
}

// ---------------------------------------------------------------------------
// DELETE /api/memories/:id — soft delete (MVP: returns stub)
// ---------------------------------------------------------------------------

export async function DELETE(
	_req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params

	// MVP: acknowledge the soft-delete request
	// Full soft-delete requires direct OM storage access via Mastra internals
	return Response.json({ id, status: 'deleted', success: true })
}
