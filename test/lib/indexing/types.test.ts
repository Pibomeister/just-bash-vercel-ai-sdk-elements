import {
	IndexDocumentParamsSchema,
	IndexingConfigSchema,
	PipelineInfoSchema,
	SearchParamsSchema,
	SearchResultSchema,
} from '@/lib/indexing/types'

describe('IndexingConfigSchema', () => {
	it('parses a valid config with all fields', () => {
		const config = {
			pipelineName: 'my-pipeline',
			projectId: 'proj-123',
			embeddingModel: 'text-embedding-3-large',
			embeddingDimensions: 3072,
			chunkSize: 1024,
			chunkOverlap: 100,
		}
		expect(IndexingConfigSchema.parse(config)).toEqual(config)
	})

	it('applies default values', () => {
		const config = { projectId: 'proj-123' }
		const parsed = IndexingConfigSchema.parse(config)
		expect(parsed.pipelineName).toBe('legal-documents')
		expect(parsed.embeddingModel).toBe('text-embedding-3-small')
		expect(parsed.embeddingDimensions).toBe(1536)
		expect(parsed.chunkSize).toBe(512)
		expect(parsed.chunkOverlap).toBe(50)
	})

	it('rejects missing projectId', () => {
		expect(() => IndexingConfigSchema.parse({})).toThrow()
	})

	it('rejects negative embeddingDimensions', () => {
		expect(() =>
			IndexingConfigSchema.parse({
				projectId: 'proj-123',
				embeddingDimensions: -1,
			}),
		).toThrow()
	})

	it('rejects non-integer chunkSize', () => {
		expect(() =>
			IndexingConfigSchema.parse({
				projectId: 'proj-123',
				chunkSize: 512.5,
			}),
		).toThrow()
	})

	it('rejects negative chunkOverlap', () => {
		expect(() =>
			IndexingConfigSchema.parse({
				projectId: 'proj-123',
				chunkOverlap: -10,
			}),
		).toThrow()
	})
})

describe('IndexDocumentParamsSchema', () => {
	it('parses valid params with metadata', () => {
		const params = {
			documentId: 'doc-1',
			text: 'Some document content',
			metadata: { source: 'upload', type: 'ley' },
		}
		expect(IndexDocumentParamsSchema.parse(params)).toEqual(params)
	})

	it('parses valid params without metadata', () => {
		const params = { documentId: 'doc-1', text: 'Content' }
		const parsed = IndexDocumentParamsSchema.parse(params)
		expect(parsed.metadata).toBeUndefined()
	})

	it('rejects missing documentId', () => {
		expect(() => IndexDocumentParamsSchema.parse({ text: 'Content' })).toThrow()
	})

	it('rejects missing text', () => {
		expect(() =>
			IndexDocumentParamsSchema.parse({ documentId: 'doc-1' }),
		).toThrow()
	})
})

describe('SearchParamsSchema', () => {
	it('parses valid search params with defaults', () => {
		const parsed = SearchParamsSchema.parse({ query: 'responsabilidad civil' })
		expect(parsed.query).toBe('responsabilidad civil')
		expect(parsed.alpha).toBe(0.5)
		expect(parsed.topK).toBe(20)
		expect(parsed.rerankTopN).toBe(5)
		expect(parsed.documentType).toBeUndefined()
	})

	it('parses with documentType filter', () => {
		const parsed = SearchParamsSchema.parse({
			query: 'test',
			documentType: 'contrato',
		})
		expect(parsed.documentType).toBe('contrato')
	})

	it('accepts all valid document types', () => {
		for (const type of ['contrato', 'ley', 'sentencia', 'nom', 'otro']) {
			expect(() =>
				SearchParamsSchema.parse({ query: 'test', documentType: type }),
			).not.toThrow()
		}
	})

	it('rejects invalid documentType', () => {
		expect(() =>
			SearchParamsSchema.parse({ query: 'test', documentType: 'invalid' }),
		).toThrow()
	})

	it('rejects empty query string', () => {
		expect(() => SearchParamsSchema.parse({ query: '' })).toThrow()
	})

	it('rejects alpha below 0', () => {
		expect(() =>
			SearchParamsSchema.parse({ query: 'test', alpha: -0.1 }),
		).toThrow()
	})

	it('rejects alpha above 1', () => {
		expect(() =>
			SearchParamsSchema.parse({ query: 'test', alpha: 1.1 }),
		).toThrow()
	})

	it('accepts alpha at boundaries (0 and 1)', () => {
		expect(SearchParamsSchema.parse({ query: 'test', alpha: 0 }).alpha).toBe(0)
		expect(SearchParamsSchema.parse({ query: 'test', alpha: 1 }).alpha).toBe(1)
	})

	it('rejects non-positive topK', () => {
		expect(() => SearchParamsSchema.parse({ query: 'test', topK: 0 })).toThrow()
	})

	it('rejects non-positive rerankTopN', () => {
		expect(() =>
			SearchParamsSchema.parse({ query: 'test', rerankTopN: 0 }),
		).toThrow()
	})
})

describe('SearchResultSchema', () => {
	it('parses a valid search result', () => {
		const result = {
			text: 'Some relevant text',
			score: 0.95,
			documentId: 'doc-1',
			metadata: { documentType: 'ley' },
		}
		expect(SearchResultSchema.parse(result)).toEqual(result)
	})

	it('accepts null score and documentId', () => {
		const result = {
			text: 'Text',
			score: null,
			documentId: null,
			metadata: {},
		}
		expect(SearchResultSchema.parse(result)).toEqual(result)
	})
})

describe('PipelineInfoSchema', () => {
	it('parses valid pipeline info', () => {
		const info = { id: 'pipe-1', name: 'legal-documents', status: 'ACTIVE' }
		expect(PipelineInfoSchema.parse(info)).toEqual(info)
	})

	it('rejects missing id', () => {
		expect(() =>
			PipelineInfoSchema.parse({ name: 'test', status: 'ACTIVE' }),
		).toThrow()
	})
})
