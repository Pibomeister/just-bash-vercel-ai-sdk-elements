import { MEXICAN_LEGAL_REGEX } from './mexican-legal-regex'

export type DocumentType = 'contrato' | 'ley' | 'sentencia' | 'nom' | 'otro'

interface Signal {
	pattern: RegExp
	weight: number
}

const SIGNALS: Record<DocumentType, Signal[]> = {
	ley: [
		{ pattern: new RegExp(MEXICAN_LEGAL_REGEX.titulos, 'i'), weight: 3 },
		{ pattern: new RegExp(MEXICAN_LEGAL_REGEX.capitulos, 'i'), weight: 2 },
		{
			pattern: new RegExp(MEXICAN_LEGAL_REGEX.articlesOcrAware, 'i'),
			weight: 2,
		},
		{ pattern: new RegExp(MEXICAN_LEGAL_REGEX.transitorios, 'i'), weight: 2 },
		{ pattern: /\bLEY\b/i, weight: 3 },
		{ pattern: /\bCÓDIGO\b/i, weight: 3 },
		{ pattern: /\bREGLAMENTO\b/i, weight: 2 },
	],
	contrato: [
		{ pattern: new RegExp(MEXICAN_LEGAL_REGEX.clausulas, 'i'), weight: 4 },
		{ pattern: /\bCONTRATO\b/i, weight: 3 },
		{ pattern: /\bCONVENIO\b/i, weight: 3 },
		{ pattern: /en lo sucesivo/i, weight: 3 },
		{ pattern: /DECLARACIONES/i, weight: 2 },
		{ pattern: new RegExp(MEXICAN_LEGAL_REGEX.legalEntities, 'i'), weight: 1 },
	],
	sentencia: [
		{ pattern: new RegExp(MEXICAN_LEGAL_REGEX.considerandos, 'i'), weight: 4 },
		{ pattern: new RegExp(MEXICAN_LEGAL_REGEX.resolutivos, 'i'), weight: 4 },
		{ pattern: /SENTENCIA/i, weight: 3 },
		{ pattern: /JUZGADO|TRIBUNAL/i, weight: 3 },
		{ pattern: /QUEJOSO|DEMANDANTE|ACTOR/i, weight: 2 },
		{ pattern: /RESULTANDO/i, weight: 2 },
		{ pattern: /AMPARO/i, weight: 2 },
	],
	nom: [
		{ pattern: new RegExp(MEXICAN_LEGAL_REGEX.noms), weight: 5 },
		{ pattern: /NORMA OFICIAL MEXICANA/i, weight: 5 },
	],
	otro: [],
}

/** Score text against each document type and return the best match. */
export function detectDocumentType(text: string): DocumentType {
	const preview = text.slice(0, 3000)

	let bestType: DocumentType = 'otro'
	let bestScore = 0

	for (const [type, signals] of Object.entries(SIGNALS) as [
		DocumentType,
		Signal[],
	][]) {
		if (type === 'otro') continue
		let score = 0
		for (const { pattern, weight } of signals) {
			if (pattern.test(preview)) {
				score += weight
			}
		}
		if (score > bestScore) {
			bestScore = score
			bestType = type
		}
	}

	return bestType
}
