import { MEXICAN_LEGAL_REGEX, matchAll } from './mexican-legal-regex'
import type { Entities } from './types'

const DEFINED_TERM_RE =
	/[\u201C\u201D""]([^\u201C\u201D""]{2,60})[\u201C\u201D""]/g

export function extractEntities(text: string): Entities {
	const lines = text.split('\n')

	const dates = matchAll(lines, MEXICAN_LEGAL_REGEX.spanishDates).map((m) => ({
		value: m.match,
		context: extractContext(lines, m.line),
		line: m.line,
	}))

	const pesoMatches = matchAll(lines, MEXICAN_LEGAL_REGEX.pesos)
	const umaMatches = matchAll(lines, MEXICAN_LEGAL_REGEX.umas)
	const monetaryAmounts = [...pesoMatches, ...umaMatches].map((m) => ({
		value: m.match,
		context: extractContext(lines, m.line),
		line: m.line,
	}))

	const definedTerms = extractDefinedTerms(text)

	const legalReferences = [
		...matchAll(lines, MEXICAN_LEGAL_REGEX.noms).map((m) => ({
			type: 'nom' as const,
			reference: m.match,
			line: m.line,
		})),
		...matchAll(lines, MEXICAN_LEGAL_REGEX.dofShort).map((m) => ({
			type: 'dof' as const,
			reference: m.match,
			line: m.line,
		})),
		...matchAll(lines, MEXICAN_LEGAL_REGEX.dofLong).map((m) => ({
			type: 'dof' as const,
			reference: m.match,
			line: m.line,
		})),
		...matchAll(lines, MEXICAN_LEGAL_REGEX.tesis).map((m) => ({
			type: 'tesis' as const,
			reference: m.match,
			line: m.line,
		})),
	]

	const uniqueRefs = legalReferences.filter(
		(ref, idx, arr) =>
			arr.findIndex(
				(r) =>
					r.line === ref.line &&
					r.type === ref.type &&
					r.reference === ref.reference,
			) === idx,
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

	// Unicode-aware word boundary: JS \b treats accented chars (Á, É, Ó) as
	// non-word chars, so we use lookaround with Latin Extended character class.
	const WC = String.raw`A-Za-z0-9_\u00C0-\u024F`
	for (const [term, data] of termMap) {
		const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
		const usageRe = new RegExp(`(?<![${WC}])${escaped}(?![${WC}])`)
		for (let i = 0; i < lines.length; i++) {
			if (i + 1 === data.definedAtLine) continue
			if (usageRe.test(lines[i])) {
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

function extractContext(lines: string[], lineNum: number): string {
	const line = lines[lineNum - 1] ?? ''
	return line.trim().slice(0, 120)
}
