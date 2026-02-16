import { LlamaCloud } from '@llamaindex/llama-cloud'
import type { IndexingConfig, PipelineInfo } from '@/lib/indexing/types'

export function createClient(): LlamaCloud {
	const apiKey = process.env.LLAMA_CLOUD_API_KEY
	if (!apiKey) throw new Error('LLAMA_CLOUD_API_KEY is required')
	return new LlamaCloud({ apiKey })
}

export async function ensurePipeline(
	overrides?: Partial<IndexingConfig>,
): Promise<PipelineInfo> {
	const config: IndexingConfig = {
		pipelineName:
			overrides?.pipelineName ||
			process.env.LLAMA_CLOUD_PIPELINE_NAME ||
			'legal-documents',
		projectId: overrides?.projectId ?? process.env.LLAMA_CLOUD_PROJECT_ID ?? '',
		embeddingModel: overrides?.embeddingModel ?? 'text-embedding-3-small',
		embeddingDimensions: overrides?.embeddingDimensions ?? 1536,
		chunkSize: overrides?.chunkSize ?? 512,
		chunkOverlap: overrides?.chunkOverlap ?? 50,
	}

	if (!config.projectId) throw new Error('LLAMA_CLOUD_PROJECT_ID is required')

	const client = createClient()
	const pipeline = await client.pipelines.upsert({
		name: config.pipelineName,
		project_id: config.projectId,
		embedding_config: {
			type: 'OPENAI_EMBEDDING',
			component: {
				model_name: config.embeddingModel,
				dimensions: config.embeddingDimensions,
			},
		},
		transform_config: {
			mode: 'advanced',
			chunking_config: {
				mode: 'sentence',
				chunk_size: config.chunkSize,
				chunk_overlap: config.chunkOverlap,
			},
		},
		sparse_model_config: {
			model_type: 'bm25',
		},
		pipeline_type: 'MANAGED',
	})

	return {
		id: pipeline.id,
		name: pipeline.name,
		status: pipeline.status ?? 'unknown',
	}
}
