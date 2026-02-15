import { describe, expect, it } from 'vitest'
import { SidecarSchema, TocEntrySchema } from '@/lib/metadata/types'

describe('TocEntrySchema', () => {
	it('validates a valid TOC entry', () => {
		const entry = {
			id: 'titulo-primero',
			heading: 'TITULO PRIMERO Disposiciones Generales',
			level: 2,
			lineStart: 3,
			lineEnd: 20,
			summary: '',
			grepPattern: "sed -n '3,20p'",
			isTransitoryOrAnnex: false,
			containsFines: false,
		}
		expect(TocEntrySchema.parse(entry)).toEqual(entry)
	})

	it('rejects negative line numbers', () => {
		expect(() =>
			TocEntrySchema.parse({
				id: 'x',
				heading: 'x',
				level: 1,
				lineStart: -1,
				lineEnd: 5,
				summary: '',
				grepPattern: '',
				isTransitoryOrAnnex: false,
				containsFines: false,
			}),
		).toThrow()
	})
})

describe('SidecarSchema', () => {
	it('validates a minimal valid sidecar', () => {
		const sidecar = {
			schemaVersion: '1.0.0' as const,
			generatedAt: '2026-02-15T00:00:00.000Z',
			sourceFile: 'test.md',
			sourceHash: 'abc123',
			document: {
				title: 'Test Document',
				type: 'ley' as const,
				totalLines: 100,
				totalWords: 500,
				language: 'es' as const,
			},
			tableOfContents: [],
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
		expect(() => SidecarSchema.parse(sidecar)).not.toThrow()
	})

	it('rejects invalid document type', () => {
		expect(() =>
			SidecarSchema.parse({
				schemaVersion: '1.0.0',
				generatedAt: '2026-02-15T00:00:00.000Z',
				sourceFile: 'test.md',
				sourceHash: 'abc123',
				document: {
					title: 'Test',
					type: 'invalid',
					totalLines: 1,
					totalWords: 1,
					language: 'es',
				},
				tableOfContents: [],
				entities: {
					dates: [],
					monetaryAmounts: [],
					definedTerms: [],
					legalReferences: [],
				},
				navigation: { warnings: {}, quickCommands: {}, sectionsByTopic: {} },
				legalPatterns: { regexLibrary: {} },
			}),
		).toThrow()
	})
})
