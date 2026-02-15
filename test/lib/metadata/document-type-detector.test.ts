import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { detectDocumentType } from '@/lib/metadata/document-type-detector'

const fixtures = path.resolve('test/fixtures')
const ley = readFileSync(path.join(fixtures, 'ley-sample.md'), 'utf-8')
const contrato = readFileSync(
	path.join(fixtures, 'contrato-sample.md'),
	'utf-8',
)
const sentencia = readFileSync(
	path.join(fixtures, 'sentencia-sample.md'),
	'utf-8',
)

describe('detectDocumentType', () => {
	it('detects ley (legislation)', () => {
		expect(detectDocumentType(ley)).toBe('ley')
	})

	it('detects contrato (contract)', () => {
		expect(detectDocumentType(contrato)).toBe('contrato')
	})

	it('detects sentencia (court ruling)', () => {
		expect(detectDocumentType(sentencia)).toBe('sentencia')
	})

	it('returns otro for unrecognized text', () => {
		expect(detectDocumentType('This is a random document in English.')).toBe(
			'otro',
		)
	})

	it('detects contrato with lowercase legal entities (s.a. de c.v.)', () => {
		const text =
			'CONTRATO de prestación de servicios entre empresa s.a. de c.v. y...\nCLÁUSULA PRIMERA...\nCLÁUSULA SEGUNDA...'
		expect(detectDocumentType(text)).toBe('contrato')
	})
})
