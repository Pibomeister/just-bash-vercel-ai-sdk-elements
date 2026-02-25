import { start } from 'workflow/api'
import {
	saveUploadedFile,
	updateMetadata,
	validateFileType,
} from '@/lib/document-storage'
import { parseDocumentWorkflow } from '@/workflows/parse-document'

export const maxDuration = 120

export async function POST(request: Request) {
	const formData = await request.formData()
	const file = formData.get('file')

	if (!(file instanceof File)) {
		return Response.json(
			{ error: "Missing file. Expected a multipart 'file' field." },
			{ status: 400 },
		)
	}

	// Validate file type before saving
	const validationError = validateFileType(file.name, file.type)
	if (validationError) {
		return Response.json({ error: validationError }, { status: 400 })
	}

	// Save file to disk and create metadata
	const { documentId, metadata } = await saveUploadedFile(file)

	// Update status to processing before starting the workflow
	await updateMetadata(documentId, { status: 'processing' })

	// Start the durable workflow — it handles LlamaParse upload + polling internally
	let runId: string | undefined
	try {
		const run = await start(parseDocumentWorkflow, [
			documentId,
			metadata.originalName,
		])
		runId = run.runId
		await updateMetadata(documentId, { workflowRunId: run.runId })
	} catch {
		await updateMetadata(documentId, {
			status: 'failed',
			error: 'Failed to start parsing workflow',
		})
		return Response.json(
			{ error: 'Failed to start parsing workflow' },
			{ status: 500 },
		)
	}

	return Response.json({
		documentId,
		fileName: metadata.originalName,
		runId,
		status: 'processing',
	})
}
