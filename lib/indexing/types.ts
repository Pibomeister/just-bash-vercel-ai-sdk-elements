import { z } from 'zod'

export const IndexingConfigSchema = z.object({
	pipelineName: z.string().default('legal-documents'),
	projectId: z.string(),
	embeddingModel: z.string().default('text-embedding-3-small'),
	embeddingDimensions: z.number().int().positive().default(1536),
	chunkSize: z.number().int().positive().default(512),
	chunkOverlap: z.number().int().nonnegative().default(50),
})

export type IndexingConfig = z.infer<typeof IndexingConfigSchema>

export const IndexDocumentParamsSchema = z.object({
	documentId: z.string(),
	text: z.string(),
	metadata: z.record(z.string(), z.unknown()).optional(),
})

export type IndexDocumentParams = z.infer<typeof IndexDocumentParamsSchema>

export const SearchParamsSchema = z.object({
	query: z.string().min(1),
	documentType: z
		.enum(['contrato', 'ley', 'sentencia', 'nom', 'otro'])
		.optional(),
	alpha: z.number().min(0).max(1).default(0.5),
	topK: z.number().int().positive().default(20),
	rerankTopN: z.number().int().positive().default(5),
})

export type SearchParams = z.infer<typeof SearchParamsSchema>

export const SearchResultSchema = z.object({
	text: z.string(),
	score: z.number().nullable(),
	documentId: z.string().nullable(),
	metadata: z.record(z.string(), z.unknown()),
})

export type SearchResult = z.infer<typeof SearchResultSchema>

export const PipelineInfoSchema = z.object({
	id: z.string(),
	name: z.string(),
	status: z.string(),
})

export type PipelineInfo = z.infer<typeof PipelineInfoSchema>
