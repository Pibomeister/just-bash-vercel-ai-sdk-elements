import path from 'node:path'
import { decodeWithFallback } from '@/lib/encoding'
import { readFileBuffer } from '@/lib/sandbox'

const SANDBOX_ROOT = '/documents'

const BINARY_EXTENSIONS = new Set([
	'pdf',
	'docx',
	'xlsx',
	'xls',
	'png',
	'jpg',
	'jpeg',
	'gif',
	'webp',
	'bmp',
	'ico',
])

function isBinaryFile(filePath: string): boolean {
	const ext = path.posix.extname(filePath).slice(1).toLowerCase()
	return BINARY_EXTENSIONS.has(ext)
}

export async function POST(req: Request) {
	let body: { path?: unknown }
	try {
		body = await req.json()
	} catch {
		return Response.json({ error: 'Invalid JSON' }, { status: 400 })
	}

	if (typeof body.path !== 'string' || !body.path) {
		return Response.json({ error: 'Missing or invalid path' }, { status: 400 })
	}

	try {
		// Normalize: strip leading "documents/" prefix that appears when
		// `find /documents` outputs absolute paths and the tree parser
		// drops the leading slash.
		let filePath = body.path
		if (filePath.startsWith('documents/')) {
			filePath = filePath.slice('documents/'.length)
		}

		const resolvedPath = path.posix.resolve(SANDBOX_ROOT, filePath)

		if (isBinaryFile(resolvedPath)) {
			const bytes = await readFileBuffer(resolvedPath)
			const content = Buffer.from(bytes).toString('base64')
			return Response.json({ content })
		}

		const bytes = await readFileBuffer(resolvedPath)
		const content = decodeWithFallback(bytes)
		return Response.json({ content })
	} catch {
		return Response.json({ error: 'File not found' }, { status: 404 })
	}
}
