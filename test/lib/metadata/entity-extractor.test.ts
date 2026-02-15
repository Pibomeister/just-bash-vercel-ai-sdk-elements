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
	})
})
