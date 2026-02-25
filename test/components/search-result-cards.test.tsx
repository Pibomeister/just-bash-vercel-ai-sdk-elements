// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SearchResultCards } from '@/components/ai-elements/search-result-cards'

describe('SearchResultCards', () => {
	it('renders empty state when output is not an array', () => {
		render(<SearchResultCards output={{ not: 'an array' }} />)

		expect(screen.getByText('No results returned')).toBeTruthy()
	})

	it('renders index badge, score badge, document id, and text', () => {
		render(
			<SearchResultCards
				output={[
					{
						index: 1,
						text: 'Articulo 14-B sobre servicios en recintos fiscalizados.',
						score: 0.822512,
						documentId: 'doc-ley-1',
					},
				]}
			/>,
		)

		expect(screen.getByText('[1]')).toBeTruthy()
		expect(screen.getByText('0.8225')).toBeTruthy()
		expect(screen.getByText('doc-ley-1')).toBeTruthy()
		expect(
			screen.getByText(
				'Articulo 14-B sobre servicios en recintos fiscalizados.',
			),
		).toBeTruthy()
	})

	it('renders n/a when score is null', () => {
		render(
			<SearchResultCards
				output={[
					{
						index: 2,
						text: 'Resultado sin score',
						score: null,
						documentId: null,
					},
				]}
			/>,
		)

		expect(screen.getByText('[2]')).toBeTruthy()
		expect(screen.getByText('n/a')).toBeTruthy()
	})

	it('skips malformed entries and truncates long text', () => {
		const longText = 'x'.repeat(505)
		const truncated = `${longText.slice(0, 500)}...`

		render(
			<SearchResultCards
				output={[
					{ index: 'bad', text: 'bad', score: 0.5, documentId: 'doc-bad' },
					{ index: 3, text: longText, score: 0.9, documentId: 'doc-good' },
				]}
			/>,
		)

		expect(screen.queryByText('doc-bad')).toBeNull()
		expect(screen.getByText('[3]')).toBeTruthy()
		expect(screen.getByText('0.9000')).toBeTruthy()
		expect(screen.getByText(truncated)).toBeTruthy()
	})
})
