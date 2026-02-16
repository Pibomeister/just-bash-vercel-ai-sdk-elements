import { describe, expect, it } from 'vitest'
import { mergeLlmEnrichment } from '@/lib/metadata/sidecar-merger'
import type { LlmEnrichment, Sidecar } from '@/lib/metadata/types'
import { SidecarSchema } from '@/lib/metadata/types'

/** Build a minimal valid Sidecar for test purposes. */
function makeMinimalSidecar(overrides?: Partial<Sidecar>): Sidecar {
	const base: Sidecar = {
		schemaVersion: '1.0.0',
		generatedAt: '2026-02-15T00:00:00.000Z',
		sourceFile: 'test.md',
		sourceHash: 'abc123',
		document: {
			title: 'Contrato de Servicios',
			type: 'contrato',
			totalLines: 200,
			totalWords: 1500,
			language: 'es',
		},
		tableOfContents: [
			{
				id: 'clausula-primera',
				heading: 'CLAUSULA PRIMERA. OBJETO',
				level: 2,
				lineStart: 10,
				lineEnd: 30,
				summary: '',
				grepPattern: "sed -n '10,30p'",
				isTransitoryOrAnnex: false,
				containsFines: false,
			},
			{
				id: 'clausula-segunda',
				heading: 'CLAUSULA SEGUNDA. VIGENCIA',
				level: 2,
				lineStart: 31,
				lineEnd: 50,
				summary: '',
				grepPattern: "sed -n '31,50p'",
				isTransitoryOrAnnex: false,
				containsFines: false,
			},
		],
		entities: {
			dates: [],
			monetaryAmounts: [],
			definedTerms: [],
			legalReferences: [],
		},
		navigation: {
			warnings: {},
			quickCommands: {},
			sectionsByTopic: {},
		},
		legalPatterns: {
			regexLibrary: {},
		},
	}

	if (overrides) {
		return { ...base, ...overrides }
	}
	return base
}

/** Build a minimal valid LlmEnrichment for test purposes. */
function makeLlmEnrichment(overrides?: Partial<LlmEnrichment>): LlmEnrichment {
	const base: LlmEnrichment = {
		sections: [
			{
				id: 'clausula-primera',
				summary: 'Describes the purpose and scope of the contract.',
			},
			{
				id: 'clausula-segunda',
				summary: 'Sets the duration and renewal terms.',
			},
		],
		parties: [
			{
				name: 'Acme Corp',
				role: 'Prestador',
				definedAs: 'EL PRESTADOR',
			},
			{
				name: 'Beta Inc',
				role: 'Cliente',
				definedAs: 'EL CLIENTE',
			},
		],
		termDefinitions: [
			{ term: 'EL PRESTADOR', meaning: 'The service provider entity' },
			{ term: 'EL CLIENTE', meaning: 'The receiving client entity' },
		],
	}

	if (overrides) {
		return { ...base, ...overrides }
	}
	return base
}

