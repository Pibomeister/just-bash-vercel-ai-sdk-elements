import type { BundledLanguage } from 'shiki'

export type FileCategory =
	| 'code'
	| 'markdown'
	| 'image'
	| 'pdf'
	| 'docx'
	| 'spreadsheet'
	| 'unknown'

const EXTENSION_TO_CATEGORY: Record<string, FileCategory> = {
	ts: 'code',
	tsx: 'code',
	js: 'code',
	jsx: 'code',
	json: 'code',
	md: 'markdown',
	py: 'code',
	sh: 'code',
	bash: 'code',
	css: 'code',
	html: 'code',
	yml: 'code',
	yaml: 'code',
	toml: 'code',
	sql: 'code',
	rs: 'code',
	go: 'code',
	rb: 'code',
	java: 'code',
	xml: 'code',
	txt: 'code',
	png: 'image',
	jpg: 'image',
	jpeg: 'image',
	gif: 'image',
	svg: 'image',
	webp: 'image',
	bmp: 'image',
	ico: 'image',
	pdf: 'pdf',
	docx: 'docx',
	xlsx: 'spreadsheet',
	xls: 'spreadsheet',
	csv: 'spreadsheet',
}

const EXTENSION_TO_LANGUAGE: Record<string, BundledLanguage> = {
	ts: 'typescript',
	tsx: 'tsx',
	js: 'javascript',
	jsx: 'jsx',
	json: 'json',
	md: 'markdown',
	py: 'python',
	sh: 'shellscript',
	bash: 'shellscript',
	css: 'css',
	html: 'html',
	yml: 'yaml',
	yaml: 'yaml',
	toml: 'toml',
	sql: 'sql',
	rs: 'rust',
	go: 'go',
	rb: 'ruby',
	java: 'java',
	xml: 'xml',
}

const EXTENSION_TO_MIME: Record<string, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	gif: 'image/gif',
	svg: 'image/svg+xml',
	webp: 'image/webp',
	bmp: 'image/bmp',
	ico: 'image/x-icon',
	pdf: 'application/pdf',
	docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	xls: 'application/vnd.ms-excel',
	csv: 'text/csv',
}

function getExtension(filepath: string): string {
	const lastDot = filepath.lastIndexOf('.')
	if (lastDot === -1) return ''
	return filepath.slice(lastDot + 1).toLowerCase()
}

export function detectFileCategory(filepath: string): FileCategory {
	const ext = getExtension(filepath)
	return EXTENSION_TO_CATEGORY[ext] ?? 'unknown'
}

export function detectLanguage(filepath: string): BundledLanguage {
	const ext = getExtension(filepath)
	return EXTENSION_TO_LANGUAGE[ext] ?? 'shellscript'
}

export function getMimeType(filepath: string): string {
	const ext = getExtension(filepath)
	return EXTENSION_TO_MIME[ext] ?? 'application/octet-stream'
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const binary = atob(base64)
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i)
	}
	return bytes.buffer as ArrayBuffer
}

export function base64ToDataUri(base64: string, mimeType: string): string {
	return `data:${mimeType};base64,${base64}`
}

const BASE64_REGEX = /^[A-Za-z0-9+/]*={0,2}$/

export function isBase64Content(content: string): boolean {
	if (content.length < 4) return false
	if (content.includes('\n') || content.includes('\r')) return false
	if (content.length % 4 > 1) return false
	return BASE64_REGEX.test(content)
}
