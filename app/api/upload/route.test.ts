vi.mock('@/lib/document-storage')
vi.mock('workflow/api')
vi.mock('@/workflows/parse-document')

import { start } from 'workflow/api'
import {
	saveUploadedFile,
	updateMetadata,
	validateFileType,
} from '@/lib/document-storage'
import { createFormDataRequest } from '@/test/helpers/mock-request'
import { maxDuration, POST } from './route'

describe('POST /api/upload', () => {
	it('returns 400 when the file field is missing', async () => {
		const formData = new FormData()
		const req = createFormDataRequest(formData)

		const res = await POST(req)
		const data = await res.json()

		expect(res.status).toBe(400)
		expect(data).toEqual({
			error: "Missing file. Expected a multipart 'file' field.",
		})
	})

	it('returns 400 when validateFileType returns an error', async () => {
		vi.mocked(validateFileType).mockReturnValue('Unsupported file type')

		const formData = new FormData()
		formData.append(
			'file',
			new File(['data'], 'test.exe', { type: 'application/octet-stream' }),
		)
		const req = createFormDataRequest(formData)

		const res = await POST(req)
		const data = await res.json()

		expect(res.status).toBe(400)
		expect(data).toEqual({ error: 'Unsupported file type' })
	})

	it('saves file, starts workflow, and returns metadata on success', async () => {
		vi.mocked(validateFileType).mockReturnValue(null)
		vi.mocked(saveUploadedFile).mockResolvedValue({
			documentId: 'doc-123',
			filePath: '/uploads/doc-123/original.pdf',
			metadata: {
				documentId: 'doc-123',
				fileName: 'doc-123.pdf',
				originalName: 'report.pdf',
				mimeType: 'application/pdf',
				fileSize: 2048,
				status: 'uploading',
				uploadedAt: '2026-02-15T00:00:00.000Z',
			},
		})
		vi.mocked(updateMetadata).mockResolvedValue(undefined as never)
		vi.mocked(start).mockResolvedValue({ runId: 'run-456' } as never)

		const formData = new FormData()
		formData.append(
			'file',
			new File(['pdf data'], 'report.pdf', { type: 'application/pdf' }),
		)
		const req = createFormDataRequest(formData)

		const res = await POST(req)
		const data = await res.json()

		expect(res.status).toBe(200)
		expect(data).toEqual({
			documentId: 'doc-123',
			fileName: 'report.pdf',
			runId: 'run-456',
			status: 'processing',
		})
		expect(saveUploadedFile).toHaveBeenCalledOnce()
		expect(updateMetadata).toHaveBeenCalledWith('doc-123', {
			status: 'processing',
		})
	})

	it('returns 500 when workflow start fails', async () => {
		vi.mocked(validateFileType).mockReturnValue(null)
		vi.mocked(saveUploadedFile).mockResolvedValue({
			documentId: 'doc-789',
			filePath: '/uploads/doc-789/original.pdf',
			metadata: {
				documentId: 'doc-789',
				fileName: 'doc-789.pdf',
				originalName: 'notes.pdf',
				mimeType: 'application/pdf',
				fileSize: 512,
				status: 'uploading',
				uploadedAt: '2026-02-15T00:00:00.000Z',
			},
		})
		vi.mocked(updateMetadata).mockResolvedValue(undefined as never)
		vi.mocked(start).mockRejectedValue(new Error('workflow engine unavailable'))

		const formData = new FormData()
		formData.append(
			'file',
			new File(['pdf data'], 'notes.pdf', { type: 'application/pdf' }),
		)
		const req = createFormDataRequest(formData)

		const res = await POST(req)
		const data = await res.json()

		expect(res.status).toBe(500)
		expect(data).toEqual({ error: 'Failed to start parsing workflow' })
		expect(updateMetadata).toHaveBeenCalledWith('doc-789', {
			status: 'failed',
			error: 'Failed to start parsing workflow',
		})
	})

	it('exports maxDuration as 120', () => {
		expect(maxDuration).toBe(120)
	})
})
