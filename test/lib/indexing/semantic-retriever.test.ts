import { vi } from 'vitest'

const mockRetrieve = vi.fn()

vi.mock('@llamaindex/llama-cloud', () => ({
	LlamaCloud: vi.fn().mockImplementation(function () {
		return {
			pipelines: {
				retrieve: mockRetrieve,
			},
		}
	}),
}))

import {
	buildFilters,
	formatResults,
	search,
} from '@/lib/indexing/semantic-retriever'
import type { SearchParams } from '@/lib/indexing/types'

describe('buildFilters', () => {
	it('returns undefined when no documentType is set', () => {
		const params: SearchParams = {
			query: 'test',
			alpha: 0.5,
			topK: 20,
			rerankTopN: 5,
		}
		expect(buildFilters(params)).toBeUndefined()
	})

	it('returns MetadataFilters when documentType is set', () => {
		const params: SearchParams = {
			query: 'test',
			documentType: 'contrato',
			alpha: 0.5,
			topK: 20,
			rerankTopN: 5,
		}
		expect(buildFilters(params)).toEqual({
			filters: [{ key: 'documentType', value: 'contrato', operator: '==' }],
			condition: 'and',
		})
	})

	it('builds correct filter for each document type', () => {
		for (const type of ['ley', 'sentencia', 'nom', 'otro'] as const) {
			const params: SearchParams = {
				query: 'q',
				documentType: type,
				alpha: 0.5,
				topK: 20,
				rerankTopN: 5,
			}
			const result = buildFilters(params)
			expect(result?.filters[0].value).toBe(type)
		}
	})
})

describe('formatResults', () => {
	it('maps retrieval nodes to SearchResult format', () => {
		const nodes = [
			{
				node: {
					text: 'First result text',
					id_: 'node-1',
					extra_info: { documentId: 'doc-1', documentType: 'ley' },
				},
				score: 0.95,
			},
			{
				node: {
					text: 'Second result text',
					id_: 'node-2',
					extra_info: { documentId: 'doc-2' },
				},
				score: 0.82,
			},
		]

		const results = formatResults(nodes)
		expect(results).toEqual([
			{
				text: 'First result text',
				score: 0.95,
				documentId: 'doc-1',
				metadata: { documentId: 'doc-1', documentType: 'ley' },
			},
			{
				text: 'Second result text',
				score: 0.82,
				documentId: 'doc-2',
				metadata: { documentId: 'doc-2' },
			},
		])
	})

	it('handles empty nodes array', () => {
		expect(formatResults([])).toEqual([])
	})

	it('handles missing text, score, and extra_info', () => {
		const nodes = [
			{
				node: {},
			},
		]
		const results = formatResults(nodes)
		expect(results).toEqual([
			{
				text: '',
				score: null,
				documentId: null,
				metadata: {},
			},
		])
	})

	it('handles null score', () => {
		const nodes = [
			{
				node: { text: 'Result', extra_info: { documentId: 'doc-1' } },
				score: null,
			},
		]
		const results = formatResults(nodes)
		expect(results[0].score).toBeNull()
	})

	it('returns null documentId when not in extra_info', () => {
		const nodes = [
			{
				node: { text: 'Result', extra_info: { other: 'field' } },
				score: 0.5,
			},
		]
		const results = formatResults(nodes)
		expect(results[0].documentId).toBeNull()
	})
})

describe('search', () => {
	beforeEach(() => {
		vi.stubEnv('LLAMA_CLOUD_API_KEY', 'test-api-key')
		mockRetrieve.mockReset()
		mockRetrieve.mockResolvedValue({
			retrieval_nodes: [
				{
					node: {
						text: 'Matching text',
						id_: 'n1',
						extra_info: { documentId: 'doc-1' },
					},
					score: 0.9,
				},
			],
		})
	})

	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it('calls retrieve with correct hybrid search params', async () => {
		await search('pipe-123', {
			query: 'responsabilidad civil',
			alpha: 0.5,
			topK: 20,
			rerankTopN: 5,
		})

		expect(mockRetrieve).toHaveBeenCalledWith('pipe-123', {
			query: 'responsabilidad civil',
			alpha: 0.5,
			dense_similarity_top_k: 20,
			sparse_similarity_top_k: 20,
			enable_reranking: true,
			rerank_top_n: 5,
			retrieval_mode: 'chunks',
			search_filters: undefined,
		})
	})

	it('passes search_filters when documentType is set', async () => {
		await search('pipe-123', {
			query: 'contrato de arrendamiento',
			documentType: 'contrato',
			alpha: 0.7,
			topK: 10,
			rerankTopN: 3,
		})

		expect(mockRetrieve).toHaveBeenCalledWith('pipe-123', {
			query: 'contrato de arrendamiento',
			alpha: 0.7,
			dense_similarity_top_k: 10,
			sparse_similarity_top_k: 10,
			enable_reranking: true,
			rerank_top_n: 3,
			retrieval_mode: 'chunks',
			search_filters: {
				filters: [{ key: 'documentType', value: 'contrato', operator: '==' }],
				condition: 'and',
			},
		})
	})

	it('returns formatted SearchResult array', async () => {
		const results = await search('pipe-123', {
			query: 'test',
			alpha: 0.5,
			topK: 20,
			rerankTopN: 5,
		})

		expect(results).toEqual([
			{
				text: 'Matching text',
				score: 0.9,
				documentId: 'doc-1',
				metadata: { documentId: 'doc-1' },
			},
		])
	})

	it('returns empty array when retrieval_nodes is undefined', async () => {
		mockRetrieve.mockResolvedValue({})
		const results = await search('pipe-123', {
			query: 'test',
			alpha: 0.5,
			topK: 20,
			rerankTopN: 5,
		})
		expect(results).toEqual([])
	})

	it('uses default values for alpha, topK, and rerankTopN', async () => {
		await search('pipe-123', {
			query: 'test query',
			alpha: 0.5,
			topK: 20,
			rerankTopN: 5,
		})

		expect(mockRetrieve).toHaveBeenCalledWith(
			'pipe-123',
			expect.objectContaining({
				alpha: 0.5,
				dense_similarity_top_k: 20,
				sparse_similarity_top_k: 20,
				rerank_top_n: 5,
			}),
		)
	})
})
