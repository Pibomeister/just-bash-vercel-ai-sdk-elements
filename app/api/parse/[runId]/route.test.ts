vi.mock('workflow/api')

import { getRun } from 'workflow/api'
import { GET } from './route'

const req = new Request('http://localhost:3000')

function withParams(runId: string) {
	return { params: Promise.resolve({ runId }) }
}

describe('GET /api/parse/[runId]', () => {
	it('returns completed status with result', async () => {
		vi.mocked(getRun).mockReturnValue({
			status: Promise.resolve('completed'),
			returnValue: Promise.resolve({ markdown: '# Hello' }),
		} as never)

		const res = await GET(req, withParams('run-123'))
		const data = await res.json()

		expect(res.status).toBe(200)
		expect(data).toEqual({
			status: 'completed',
			result: { markdown: '# Hello' },
		})
		expect(getRun).toHaveBeenCalledWith('run-123')
	})

	it('returns failed status with error message', async () => {
		vi.mocked(getRun).mockReturnValue({
			status: Promise.resolve('failed'),
		} as never)

		const res = await GET(req, withParams('run-456'))
		const data = await res.json()

		expect(res.status).toBe(200)
		expect(data).toEqual({
			status: 'failed',
			error: 'Workflow run failed',
		})
	})

	it('returns in-progress status', async () => {
		vi.mocked(getRun).mockReturnValue({
			status: Promise.resolve('running'),
		} as never)

		const res = await GET(req, withParams('run-789'))
		const data = await res.json()

		expect(res.status).toBe(200)
		expect(data).toEqual({ status: 'running' })
	})

	it('returns 500 on exception', async () => {
		vi.mocked(getRun).mockImplementation(() => {
			throw new Error('workflow engine unavailable')
		})

		const res = await GET(req, withParams('bad-run'))
		const data = await res.json()

		expect(res.status).toBe(500)
		expect(data).toEqual({ error: 'Failed to check workflow status' })
	})
})
