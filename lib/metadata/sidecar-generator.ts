import { createHash } from 'node:crypto'
import { detectDocumentType } from './document-type-detector'
import { extractEntities } from './entity-extractor'
import { extractHeadings } from './heading-extractor'
import { MEXICAN_LEGAL_REGEX } from './mexican-legal-regex'
import { buildNavigation } from './navigation-builder'
import type { Sidecar } from './types'

/** Generate a deterministic JSON sidecar from markdown content. No LLM calls. */
export function generateSidecar(markdown: string, sourceFile: string): Sidecar {
	const lines = markdown.split('\n')
	const documentType = detectDocumentType(markdown)
	const tableOfContents = extractHeadings(markdown)
	const entities = extractEntities(markdown)
	const navigation = buildNavigation(markdown, tableOfContents, documentType)

	const firstHeading = tableOfContents[0]?.heading
	const title =
		firstHeading ??
		lines.find((l) => l.trim())?.replace(/^#+\s*/, '') ??
		sourceFile

	const sidecar: Sidecar = {
		schemaVersion: '1.0.0',
		generatedAt: new Date().toISOString(),
		sourceFile,
		sourceHash: createHash('sha256')
			.update(markdown)
			.digest('hex')
			.slice(0, 16),
		document: {
			title,
			type: documentType,
			totalLines: lines.length,
			totalWords: markdown.split(/\s+/).filter(Boolean).length,
			language: 'es',
		},
		tableOfContents,
		entities,
		navigation,
		legalPatterns: {
			regexLibrary: Object.fromEntries(
				Object.entries(MEXICAN_LEGAL_REGEX).map(([k, v]) => [k, v]),
			),
		},
	}

	return sidecar
}
