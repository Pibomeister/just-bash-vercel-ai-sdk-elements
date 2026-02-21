// ---------------------------------------------------------------------------
// Memory item management routes
// Note: Versioned edits and soft deletes are MVP stubs — full implementation
// requires direct storage access for observation records.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// PATCH /api/memories/:id — versioned edit (MVP: returns stub)
// ---------------------------------------------------------------------------

export async function PATCH() {
	// Not implemented: versioned edits require direct Mastra storage access
	return new Response('Not implemented', { status: 501 })
}

// ---------------------------------------------------------------------------
// DELETE /api/memories/:id — soft delete (MVP: returns stub)
// ---------------------------------------------------------------------------

export async function DELETE() {
	// Not implemented: soft deletes require direct Mastra storage access
	return new Response('Not implemented', { status: 501 })
}
