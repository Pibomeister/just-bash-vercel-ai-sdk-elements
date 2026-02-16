import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TocEntry } from '@/lib/metadata/types'
import { LlmEnrichmentSchema } from '@/lib/metadata/types'

const mockGenerateObject = vi.fn()
vi.mock('ai', () => ({
	generateObject: (...args: unknown[]) => mockGenerateObject(...args),
}))

vi.mock('@ai-sdk/openai', () => ({
	openai: vi.fn(() => 'mocked-model'),
}))

const makeTocEntries = (ids: string[]): TocEntry[] =>
	ids.map((id, i) => ({
		id,
		heading: `Heading for ${id}`,
		level: 2,
		lineStart: i * 20 + 1,
		lineEnd: (i + 1) * 20,
		summary: '',
		grepPattern: `sed -n '${i * 20 + 1},${(i + 1) * 20}p'`,
		isTransitoryOrAnnex: false,
		containsFines: false,
	}))

describe('enrichWithLlm', () => {
	beforeEach(() => {
		mockGenerateObject.mockReset()
	})

	it('produces valid enrichment for 3 TOC entries', async () => {
		const { enrichWithLlm } = await import('@/lib/metadata/llm-enrichment')

		const tocEntries = makeTocEntries(['titulo-1', 'capitulo-1', 'capitulo-2'])
		const markdownPreview = '# Ley de prueba\n\nContenido del documento.'

		const mockResult = {
			sections: [
				{ id: 'titulo-1', summary: 'Disposiciones generales' },
				{ id: 'capitulo-1', summary: 'Definiciones y alcance' },
				{ id: 'capitulo-2', summary: 'Obligaciones de las partes' },
			],
			parties: [
				{
					name: 'El Arrendador',
					role: 'arrendador',
					definedAs: 'Propietario del inmueble',
				},
			],
			termDefinitions: [
				{
					term: 'Inmueble',
					meaning: 'Bien raiz objeto del contrato',
				},
			],
		}

		mockGenerateObject.mockResolvedValueOnce({ object: mockResult })

		const result = await enrichWithLlm(tocEntries, markdownPreview)

		expect(result).not.toBeNull()
		expect(() => LlmEnrichmentSchema.parse(result)).not.toThrow()
		expect(result!.sections).toHaveLength(3)
	})

	it('returns null when generateObject throws', async () => {
		const { enrichWithLlm } = await import('@/lib/metadata/llm-enrichment')

		const tocEntries = makeTocEntries(['titulo-1'])
		const markdownPreview = '# Documento\n\nContenido.'

		mockGenerateObject.mockRejectedValueOnce(new Error('API failure'))

		const result = await enrichWithLlm(tocEntries, markdownPreview)

		expect(result).toBeNull()
	})

	it('includes OCR context in prompt when warning present', async () => {
		const { enrichWithLlm } = await import('@/lib/metadata/llm-enrichment')

		const tocEntries = makeTocEntries(['titulo-1'])
		const markdownPreview = '# Documento\n\nContenido.'
		const warnings = { ocr_ordinals: 'some warning about OCR' }

		mockGenerateObject.mockResolvedValueOnce({
			object: {
				sections: [{ id: 'titulo-1', summary: 'Resumen de prueba' }],
				parties: [],
				termDefinitions: [],
			},
		})

		await enrichWithLlm(tocEntries, markdownPreview, warnings)

		const call = mockGenerateObject.mock.calls[0][0]
		expect(call.prompt).toMatch(/OCR/i)
	})

	it('returns null without calling LLM when TOC is empty', async () => {
		const { enrichWithLlm } = await import('@/lib/metadata/llm-enrichment')

		const result = await enrichWithLlm([], '# Documento vacio')

		expect(result).toBeNull()
		expect(mockGenerateObject).not.toHaveBeenCalled()
	})
})
