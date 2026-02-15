import { MEXICAN_LEGAL_REGEX, matchAll } from './mexican-legal-regex'
import type { Entities } from './types'

const DEFINED_TERM_RE =
	/[\u201C\u201D""]([^\u201C\u201D""]{2,60})[\u201C\u201D""]/g

export function extractEntities(text: string): Entities {
	const dates = matchAll(text, MEXICAN_LEGAL_REGEX.spanishDates).map((m) => ({
		value: m.match,
		context: extractContext(text, m.line),
		line: m.line,
	}))

	const pesoMatches = matchAll(text, MEXICAN_LEGAL_REGEX.pesos)
	const umaMatches = matchAll(text, MEXICAN_LEGAL_REGEX.umas)
	const monetaryAmounts = [...pesoMatches, ...umaMatches].map((m) => ({
		value: m.match,
		context: extractContext(text, m.line),
		line: m.line,
	}))

	const definedTerms = extractDefinedTerms(text)

	const legalReferences = [
		...matchAll(text, MEXICAN_LEGAL_REGEX.noms).map((m) => ({
			type: 'nom' as const,
			reference: m.match,
			line: m.line,
		})),
		...matchAll(text, MEXICAN_LEGAL_REGEX.dofShort).map((m) => ({
			type: 'dof' as const,
			reference: m.match,
			line: m.line,
		})),
		...matchAll(text, MEXICAN_LEGAL_REGEX.dofLong).map((m) => ({
			type: 'dof' as const,
			reference: m.match,
			line: m.line,
		})),
		...matchAll(text, MEXICAN_LEGAL_REGEX.tesis).map((m) => ({
			type: 'tesis' as const,
			reference: m.match,
			line: m.line,
		})),
	]

	const uniqueRefs = legalReferences.filter(
		(ref, idx, arr) =>
			arr.findIndex((r) => r.line === ref.line && r.type === ref.type) === idx,
	)

	return { dates, monetaryAmounts, definedTerms, legalReferences: uniqueRefs }
}

function extractDefinedTerms(text: string) {
	const lines = text.split('\n')
	const termMap = new Map<
		string,
		{ definedAtLine: number; usageLines: number[] }
	>()

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]
		let m: RegExpExecArray | null
		const re = new RegExp(DEFINED_TERM_RE.source, 'g')
		while ((m = re.exec(line)) !== null) {
			const term = m[1].trim()
			if (term.length >= 3 && /^[A-Z\u00C0-\u00DC\s]+$/.test(term)) {
				if (!termMap.has(term)) {
					termMap.set(term, { definedAtLine: i + 1, usageLines: [] })
				}
			}
		}
	}

	for (const [term, data] of termMap) {
		for (let i = 0; i < lines.length; i++) {
			if (i + 1 === data.definedAtLine) continue
			if (
				lines[i].includes(term) ||
				lines[i].includes(`\u201C${term}\u201D`) ||
				lines[i].includes(`"${term}"`)
			) {
				data.usageLines.push(i + 1)
			}
		}
	}

	return [...termMap.entries()].map(([term, data]) => ({
		term,
		definedAtLine: data.definedAtLine,
		usageLines: data.usageLines,
	}))
}

function extractContext(text: string, lineNum: number): string {
	const lines = text.split('\n')
	const line = lines[lineNum - 1] ?? ''
	return line.trim().slice(0, 120)
}
