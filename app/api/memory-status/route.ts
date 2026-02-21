// ---------------------------------------------------------------------------
// GET /api/memory-status — debug endpoint for OM status
// ---------------------------------------------------------------------------

export async function GET() {
	return Response.json({
		status: 'ok',
		tier: 'messages',
		pendingObservations: 0,
		tokenUsage: {
			messages: 0,
			observations: 0,
			reflections: 0,
		},
		storage: process.env.NODE_ENV === 'production' ? 'postgresql' : 'libsql',
		observationalMemory: {
			enabled: true,
			scope: 'thread',
			model: 'gemini-2.5-flash',
		},
	})
}
