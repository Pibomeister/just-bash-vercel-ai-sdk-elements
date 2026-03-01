import type { UIMessage } from 'ai'
import {
	buildSourceMap,
	type CitationSource,
	enrichSourceMap,
	scoreColor,
} from '@/components/ai-elements/citation-renderer'
import type { DocumentMetadata } from '@/lib/types/documents'

// ---------------------------------------------------------------------------
// scoreColor
// ---------------------------------------------------------------------------

describe('scoreColor', () => {
	it('returns muted classes for null score', () => {
		expect(scoreColor(null)).toBe('bg-muted text-muted-foreground')
	})

	it('returns emerald classes for score >= 0.8', () => {
		const result = scoreColor(0.8)
		expect(result).toContain('emerald')
	})

	it('returns emerald classes for score = 1.0', () => {
		const result = scoreColor(1.0)
		expect(result).toContain('emerald')
	})

	it('returns amber classes for score >= 0.5 and < 0.8', () => {
		const result = scoreColor(0.5)
		expect(result).toContain('amber')
	})

	it('returns amber classes for score = 0.79', () => {
		const result = scoreColor(0.79)
		expect(result).toContain('amber')
	})

	it('returns red classes for score < 0.5', () => {
		const result = scoreColor(0.49)
		expect(result).toContain('red')
	})

	it('returns red classes for score = 0', () => {
		const result = scoreColor(0)
		expect(result).toContain('red')
	})
})

// ---------------------------------------------------------------------------
// buildSourceMap
// ---------------------------------------------------------------------------

function makeMessage(parts: UIMessage['parts']): UIMessage {
	return {
		id: 'msg-1',
		role: 'assistant',
		parts,
	}
}

