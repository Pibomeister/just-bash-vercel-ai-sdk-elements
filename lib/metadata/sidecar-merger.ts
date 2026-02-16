import type { LlmEnrichment, Sidecar } from './types'

/**
 * Deep-merge LLM enrichment data into a deterministic sidecar.
 * Deterministic fields always win -- LLM data only fills empty slots.
 */
export function mergeLlmEnrichment(
	sidecar: Sidecar,
	llmData: LlmEnrichment | null,
): Sidecar {
	if (llmData === null) {
		return sidecar
	}

	// Build a lookup of LLM section summaries by id
	const summaryById = new Map(llmData.sections.map((s) => [s.id, s.summary]))

	// Merge TOC: fill summary only when the deterministic summary is empty
	const tableOfContents = sidecar.tableOfContents.map((entry) => {
		const llmSummary = summaryById.get(entry.id)
		if (entry.summary === '' && llmSummary !== undefined) {
			return { ...entry, summary: llmSummary }
		}
		return entry
	})

	// Merge parties: set from LLM only if sidecar has no parties
	const parties =
		sidecar.document.parties === undefined && llmData.parties.length > 0
			? llmData.parties.map((p) => ({ ...p }))
			: sidecar.document.parties

	// Build a lookup of LLM term definitions by term
	const meaningByTerm = new Map(
		llmData.termDefinitions.map((t) => [t.term, t.meaning]),
	)

	// Merge defined terms: add meaning only when the existing meaning is undefined
	const definedTerms = sidecar.entities.definedTerms.map((term) => {
		if (term.meaning === undefined || term.meaning === '') {
			const llmMeaning = meaningByTerm.get(term.term)
			if (llmMeaning !== undefined) {
				return { ...term, meaning: llmMeaning }
			}
		}
		return term
	})

	return {
		...sidecar,
		document: {
			...sidecar.document,
			parties,
		},
		tableOfContents,
		entities: {
			...sidecar.entities,
			definedTerms,
		},
	}
}
