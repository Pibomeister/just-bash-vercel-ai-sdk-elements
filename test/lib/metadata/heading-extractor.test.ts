import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { extractHeadings } from '@/lib/metadata/heading-extractor'

const ley = readFileSync(path.resolve('test/fixtures/ley-sample.md'), 'utf-8')
const contrato = readFileSync(
	path.resolve('test/fixtures/contrato-sample.md'),
	'utf-8',
)

describe('extractHeadings', () => {
	it('extracts markdown headings with line ranges', () => {
		const result = extractHeadings(ley)
		expect(result.length).toBeGreaterThan(0)
		expect(result[0].heading).toContain('LEY ADUANERA')
		expect(result[0].level).toBe(1)
		expect(result[0].lineStart).toBe(1)
	})

	it('calculates lineEnd as next heading lineStart - 1', () => {
		const result = extractHeadings(ley)
		for (let i = 0; i < result.length - 1; i++) {
			expect(result[i].lineEnd).toBe(result[i + 1].lineStart - 1)
		}
		const totalLines = ley.split('\n').length
		expect(result[result.length - 1].lineEnd).toBe(totalLines)
	})

	it('generates kebab-case IDs', () => {
		const result = extractHeadings(ley)
		for (const entry of result) {
			expect(entry.id).toMatch(/^[a-z0-9-]+$/)
		}
	})

	it('generates grep patterns', () => {
		const result = extractHeadings(ley)
		for (const entry of result) {
			expect(entry.grepPattern).toContain(
				`sed -n '${entry.lineStart},${entry.lineEnd}p'`,
			)
		}
	})

	it('detects transitorios sections', () => {
		const result = extractHeadings(ley)
		const transitorios = result.filter((h) => h.isTransitoryOrAnnex)
		expect(transitorios.length).toBeGreaterThan(0)
	})

	it('detects sections containing fines', () => {
		const result = extractHeadings(ley)
		const withFines = result.filter((h) => h.containsFines)
		expect(withFines.length).toBeGreaterThan(0)
	})

	it('extracts contract clauses as headings', () => {
		const result = extractHeadings(contrato)
		const clauses = result.filter((h) => h.heading.includes('CLÁUSULA'))
		expect(clauses.length).toBeGreaterThanOrEqual(7)
	})
})
