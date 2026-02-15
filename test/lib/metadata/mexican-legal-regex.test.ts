import { describe, expect, it } from 'vitest'
import {
	MEXICAN_LEGAL_REGEX,
	matchAll,
} from '@/lib/metadata/mexican-legal-regex'

describe('MEXICAN_LEGAL_REGEX', () => {
	describe('articlesOcrAware', () => {
		const re = new RegExp(MEXICAN_LEGAL_REGEX.articlesOcrAware)

		it('matches standard article format', () => {
			expect('Artículo 36 de la Ley').toMatch(re)
		})

		it('matches OCR-corrupted ordinal (1o. -> 10.)', () => {
			expect('ARTICULO 10. Esta Ley').toMatch(re)
		})

		it('matches ARTICULO 20.', () => {
			expect('ARTICULO 20. Las disposiciones').toMatch(re)
		})

		it('matches Bis/Ter variants', () => {
			expect('Artículo 36 Bis').toMatch(re)
			expect('Art. 37 Ter').toMatch(re)
		})

		it('matches hyphenated articles', () => {
			expect('ARTICULO 14-A.').toMatch(re)
		})
	})

	describe('transitorios', () => {
		const re = new RegExp(MEXICAN_LEGAL_REGEX.transitorios, 'i')

		it('matches TRANSITORIOS header', () => {
			expect('TRANSITORIOS').toMatch(re)
		})

		it('matches DECRETO por el que', () => {
			expect('DECRETO por el que se reforman').toMatch(re)
		})

		it('matches ARTICULOS TRANSITORIOS', () => {
			expect('ARTÍCULOS TRANSITORIOS').toMatch(re)
		})
	})

	describe('pesos', () => {
		const re = new RegExp(MEXICAN_LEGAL_REGEX.pesos)

		it('matches peso amounts with M.N.', () => {
			expect('$150,000.00 M.N.').toMatch(re)
		})

		it('matches simple peso amounts', () => {
			expect('$2,000.00').toMatch(re)
		})

		it('matches pesos keyword', () => {
			expect('$85,000.00 pesos').toMatch(re)
		})
	})

	describe('clausulas', () => {
		const re = new RegExp(MEXICAN_LEGAL_REGEX.clausulas)

		it('matches ordinal clauses', () => {
			expect('CLÁUSULA PRIMERA').toMatch(re)
			expect('CLÁUSULA SÉPTIMA').toMatch(re)
		})
	})

	describe('noms', () => {
		const re = new RegExp(MEXICAN_LEGAL_REGEX.noms)

		it('matches NOM format', () => {
			expect('NOM-035-STPS-2018').toMatch(re)
		})
	})

	describe('tesis', () => {
		const re = new RegExp(MEXICAN_LEGAL_REGEX.tesis)

		it('matches tesis format', () => {
			expect('tesis 2a./J. 47/2014 (10a.)').toMatch(re)
			expect('tesis 1a./J. 23/2018').toMatch(re)
		})
	})
})

describe('matchAll', () => {
	it('returns all matches with line numbers', () => {
		const text =
			'Line one\nARTICULO 10. Something\nLine three\nARTICULO 20. Other'
		const results = matchAll(text, MEXICAN_LEGAL_REGEX.articlesOcrAware)
		expect(results).toHaveLength(2)
		expect(results[0]).toMatchObject({
			match: expect.stringContaining('ARTICULO 10'),
			line: 2,
		})
		expect(results[1]).toMatchObject({
			match: expect.stringContaining('ARTICULO 20'),
			line: 4,
		})
	})
})