describe('mergeLlmEnrichment', () => {
	it('returns original sidecar reference when llmData is null', () => {
		const sidecar = makeMinimalSidecar()
		const result = mergeLlmEnrichment(sidecar, null)
		expect(result).toBe(sidecar)
	})

	it('preserves deterministic fields while adding LLM data', () => {
		const sidecar = makeMinimalSidecar({
			entities: {
				dates: [
					{ value: '2026-01-01', context: 'fecha de inicio', line: 15 },
					{ value: '2026-12-31', context: 'fecha de termino', line: 16 },
					{ value: '2026-06-15', context: 'revision intermedia', line: 40 },
				],
				monetaryAmounts: [],
				definedTerms: [],
				legalReferences: [],
			},
			navigation: {
				warnings: {
					ocr_ordinals:
						'Ordinal markers detected that may indicate OCR artifacts',
				},
				quickCommands: {},
				sectionsByTopic: {},
			},
		})

		const llmData = makeLlmEnrichment()
		const result = mergeLlmEnrichment(sidecar, llmData)

		// Deterministic entities.dates preserved exactly
		expect(result.entities.dates).toHaveLength(3)
		expect(result.entities.dates).toEqual(sidecar.entities.dates)

		// Deterministic navigation warning preserved
		expect(result.navigation.warnings.ocr_ordinals).toBe(
			'Ordinal markers detected that may indicate OCR artifacts',
		)

		// LLM summaries applied to TOC
		expect(result.tableOfContents[0].summary).toBe(
			'Describes the purpose and scope of the contract.',
		)
		expect(result.tableOfContents[1].summary).toBe(
			'Sets the duration and renewal terms.',
		)

		// LLM parties populated
		expect(result.document.parties).toHaveLength(2)
		expect(result.document.parties![0].name).toBe('Acme Corp')
	})

	it('produces a sidecar that validates against SidecarSchema', () => {
		const sidecar = makeMinimalSidecar({
			entities: {
				dates: [],
				monetaryAmounts: [],
				definedTerms: [
					{
						term: 'EL PRESTADOR',
						definedAtLine: 5,
						usageLines: [10, 20],
						meaning: undefined,
					},
				],
				legalReferences: [],
			},
		})

		const llmData = makeLlmEnrichment()
		const result = mergeLlmEnrichment(sidecar, llmData)

		expect(() => SidecarSchema.parse(result)).not.toThrow()
		expect(result.schemaVersion).toBe('1.0.0')
	})

	it('preserves deterministic summary over LLM summary', () => {
		const sidecar = makeMinimalSidecar({
			tableOfContents: [
				{
					id: 'clausula-primera',
					heading: 'CLAUSULA PRIMERA. OBJETO',
					level: 2,
					lineStart: 10,
					lineEnd: 30,
					summary: 'Deterministic summary already present.',
					grepPattern: "sed -n '10,30p'",
					isTransitoryOrAnnex: false,
					containsFines: false,
				},
				{
					id: 'clausula-segunda',
					heading: 'CLAUSULA SEGUNDA. VIGENCIA',
					level: 2,
					lineStart: 31,
					lineEnd: 50,
					summary: '',
					grepPattern: "sed -n '31,50p'",
					isTransitoryOrAnnex: false,
					containsFines: false,
				},
			],
		})

		const llmData = makeLlmEnrichment({
			sections: [
				{
					id: 'clausula-primera',
					summary: 'LLM summary that should NOT overwrite.',
				},
				{
					id: 'clausula-segunda',
					summary: 'LLM summary for empty slot.',
				},
			],
		})

		const result = mergeLlmEnrichment(sidecar, llmData)

		// Deterministic summary wins
		expect(result.tableOfContents[0].summary).toBe(
			'Deterministic summary already present.',
		)
		// Empty summary gets LLM fill
		expect(result.tableOfContents[1].summary).toBe(
			'LLM summary for empty slot.',
		)
	})

	it('overlays LLM term definitions only on matching terms with undefined meaning', () => {
		const sidecar = makeMinimalSidecar({
			entities: {
				dates: [],
				monetaryAmounts: [],
				definedTerms: [
					{
						term: 'EL PRESTADOR',
						definedAtLine: 5,
						usageLines: [10, 20],
						meaning: undefined,
					},
					{
						term: 'EL CLIENTE',
						definedAtLine: 8,
						usageLines: [15, 25],
						meaning: undefined,
					},
				],
				legalReferences: [],
			},
		})

		const llmData = makeLlmEnrichment({
			sections: [],
			parties: [],
			termDefinitions: [
				{ term: 'EL PRESTADOR', meaning: 'The service provider' },
			],
		})

		const result = mergeLlmEnrichment(sidecar, llmData)

		const prestador = result.entities.definedTerms.find(
			(t) => t.term === 'EL PRESTADOR',
		)
		const cliente = result.entities.definedTerms.find(
			(t) => t.term === 'EL CLIENTE',
		)

		expect(prestador?.meaning).toBe('The service provider')
		expect(cliente?.meaning).toBeUndefined()
	})

	it('does not corrupt sidecar when LLM enrichment has empty arrays', () => {
		const sidecar = makeMinimalSidecar()
		const llmData: LlmEnrichment = {
			sections: [],
			parties: [],
			termDefinitions: [],
		}

		const result = mergeLlmEnrichment(sidecar, llmData)

		expect(() => SidecarSchema.parse(result)).not.toThrow()
		// TOC summaries unchanged (still empty string)
		expect(result.tableOfContents[0].summary).toBe('')
		expect(result.tableOfContents[1].summary).toBe('')
		// Parties not set (no LLM parties)
		expect(result.document.parties).toBeUndefined()
	})
})