describe('buildSourceMap', () => {
	it('returns empty map for message with no parts', () => {
		const msg = makeMessage([])
		const map = buildSourceMap(msg)
		expect(map.size).toBe(0)
	})

	it('returns empty map for message with only text parts', () => {
		const msg = makeMessage([{ type: 'text', text: 'hello' }])
		const map = buildSourceMap(msg)
		expect(map.size).toBe(0)
	})

	it('extracts sources from bash citations field', () => {
		const msg = makeMessage([
			{
				type: 'tool-bash',
				state: 'output-available',
				output: {
					stdout: 'found /documents/doc-1/content.md',
					citations: [{ index: 1, text: 'foo', documentId: 'd1' }],
				},
			} as never,
		])
		const map = buildSourceMap(msg)
		expect(map.size).toBe(1)
		expect(map.get(1)).toEqual({
			index: 1,
			text: 'foo',
			score: null,
			documentId: 'd1',
		})
	})

	it('extracts sources from legacy __bashCitations field', () => {
		const msg = makeMessage([
			{
				type: 'tool-bash',
				state: 'output-available',
				output: {
					stdout: 'found /documents/doc-2/content.md',
					__bashCitations: [{ index: 2, text: 'bar', documentId: 'd2' }],
				},
			} as never,
		])
		const map = buildSourceMap(msg)
		expect(map.size).toBe(1)
		expect(map.get(2)).toEqual({
			index: 2,
			text: 'bar',
			score: null,
			documentId: 'd2',
		})
	})

	it('ignores searchDocuments parts not in output-available state', () => {
		const msg = makeMessage([
			{
				type: 'tool-searchDocuments',
				state: 'partial-call',
				output: undefined,
			} as never,
		])
		const map = buildSourceMap(msg)
		expect(map.size).toBe(0)
	})

	it('extracts sources from a single searchDocuments tool call', () => {
		const msg = makeMessage([
			{
				type: 'tool-searchDocuments',
				state: 'output-available',
				output: [
					{ index: 1, text: 'chunk one', score: 0.9, documentId: 'doc-a' },
					{ index: 2, text: 'chunk two', score: 0.7, documentId: 'doc-b' },
				],
			} as never,
		])

		const map = buildSourceMap(msg)

		expect(map.size).toBe(2)
		expect(map.get(1)).toEqual({
			index: 1,
			text: 'chunk one',
			score: 0.9,
			documentId: 'doc-a',
		})
		expect(map.get(2)).toEqual({
			index: 2,
			text: 'chunk two',
			score: 0.7,
			documentId: 'doc-b',
		})
	})

	it('merges results from multiple searchDocuments calls', () => {
		const msg = makeMessage([
			{
				type: 'tool-searchDocuments',
				state: 'output-available',
				output: [
					{ index: 1, text: 'first call', score: 0.8, documentId: 'doc-1' },
				],
			} as never,
			{ type: 'text', text: 'some intermediate text' },
			{
				type: 'tool-searchDocuments',
				state: 'output-available',
				output: [
					{ index: 2, text: 'second call', score: 0.6, documentId: 'doc-2' },
					{ index: 3, text: 'third item', score: 0.5, documentId: 'doc-3' },
				],
			} as never,
		])

		const map = buildSourceMap(msg)

		expect(map.size).toBe(3)
		expect(map.has(1)).toBe(true)
		expect(map.has(2)).toBe(true)
		expect(map.has(3)).toBe(true)
	})

	it('keeps shared indices stable across searchDocuments + bash', () => {
		const msg = makeMessage([
			{
				type: 'tool-searchDocuments',
				state: 'output-available',
				output: [
					{ index: 1, text: 'semantic hit', score: 0.91, documentId: 'doc-a' },
				],
			} as never,
			{
				type: 'tool-bash',
				state: 'output-available',
				output: {
					citations: [{ index: 2, text: 'bash hit', documentId: 'doc-b' }],
				},
			} as never,
		])

		const map = buildSourceMap(msg)
		expect(map.size).toBe(2)
		expect(map.get(1)?.text).toBe('semantic hit')
		expect(map.get(2)?.text).toBe('bash hit')
	})

	it('does not let bash overwrite an existing citation index', () => {
		const msg = makeMessage([
			{
				type: 'tool-searchDocuments',
				state: 'output-available',
				output: [
					{
						index: 1,
						text: 'semantic source',
						score: 0.88,
						documentId: 'doc-a',
					},
				],
			} as never,
			{
				type: 'tool-bash',
				state: 'output-available',
				output: {
					citations: [{ index: 1, text: 'bash source', documentId: 'doc-b' }],
				},
			} as never,
		])

		const map = buildSourceMap(msg)
		expect(map.size).toBe(1)
		expect(map.get(1)).toEqual({
			index: 1,
			text: 'semantic source',
			score: 0.88,
			documentId: 'doc-a',
		})
	})

	it('skips results without a numeric index', () => {
		const msg = makeMessage([
			{
				type: 'tool-searchDocuments',
				state: 'output-available',
				output: [
					{ index: 'not-a-number', text: 'bad', score: 0.5, documentId: 'd1' },
					{ index: 1, text: 'good', score: 0.9, documentId: 'd2' },
				],
			} as never,
		])

		const map = buildSourceMap(msg)
		expect(map.size).toBe(1)
		expect(map.has(1)).toBe(true)
	})

	it('handles output that is not an array', () => {
		const msg = makeMessage([
			{
				type: 'tool-searchDocuments',
				state: 'output-available',
				output: 'string result',
			} as never,
		])

		const map = buildSourceMap(msg)
		expect(map.size).toBe(0)
	})

	it('preserves null score and documentId', () => {
		const msg = makeMessage([
			{
				type: 'tool-searchDocuments',
				state: 'output-available',
				output: [{ index: 1, text: 'no score', score: null, documentId: null }],
			} as never,
		])

		const map = buildSourceMap(msg)
		const source = map.get(1)
		expect(source?.score).toBeNull()
		expect(source?.documentId).toBeNull()
	})

	// -----------------------------------------------------------------------
	// dynamic-tool support
	// -----------------------------------------------------------------------

	it('extracts sources from dynamic-tool bash part', () => {
		const msg = makeMessage([
			{
				type: 'dynamic-tool',
				toolName: 'bash',
				state: 'output-available',
				output: {
					stdout: 'some output',
					citations: [{ index: 1, text: 'dynamic hit', documentId: 'doc-d' }],
				},
			} as never,
		])

		const map = buildSourceMap(msg)
		expect(map.size).toBe(1)
		expect(map.get(1)).toEqual({
			index: 1,
			text: 'dynamic hit',
			score: null,
			documentId: 'doc-d',
		})
	})

	it('extracts sources from dynamic-tool searchDocuments part', () => {
		const msg = makeMessage([
			{
				type: 'dynamic-tool',
				toolName: 'searchDocuments',
				state: 'output-available',
				output: [
					{
						index: 1,
						text: 'dynamic search',
						score: 0.95,
						documentId: 'doc-s',
					},
				],
			} as never,
		])

		const map = buildSourceMap(msg)
		expect(map.size).toBe(1)
		expect(map.get(1)).toEqual({
			index: 1,
			text: 'dynamic search',
			score: 0.95,
			documentId: 'doc-s',
		})
	})

	// -----------------------------------------------------------------------
	// JSON-stringified output
	// -----------------------------------------------------------------------

	it('parses JSON-stringified bash output', () => {
		const msg = makeMessage([
			{
				type: 'tool-bash',
				state: 'output-available',
				output: JSON.stringify({
					stdout: 'grep result',
					citations: [{ index: 1, text: 'stringified', documentId: 'doc-j' }],
				}),
			} as never,
		])

		const map = buildSourceMap(msg)
		expect(map.size).toBe(1)
		expect(map.get(1)?.text).toBe('stringified')
		expect(map.get(1)?.documentId).toBe('doc-j')
	})

	it('parses JSON-stringified searchDocuments output', () => {
		const msg = makeMessage([
			{
				type: 'tool-searchDocuments',
				state: 'output-available',
				output: JSON.stringify([
					{ index: 1, text: 'json search', score: 0.8, documentId: 'doc-js' },
				]),
			} as never,
		])

		const map = buildSourceMap(msg)
		expect(map.size).toBe(1)
		expect(map.get(1)?.text).toBe('json search')
	})

	it('ignores non-JSON string output gracefully', () => {
		const msg = makeMessage([
			{
				type: 'tool-bash',
				state: 'output-available',
				output: 'not valid json at all',
			} as never,
		])

		const map = buildSourceMap(msg)
		expect(map.size).toBe(0)
	})
})

