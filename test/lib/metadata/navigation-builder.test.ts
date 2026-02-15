import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { extractHeadings } from '@/lib/metadata/heading-extractor'
import { buildNavigation } from '@/lib/metadata/navigation-builder'

const ley = readFileSync(path.resolve('test/fixtures/ley-sample.md'), 'utf-8')
const contrato = readFileSync(
	path.resolve('test/fixtures/contrato-sample.md'),
	'utf-8',
)

describe('buildNavigation', () => {
	describe('warnings', () => {
		it('detects OCR ordinal corruption', () => {
			const toc = extractHeadings(ley)
			const nav = buildNavigation(ley, toc, 'ley')
			expect(nav.warnings.ocr_ordinals).toBeDefined()
			expect(nav.warnings.ocr_ordinals).toContain('OCR')
		})

		it('detects transitorios noise ratio', () => {
			const toc = extractHeadings(ley)
			const nav = buildNavigation(ley, toc, 'ley')
			expect(nav.warnings.transitorios_noise).toBeDefined()
		})

		it('detects outdated fines when annexes present', () => {
			const toc = extractHeadings(ley)
			const nav = buildNavigation(ley, toc, 'ley')
			expect(nav.warnings.outdated_fines).toBeDefined()
		})

		it('produces no OCR warnings for contrato', () => {
			const toc = extractHeadings(contrato)
			const nav = buildNavigation(contrato, toc, 'contrato')
			expect(nav.warnings.ocr_ordinals).toBeUndefined()
		})
	})

	describe('quickCommands', () => {
		it('generates readArticle for ley type', () => {
			const toc = extractHeadings(ley)
			const nav = buildNavigation(ley, toc, 'ley')
			expect(nav.quickCommands.readArticle).toBeDefined()
		})

		it('generates readClause for contrato type', () => {
			const toc = extractHeadings(contrato)
			const nav = buildNavigation(contrato, toc, 'contrato')
			expect(nav.quickCommands.readClause).toBeDefined()
		})
	})

	describe('sectionsByTopic', () => {
		it('groups ley sections by topic', () => {
			const toc = extractHeadings(ley)
			const nav = buildNavigation(ley, toc, 'ley')
			expect(Object.keys(nav.sectionsByTopic).length).toBeGreaterThan(0)
		})
	})

	describe('transitorios at document start (findIndex === 0)', () => {
		it('generates transitorios_noise warning when TRANSITORIOS is the first line', () => {
			const text =
				'TRANSITORIOS\nPrimero. Vigencia.\nSegundo. Se derogan.\nTercero. Aplicabilidad.\nCuarto. Disposiciones.'
			const toc = extractHeadings(text)
			const nav = buildNavigation(text, toc, 'ley')
			expect(nav.warnings.transitorios_noise).toBeDefined()
			expect(nav.warnings.transitorios_noise).toContain('100%')
		})
	})
})
