import { MEXICAN_LEGAL_REGEX } from './mexican-legal-regex'
import type { TocEntry } from './types'

const STRUCTURAL_HEADING_RE = new RegExp(
	`^(?:${[
		MEXICAN_LEGAL_REGEX.titulos,
		MEXICAN_LEGAL_REGEX.capitulos,
		MEXICAN_LEGAL_REGEX.clausulas,
		MEXICAN_LEGAL_REGEX.considerandos,
		MEXICAN_LEGAL_REGEX.resolutivos,
		MEXICAN_LEGAL_REGEX.transitorios,
		MEXICAN_LEGAL_REGEX.anexos,
	].join('|')})`,
	'i',
)

const TRANSITORIO_RE = new RegExp(MEXICAN_LEGAL_REGEX.transitorios, 'i')
const ANNEX_RE = new RegExp(MEXICAN_LEGAL_REGEX.anexos, 'i')
const FINES_RE = new RegExp(MEXICAN_LEGAL_REGEX.fines, 'i')

function toKebabCase(text: string): string {
	return text
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 60)
}

export function extractHeadings(markdown: string): TocEntry[] {
	const lines = markdown.split('\n')
	const rawHeadings: { heading: string; level: number; lineStart: number }[] =
		[]

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]

		const mdMatch = line.match(/^(#{1,6})\s+(.+)/)
		if (mdMatch) {
			rawHeadings.push({
				heading: mdMatch[2].trim(),
				level: mdMatch[1].length,
				lineStart: i + 1,
			})
			continue
		}

		const trimmed = line.trim()
		if (trimmed.length > 3 && STRUCTURAL_HEADING_RE.test(trimmed)) {
			rawHeadings.push({
				heading: trimmed,
				level: 2,
				lineStart: i + 1,
			})
		}
	}

	const totalLines = lines.length
	const entries: TocEntry[] = rawHeadings.map((h, idx) => {
		const lineEnd =
			idx < rawHeadings.length - 1
				? rawHeadings[idx + 1].lineStart - 1
				: totalLines

		const sectionContent = lines.slice(h.lineStart - 1, lineEnd).join('\n')

		return {
			id: toKebabCase(h.heading),
			heading: h.heading,
			level: h.level,
			lineStart: h.lineStart,
			lineEnd,
			summary: '',
			grepPattern: `sed -n '${h.lineStart},${lineEnd}p'`,
			isTransitoryOrAnnex:
				TRANSITORIO_RE.test(h.heading) || ANNEX_RE.test(h.heading),
			containsFines: FINES_RE.test(sectionContent),
		}
	})

	return entries
}