// ---------------------------------------------------------------------------
// enrichSourceMap
// ---------------------------------------------------------------------------

function makeDocuments(
	entries: Array<{ documentId: string; originalName: string }>,
): DocumentMetadata[] {
	return entries.map((e) => ({
		documentId: e.documentId,
		fileName: e.originalName,
		originalName: e.originalName,
		mimeType: 'application/pdf',
		fileSize: 1024,
		uploadedAt: '2026-01-01T00:00:00Z',
		status: 'completed' as const,
	}))
}

describe('enrichSourceMap', () => {
	it('enriches sources with document titles (extension stripped)', () => {
		const sourceMap = new Map<number, CitationSource>([
			[1, { index: 1, text: 'chunk', score: 0.9, documentId: 'doc-1' }],
		])
		const docs = makeDocuments([
			{ documentId: 'doc-1', originalName: 'Ley Aduanera.pdf' },
		])

		const enriched = enrichSourceMap(sourceMap, docs)

		expect(enriched.get(1)?.title).toBe('Ley Aduanera')
	})

	it('preserves originalName with extension for file type detection', () => {
		const sourceMap = new Map<number, CitationSource>([
			[1, { index: 1, text: 'chunk', score: 0.9, documentId: 'doc-1' }],
		])
		const docs = makeDocuments([
			{ documentId: 'doc-1', originalName: 'Ley Aduanera.pdf' },
		])

		const enriched = enrichSourceMap(sourceMap, docs)

		expect(enriched.get(1)?.originalName).toBe('Ley Aduanera.pdf')
	})

	it('sets originalName to "Unknown document" when document not found', () => {
		const sourceMap = new Map<number, CitationSource>([
			[1, { index: 1, text: 'orphan', score: 0.4, documentId: null }],
		])

		const enriched = enrichSourceMap(sourceMap, [])

		expect(enriched.get(1)?.originalName).toBe('Unknown document')
	})

	it('strips various file extensions', () => {
		const sourceMap = new Map<number, CitationSource>([
			[1, { index: 1, text: 'a', score: 0.5, documentId: 'doc-1' }],
			[2, { index: 2, text: 'b', score: 0.6, documentId: 'doc-2' }],
			[3, { index: 3, text: 'c', score: 0.7, documentId: 'doc-3' }],
		])
		const docs = makeDocuments([
			{ documentId: 'doc-1', originalName: 'Contract.docx' },
			{ documentId: 'doc-2', originalName: 'Report.xlsx' },
			{ documentId: 'doc-3', originalName: 'Notes.txt' },
		])

		const enriched = enrichSourceMap(sourceMap, docs)

		expect(enriched.get(1)?.title).toBe('Contract')
		expect(enriched.get(2)?.title).toBe('Report')
		expect(enriched.get(3)?.title).toBe('Notes')
	})

	it('falls back to "Unknown document" when documentId is null', () => {
		const sourceMap = new Map<number, CitationSource>([
			[1, { index: 1, text: 'orphan', score: 0.4, documentId: null }],
		])

		const enriched = enrichSourceMap(sourceMap, [])

		expect(enriched.get(1)?.title).toBe('Unknown document')
	})

	it('falls back to "Unknown document" when documentId not found in docs', () => {
		const sourceMap = new Map<number, CitationSource>([
			[1, { index: 1, text: 'orphan', score: 0.4, documentId: 'missing-id' }],
		])
		const docs = makeDocuments([
			{ documentId: 'other-id', originalName: 'Other.pdf' },
		])

		const enriched = enrichSourceMap(sourceMap, docs)

		expect(enriched.get(1)?.title).toBe('Unknown document')
	})

	it('preserves all original CitationSource fields', () => {
		const sourceMap = new Map<number, CitationSource>([
			[5, { index: 5, text: 'passage', score: 0.88, documentId: 'doc-x' }],
		])
		const docs = makeDocuments([
			{ documentId: 'doc-x', originalName: 'File.md' },
		])

		const enriched = enrichSourceMap(sourceMap, docs)
		const result = enriched.get(5)

		expect(result).toEqual({
			index: 5,
			text: 'passage',
			score: 0.88,
			documentId: 'doc-x',
			title: 'File',
			originalName: 'File.md',
		})
	})

	it('handles empty source map', () => {
		const sourceMap = new Map<number, CitationSource>()
		const enriched = enrichSourceMap(sourceMap, [])
		expect(enriched.size).toBe(0)
	})

	it('handles file names with multiple dots', () => {
		const sourceMap = new Map<number, CitationSource>([
			[1, { index: 1, text: 'x', score: 0.5, documentId: 'doc-1' }],
		])
		const docs = makeDocuments([
			{ documentId: 'doc-1', originalName: 'my.special.file.pdf' },
		])

		const enriched = enrichSourceMap(sourceMap, docs)
		expect(enriched.get(1)?.title).toBe('my.special.file')
	})
})
