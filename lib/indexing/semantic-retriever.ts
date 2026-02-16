import { createClient } from '@/lib/indexing/pipeline-manager'
import type { SearchParams, SearchResult } from '@/lib/indexing/types'

export function buildFilters(params: SearchParams) {
	if (!params.documentType) return undefined
	return {
		filters: [
			{
				key: 'documentType',
				value: params.documentType,
				operator: '==' as const,
			},
		],
		condition: 'and' as const,
	}
}

export function formatResults(
	nodes: Array<{
		node: {
			text?: string
			id_?: string
			extra_info?: Record<string, unknown>
		}
		score?: number | null
	}>,
): SearchResult[] {
	return nodes.map((n) => ({
		text: n.node.text ?? '',
		score: n.score ?? null,
		documentId: (n.node.extra_info?.documentId as string) ?? null,
		metadata: n.node.extra_info ?? {},
	}))
}

export async function search(
	pipelineId: string,
	params: SearchParams,
): Promise<SearchResult[]> {
	const client = createClient()
	const response = await client.pipelines.retrieve(pipelineId, {
		query: params.query,
		alpha: params.alpha ?? 0.5,
		dense_similarity_top_k: params.topK ?? 20,
		sparse_similarity_top_k: params.topK ?? 20,
		enable_reranking: true,
		rerank_top_n: params.rerankTopN ?? 5,
		retrieval_mode: 'chunks',
		search_filters: buildFilters(params),
	})

	return formatResults(response.retrieval_nodes ?? [])
}
