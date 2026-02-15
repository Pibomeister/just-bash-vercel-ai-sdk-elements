import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { generateSidecar } from '@/lib/metadata/sidecar-generator'
import { SidecarSchema } from '@/lib/metadata/types'

const ley = readFileSync(path.resolve('test/fixtures/ley-sample.md'), 'utf-8')
const contrato = readFileSync(
	path.resolve('test/fixtures/contrato-sample.md'),
	'utf-8',
)
const sentencia = readFileSync(
	path.resolve('test/fixtures/sentencia-sample.md'),
	'utf-8',
)

describe('generateSidecar', () => {
	it('produces a valid sidecar for ley document', () => {
		const sidecar = generateSidecar(ley, 'ley-aduanera.md')
		expect(() => SidecarSchema.parse(sidecar)).not.toThrow()
		expect(sidecar.document.type).toBe('ley')
		expect(sidecar.schemaVersion).toBe('1.0.0')
	})

	it('produces a valid sidecar for contrato document', () => {
		const sidecar = generateSidecar(contrato, 'contrato-servicios.md')
		expect(() => SidecarSchema.parse(sidecar)).not.toThrow()
		expect(sidecar.document.type).toBe('contrato')
	})

	it('produces a valid sidecar for sentencia document', () => {
		const sidecar = generateSidecar(sentencia, 'sentencia-amparo.md')
		expect(() => SidecarSchema.parse(sidecar)).not.toThrow()
		expect(sidecar.document.type).toBe('sentencia')
	})

	it('includes TOC with correct line ranges', () => {
		const sidecar = generateSidecar(ley, 'ley.md')
		expect(sidecar.tableOfContents.length).toBeGreaterThan(0)
		for (const entry of sidecar.tableOfContents) {
			expect(entry.lineStart).toBeLessThanOrEqual(entry.lineEnd)
		}
	})

	it('includes entities', () => {
		const sidecar = generateSidecar(contrato, 'contrato.md')
		expect(sidecar.entities.dates.length).toBeGreaterThan(0)
		expect(sidecar.entities.monetaryAmounts.length).toBeGreaterThan(0)
	})

	it('includes navigation warnings for ley with OCR issues', () => {
		const sidecar = generateSidecar(ley, 'ley.md')
		expect(sidecar.navigation.warnings.ocr_ordinals).toBeDefined()
	})

	it('includes regex library', () => {
		const sidecar = generateSidecar(ley, 'ley.md')
		expect(
			Object.keys(sidecar.legalPatterns.regexLibrary).length,
		).toBeGreaterThan(0)
	})

	it('is deterministic (same input = same output except generatedAt)', () => {
		const a = generateSidecar(ley, 'ley.md')
		const b = generateSidecar(ley, 'ley.md')
		expect({ ...a, generatedAt: '' }).toEqual({ ...b, generatedAt: '' })
	})
})
