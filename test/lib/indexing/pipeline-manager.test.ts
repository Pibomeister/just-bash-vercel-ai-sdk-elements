import { vi } from 'vitest'

const mockUpsert = vi.fn()

vi.mock('@llamaindex/llama-cloud', () => ({
	LlamaCloud: vi.fn().mockImplementation(function () {
		return {
			pipelines: {
				upsert: mockUpsert,
			},
		}
	}),
}))

import { LlamaCloud } from '@llamaindex/llama-cloud'
import { createClient, ensurePipeline } from '@/lib/indexing/pipeline-manager'

describe('createClient', () => {
	beforeEach(() => {
		vi.stubEnv('LLAMA_CLOUD_API_KEY', 'test-api-key')
	})

	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it('creates a LlamaCloud client with api key from env', () => {
		const client = createClient()
		expect(LlamaCloud).toHaveBeenCalledWith({ apiKey: 'test-api-key' })
		expect(client).toBeDefined()
	})

	it('throws if LLAMA_CLOUD_API_KEY is not set', () => {
		vi.stubEnv('LLAMA_CLOUD_API_KEY', '')
		expect(() => createClient()).toThrow('LLAMA_CLOUD_API_KEY is required')
	})

	it('throws if LLAMA_CLOUD_API_KEY is undefined', () => {
		delete process.env.LLAMA_CLOUD_API_KEY
		expect(() => createClient()).toThrow('LLAMA_CLOUD_API_KEY is required')
	})
})

describe('ensurePipeline', () => {
	beforeEach(() => {
		vi.stubEnv('LLAMA_CLOUD_API_KEY', 'test-api-key')
		vi.stubEnv('LLAMA_CLOUD_PROJECT_ID', 'test-project-id')
		vi.stubEnv('LLAMA_CLOUD_PIPELINE_NAME', '')
		mockUpsert.mockReset()
		mockUpsert.mockResolvedValue({
			id: 'pipe-abc',
			name: 'legal-documents',
			status: 'ACTIVE',
		})
	})

	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it('calls upsert with correct default config', async () => {
		await ensurePipeline()

		expect(mockUpsert).toHaveBeenCalledWith({
			name: 'legal-documents',
			project_id: 'test-project-id',
			embedding_config: {
				type: 'OPENAI_EMBEDDING',
				component: {
					model_name: 'text-embedding-3-small',
					dimensions: 1536,
				},
			},
			transform_config: {
				mode: 'advanced',
				chunking_config: {
					mode: 'sentence',
					chunk_size: 512,
					chunk_overlap: 50,
				},
			},
			sparse_model_config: {
				model_type: 'bm25',
			},
			pipeline_type: 'MANAGED',
		})
	})

	it('returns PipelineInfo with id, name, and status', async () => {
		const result = await ensurePipeline()
		expect(result).toEqual({
			id: 'pipe-abc',
			name: 'legal-documents',
			status: 'ACTIVE',
		})
	})

	it('uses env var for pipeline name when set', async () => {
		vi.stubEnv('LLAMA_CLOUD_PIPELINE_NAME', 'custom-pipeline')
		await ensurePipeline()
		expect(mockUpsert).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'custom-pipeline' }),
		)
	})

	it('applies config overrides', async () => {
		await ensurePipeline({
			pipelineName: 'override-name',
			projectId: 'override-project',
			embeddingModel: 'text-embedding-3-large',
			embeddingDimensions: 3072,
			chunkSize: 1024,
			chunkOverlap: 100,
		})

		expect(mockUpsert).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'override-name',
				project_id: 'override-project',
				embedding_config: expect.objectContaining({
					component: expect.objectContaining({
						model_name: 'text-embedding-3-large',
						dimensions: 3072,
					}),
				}),
				transform_config: expect.objectContaining({
					chunking_config: expect.objectContaining({
						chunk_size: 1024,
						chunk_overlap: 100,
					}),
				}),
			}),
		)
	})

	it('throws if LLAMA_CLOUD_PROJECT_ID is missing', async () => {
		vi.stubEnv('LLAMA_CLOUD_PROJECT_ID', '')
		await expect(ensurePipeline()).rejects.toThrow(
			'LLAMA_CLOUD_PROJECT_ID is required',
		)
	})

	it('handles unknown status from API response', async () => {
		mockUpsert.mockResolvedValue({
			id: 'pipe-xyz',
			name: 'test',
		})
		const result = await ensurePipeline()
		expect(result.status).toBe('unknown')
	})

	it('overrides take precedence over env vars', async () => {
		vi.stubEnv('LLAMA_CLOUD_PIPELINE_NAME', 'env-name')
		await ensurePipeline({ pipelineName: 'override-name' })
		expect(mockUpsert).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'override-name' }),
		)
	})
})
