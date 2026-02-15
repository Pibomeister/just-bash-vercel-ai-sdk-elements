import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { extractEntities } from '@/lib/metadata/entity-extractor'

const ley = readFileSync(path.resolve('test/fixtures/ley-sample.md'), 'utf-8')
const contrato = readFileSync(
	path.resolve('test/fixtures/contrato-sample.md'),
	'utf-8',
)
const sentencia = readFileSync(
	path.resolve('test/fixtures/sentencia-sample.md'),
	'utf-8',
)

describe('extractEntities', () => {
	describe('dates', () => {
		it('extracts Spanish dates from ley', () => {
			const result = extractEntities(ley)
			expect(result.dates.length).toBeGreaterThan(0)
			expect(result.dates.some((d) => d.value.includes('1996'))).toBe(true)
		})

		it('extracts dates from contrato', () => {
			const result = extractEntities(contrato)
			expect(result.dates.some((d) => d.value.includes('enero'))).toBe(true)
		})
	})

	describe('monetaryAmounts', () => {
		it('extracts peso amounts', () => {
			const result = extractEntities(ley)
			expect(result.monetaryAmounts.length).toBeGreaterThan(0)
			expect(
				result.monetaryAmounts.some((a) => a.value.includes('$2,000.00')),
			).toBe(true)
		})

		it('extracts contract amounts', () => {
			const result = extractEntities(contrato)
			expect(
				result.monetaryAmounts.some((a) => a.value.includes('$150,000.00')),
			).toBe(true)
		})
	})

	describe('definedTerms', () => {
		it('extracts quoted defined terms from contrato', () => {
			const result = extractEntities(contrato)
			expect(result.definedTerms.some((t) => t.term === 'EL PRESTADOR')).toBe(
				true,
			)
			expect(result.definedTerms.some((t) => t.term === 'EL CLIENTE')).toBe(
				true,
			)
		})
	})

	describe('legalReferences', () => {
		it('extracts NOM references', () => {
			const result = extractEntities(contrato)
			expect(
				result.legalReferences.some(
					(r) => r.type === 'nom' && r.reference.includes('NOM-035'),
				),
			).toBe(true)
		})

		it('extracts tesis references', () => {
			const result = extractEntities(contrato)
			expect(result.legalReferences.some((r) => r.type === 'tesis')).toBe(true)
		})

		it('extracts DOF references', () => {
			const result = extractEntities(sentencia)
			expect(result.legalReferences.some((r) => r.type === 'dof')).toBe(true)
		})

		it('keeps two different NOM references on the same line', () => {
			const text = 'Cumplir con NOM-001-SEDE-2012 y NOM-002-SEDE-2010 vigentes.'
			const result = extractEntities(text)
			const noms = result.legalReferences.filter((r) => r.type === 'nom')
			expect(noms).toHaveLength(2)
			expect(noms.some((r) => r.reference.includes('NOM-001'))).toBe(true)
			expect(noms.some((r) => r.reference.includes('NOM-002'))).toBe(true)
		})
	})

	describe('definedTerms substring guard', () => {
		it('does not match a defined term inside a longer word', () => {
			const text =
				'\u201CLEY\u201D significa la Ley Aduanera.\nLas LEYES vigentes aplican.\nLa LEY establece.'
			const result = extractEntities(text)
			const leyTerm = result.definedTerms.find((t) => t.term === 'LEY')
			expect(leyTerm).toBeDefined()
			// Line 3 ("La LEY establece.") should be a usage line
			expect(leyTerm!.usageLines).toContain(3)
			// Line 2 ("Las LEYES vigentes aplican.") should NOT be a usage line
			expect(leyTerm!.usageLines).not.toContain(2)
		})

		it('matches accented defined terms without false boundaries', () => {
			const text =
				'\u201C\u00C1REA\u201D designa la zona.\nEl \u00C1REA asignada.\nLas \u00C1REAS no aplican.'
			const result = extractEntities(text)
			const areaTerm = result.definedTerms.find((t) => t.term === '\u00C1REA')
			expect(areaTerm).toBeDefined()
			// "El ÁREA asignada" should be a usage line
			expect(areaTerm!.usageLines).toContain(2)
			// "Las ÁREAS no aplican" should NOT be (substring)
			expect(areaTerm!.usageLines).not.toContain(3)
		})
	})
})
