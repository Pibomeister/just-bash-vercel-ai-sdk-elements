import { getRun } from 'workflow/api'

export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ runId: string }> },
) {
	const { runId } = await params

	try {
		const run = getRun(runId)
		const status = await run.status

		if (status === 'completed') {
			const result = await run.returnValue
			return Response.json({ status: 'completed', result })
		}

		if (status === 'failed') {
			return Response.json({
				status: 'failed',
				error: 'Workflow run failed',
			})
		}

		return Response.json({ status: status })
	} catch {
		return Response.json(
			{ error: 'Failed to check workflow status' },
			{ status: 500 },
		)
	}
}
