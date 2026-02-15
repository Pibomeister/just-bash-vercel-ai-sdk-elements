import type { DocumentType } from './document-type-detector'
import type { Navigation, TocEntry } from './types'

const TOPIC_KEYWORDS: Record<string, RegExp> = {
	infracciones: /infracci[oó]n|sanci[oó]n|multa|decomiso/i,
	importacion: /importaci[oó]n|aduana|despacho/i,
	exportacion: /exportaci[oó]n/i,
	obligaciones: /obligaci[oó]n|deber|cumplimiento/i,
	confidencialidad: /confidencial|secreto|reserv/i,
	jurisdiccion: /jurisdicci[oó]n|competencia|tribunal/i,
	pago: /pago|contrapresta|honorario|remuner/i,
	vigencia: /vigencia|plazo|t[eé]rmino|duraci[oó]n/i,
	objeto: /objeto|prop[oó]sito|finalidad/i,
	definiciones: /definici[oó]n|glosario|conceptos/i,
}

export function buildNavigation(
	markdown: string,
	toc: TocEntry[],
	documentType: DocumentType,
): Navigation {
	const lines = markdown.split('\n')
	const warnings = detectDocumentHazards(lines)
	const quickCommands = buildQuickCommands(documentType)
	const sectionsByTopic = classifySectionsByTopic(toc, lines)

	return { warnings, quickCommands, sectionsByTopic }
}

function detectDocumentHazards(lines: string[]): Record<string, string> {
	const warnings: Record<string, string> = {}

	const hasOcrOrdinals = lines.some((l) => /ARTICULO\s+\d0\./.test(l))
	if (hasOcrOrdinals) {
		warnings.ocr_ordinals =
			"The ordinal 'o.' was OCR'd as '0.'. " +
			'Article 1o = ARTICULO 10., Article 2o = ARTICULO 20. ' +
			'The readArticle quickCommand handles this automatically.'
	}

	const transitorioLine = lines.findIndex((l) =>
		/^(?:TRANSITORIOS|ART[IÍ]CULOS?\s+TRANSITORIOS)/i.test(l.trim()),
	)
	if (transitorioLine > 0) {
		const ratio = (lines.length - transitorioLine) / lines.length
		if (ratio > 0.2) {
			warnings.transitorios_noise =
				`${Math.round(ratio * 100)}% of document (from line ${transitorioLine + 1}) ` +
				'is Transitorios/historical decrees. These are NOT current law.'
		}
	}

	const annexLine = lines.findIndex((l) =>
		/^ANEXO\s+\d+\s+DE\s+LAS\s+REGLAS\s+GENERALES/i.test(l.trim()),
	)
	if (annexLine > 0) {
		warnings.outdated_fines =
			'Fine amounts in article text may be outdated. ' +
			`The updated amounts are in the Annex section starting at line ${annexLine + 1}. ` +
			'Use findUpdatedFines quickCommand instead.'
	}

	return warnings
}

function buildQuickCommands(
	documentType: DocumentType,
): Record<string, string> {
	const commands: Record<string, string> = {}

	commands.listSections = `jq '.tableOfContents[] | {id, heading, lineStart, lineEnd, isTransitoryOrAnnex}' metadata.json`

	if (documentType === 'ley') {
		commands.readArticle = `grep -n -E 'ART[IÍ]CULO\\s+{N}[oO0]?\\.' content.md | head -5`
		commands.findUpdatedFines = `grep -A2 'Art.*{N}' content.md | grep -E '\\$[\\d,]+'`
		commands.skipTransitorios = `jq '.tableOfContents[] | select(.isTransitoryOrAnnex == false)' metadata.json`
	}

	if (documentType === 'contrato') {
		commands.readClause = `grep -n -E 'CLÁUSULA.*{NAME}' content.md`
		commands.listParties = `jq '.document.parties' metadata.json`
	}

	if (documentType === 'sentencia') {
		commands.readConsiderando = `grep -n -A50 'CONSIDERANDO.*{N}' content.md`
		commands.readResolutivo = `grep -n -A20 'RESUELVE' content.md`
	}

	return commands
}

function classifySectionsByTopic(
	toc: TocEntry[],
	lines: string[],
): Record<string, { sections: string[]; lineRange: [number, number] }> {
	const topics: Record<
		string,
		{ sections: string[]; lineRange: [number, number] }
	> = {}

	for (const entry of toc) {
		if (entry.isTransitoryOrAnnex) continue
		const sectionContent = lines
			.slice(entry.lineStart - 1, entry.lineEnd)
			.join(' ')

		for (const [topic, pattern] of Object.entries(TOPIC_KEYWORDS)) {
			if (pattern.test(sectionContent) || pattern.test(entry.heading)) {
				if (!topics[topic]) {
					topics[topic] = {
						sections: [],
						lineRange: [entry.lineStart, entry.lineEnd],
					}
				}
				topics[topic].sections.push(entry.id)
				topics[topic].lineRange = [
					Math.min(topics[topic].lineRange[0], entry.lineStart),
					Math.max(topics[topic].lineRange[1], entry.lineEnd),
				]
			}
		}
	}

	return topics
}
