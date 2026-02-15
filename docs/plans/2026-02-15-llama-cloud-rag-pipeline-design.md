# Design: LlamaCloud RAG Pipeline for Mexican Legal Documents

**Date:** 2026-02-15
**Status:** Approved
**Approach:** Bottom-Up (pure functions first, integrate upward, deploy last)
**Isolation:** Feature branches per phase, merge to main after tests pass
**Testing:** Vitest (already configured, 85% coverage thresholds)

---

## Context

The project already has a working pipeline: PDF upload -> LlamaParse parsing (Vercel WDK) -> local storage -> bash-tool sandbox agent -> chat UI. This design extends it with structured metadata (JSON sidecar), semantic search (LlamaCloud indexing), and cloud storage (Vercel Blob).

### What Exists

| Layer | Status | Files |
|-------|--------|-------|
| PDF Upload | Working | `app/api/upload/route.ts` |
| LlamaParse parsing (WDK workflow) | Working | `workflows/parse-document.ts` |
| Local document storage | Working | `lib/document-storage.ts` |
| bash-tool sandbox (OverlayFs + Python) | Working | `lib/sandbox.ts` |
| Chat agent (GPT-5.2, streaming, reasoning) | Working | `app/api/chat/route.ts` |
| Rich UI (file tree, doc viewer, tools) | Working | `app/page.tsx` |

### Installed Packages (verified from node_modules)

- `@llamaindex/llama-cloud` v1.5.0 (SDK)
- `bash-tool` v1.3.14
- `just-bash` v2.10.0
- `workflow` v4.1.0-beta.57
- `ai` v6, `@ai-sdk/openai`, `zod`

### Research Sources

All verified in `ai/docs/research/llama-cloud-rag/`:
- `vectors-structured-extension-llama-cloud.md` (main research, 852 lines)
- `expansion/CORRECTIONS.md` (12 corrections with severity ratings)
- `expansion/llamaindex-llama-cloud-sdk.md` (verified API types)
- `expansion/llamaindex-framework-bash-tool.md` (verified bash-tool types)

---

## Why This Architecture

### The Problem: RAG Fails on Mexican Legal Documents

A traditional vector search (chunk -> embed -> retrieve) fails on Mexican legal text for three structural reasons, demonstrated with the Ley Aduanera:

1. **OCR Ordinal Corruption**: PDF OCR reads ordinal `o.` as zero `0.`. "Articulo 1o." becomes "ARTICULO 10." This means keyword searches for "Articulo 1" will never match, and searches for "ARTICULO 10" will find the wrong article.

2. **Transitorios Noise**: 50%+ of legislative documents are historical amendment decrees ("Transitorios"). A vector search returns chunks from derogated 1998 decrees as if they were current law.

3. **Outdated Monetary Amounts**: Fine amounts in article text are outdated. The legal source of truth is buried in annexes at the end (e.g., "ANEXO 13 DE LAS REGLAS GENERALES DE COMERCIO EXTERIOR PARA 2026"). A RAG system quotes the stale amount; a sidecar-guided agent knows to check the annex.

### The Solution: JSON Sidecar + Guided Bash Agent

The agent reads a structured `.meta.json` sidecar before accessing any document. The sidecar provides:
- **Table of contents** with line ranges and summaries
- **Warnings** about OCR quirks, outdated data, transitorios noise
- **Pre-built bash commands** (awk/sed/grep templates) for targeted extraction
- **Entity indexes** (dates, amounts, defined terms, legal references)

Vercel's own research validates this: replacing custom tools with filesystem + bash **cut costs 75%** and **improved success rate from 80% to 100%**.

---

## Phase Overview

| Phase | Branch | Scope | New Packages | Risk |
|-------|--------|-------|-------------|------|
| 1. Regex & Deterministic Extraction | `feat/sidecar-regex` | Pure functions | None | Lowest |
| 2. LLM-Enhanced Summaries | `feat/sidecar-llm` | AI SDK integration | None | Low |
| 3. Workflow Integration | `feat/sidecar-workflow` | Modify existing workflow | None | Medium |
| 4. LlamaCloud Indexing | `feat/llamacloud-indexing` | Pipeline + retrieval | None (SDK-only) | Medium |
| 5. Vercel Blob Storage | `feat/blob-storage` | Cloud storage migration | `@vercel/blob` | Highest |

---

## Phase 1: Mexican Legal Regex & Deterministic Extraction

**Branch:** `feat/sidecar-regex`
**Methodology:** TDD (pure functions, fully testable)

### New Files

```
lib/metadata/
  mexican-legal-regex.ts     # All regex patterns (OCR-aware)
  document-type-detector.ts  # contrato | ley | sentencia | nom | otro
  heading-extractor.ts       # Markdown headings -> TOC with line numbers
  entity-extractor.ts        # Dates, amounts, defined terms, legal refs
  topic-classifier.ts        # Section -> topic mapping by keywords
  navigation-builder.ts      # quickCommands + sectionsByTopic + warnings
  sidecar-generator.ts       # Orchestrator: all extractors -> sidecar JSON
  types.ts                   # Zod schemas for sidecar structure

test/lib/metadata/
  mexican-legal-regex.test.ts
  document-type-detector.test.ts
  heading-extractor.test.ts
  entity-extractor.test.ts
  topic-classifier.test.ts
  navigation-builder.test.ts
  sidecar-generator.test.ts

test/fixtures/
  contrato-sample.md         # ~50 lines realistic contract markdown
  ley-sample.md              # ~50 lines realistic legislation markdown
  sentencia-sample.md        # ~50 lines realistic court ruling markdown
```

### Sidecar Schema (Zod)

```typescript
// lib/metadata/types.ts

const TocEntrySchema = z.object({
  id: z.string(),
  heading: z.string(),
  level: z.number().int().min(1).max(6),
  lineStart: z.number().int().positive(),
  lineEnd: z.number().int().positive(),
  summary: z.string(),               // Empty in Phase 1, LLM-filled in Phase 2
  grepPattern: z.string(),
  isTransitoryOrAnnex: z.boolean(),  // Deterministic detection in Phase 1
  containsFines: z.boolean(),        // Deterministic detection in Phase 1
})

const EntitySchema = z.object({
  dates: z.array(z.object({
    value: z.string(),
    context: z.string(),
    line: z.number().int(),
  })),
  monetaryAmounts: z.array(z.object({
    value: z.string(),
    context: z.string(),
    line: z.number().int(),
  })),
  definedTerms: z.array(z.object({
    term: z.string(),
    definedAtLine: z.number().int(),
    usageLines: z.array(z.number().int()),
    article: z.string().optional(),   // Filled by LLM in Phase 2
    meaning: z.string().optional(),   // Filled by LLM in Phase 2
  })),
  legalReferences: z.array(z.object({
    type: z.enum(['ley', 'nom', 'dof', 'tesis']),
    reference: z.string(),
    line: z.number().int(),
  })),
})

const NavigationSchema = z.object({
  warnings: z.record(z.string()),    // Document-specific hazard alerts
  quickCommands: z.record(z.string()),
  sectionsByTopic: z.record(z.object({
    sections: z.array(z.string()),
    lineRange: z.tuple([z.number(), z.number()]),
  })),
})

const SidecarSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  generatedAt: z.string().datetime(),
  sourceFile: z.string(),
  sourceHash: z.string(),
  document: z.object({
    title: z.string(),
    type: z.enum(['contrato', 'ley', 'sentencia', 'nom', 'otro']),
    totalLines: z.number().int(),
    totalWords: z.number().int(),
    language: z.literal('es'),
    parties: z.array(z.object({
      name: z.string(),
      role: z.string(),
      definedAs: z.string(),
    })).optional(),
  }),
  tableOfContents: z.array(TocEntrySchema),
  entities: EntitySchema,
  navigation: NavigationSchema,
  legalPatterns: z.object({
    regexLibrary: z.record(z.string()),
  }),
})
```

### OCR-Aware Regex Patterns

```typescript
// lib/metadata/mexican-legal-regex.ts

export const MEXICAN_LEGAL_REGEX = {
  // Standard article pattern
  articles: String.raw`(?:Art[íi]culo|Art\.)\s+(?:Transitorio\s+)?\d{1,4}\s*(?:Bis|Ter|Qu[aá]ter)?`,

  // OCR-aware: handles ordinal 'o.' read as '0.' (e.g., ARTICULO 10. = Art 1o.)
  articlesOcrAware: String.raw`(?:ART[IÍ]CULO|Art[íi]culo|Art\.)\s+\d{1,4}[oO0]?\.?(?:\s*(?:Bis|Ter|Qu[aá]ter)(?:\s+\d+)?)?(?:-[A-Z])?\.?`,

  // Fractions, incisos (unchanged from research)
  fractions: String.raw`fracci[oó]n(?:es)?\s+[IVXLCDM]+(?:\s*[,y]\s*[IVXLCDM]+)*`,
  incisos: String.raw`inciso(?:s)?\s+[a-z]\)(?:\s*[,y]\s*[a-z]\))*`,

  // NOMs, DOF references
  noms: String.raw`NOM-\d{3}-[A-Z]{2,10}(?:\/[A-Z]{2,10})?-\d{4}`,
  dofShort: String.raw`DOF\s+\d{1,2}[-/]\d{1,2}[-/]\d{2,4}`,
  dofLong: String.raw`(?:publicad[oa]|reformad[oa])\s+en\s+el\s+Diario\s+Oficial\s+de\s+la\s+Federaci[oó]n\s+(?:el\s+)?\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+\d{4}`,

  // Contract clauses
  clausulas: String.raw`CL[AÁ]USULA\s+(?:PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|S[ÉE]PTIMA|OCTAVA|NOVENA|D[ÉE]CIMA(?:\s+(?:PRIMERA|SEGUNDA|TERCERA))?|VIG[ÉE]SIMA(?:\s+\w+)?|\d+)`,

  // Dates, monetary amounts, UMAs
  spanishDates: String.raw`\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+\d{4}`,
  pesos: String.raw`\$[\d,]+(?:\.\d{1,2})?\s*(?:M\.?N\.?|pesos|MXN)?`,
  umas: String.raw`[\d,]+(?:\.\d{1,2})?\s*(?:UMA[Ss]?|UDI[Ss]?|VSM)`,

  // Legal entities
  legalEntities: String.raw`S\.A\.(?:\s*de\s*C\.V\.)?|S\.\s*de\s*R\.L\.(?:\s*de\s*C\.V\.)?|S\.A\.P\.I\.(?:\s*de\s*C\.V\.)?|A\.C\.|S\.A\.S\.`,

  // Tesis/jurisprudencia
  tesis: String.raw`[Tt]esis\s+(?:\d{1,2}a\.\s*(?:\/J\.)?\s*)?\d{1,4}\/\d{4}\s*(?:\(\d{1,2}a\.\))?`,

  // Structural headers
  titulos: String.raw`T[IÍ]TULO\s+(?:PRIMERO|SEGUNDO|TERCERO|CUARTO|QUINTO|[IVXLC]+)`,
  capitulos: String.raw`CAP[IÍ]TULO\s+(?:[IVXLC]+|\d+)`,
  considerandos: String.raw`CONSIDERANDO\s*(?:PRIMERO|SEGUNDO|TERCERO|\d+)?`,
  resolutivos: String.raw`(?:PUNTOS?\s+)?RESOLUTIVOS?|R\s*E\s*S\s*U\s*E\s*L\s*V\s*E`,

  // Noise detection
  transitorios: String.raw`(?:TRANSITORIOS?|ART[IÍ]CULOS?\s+TRANSITORIOS?|DECRETO\s+(?:por|que))`,
  anexos: String.raw`ANEXO\s+\d+\s+(?:DE\s+LAS\s+)?(?:REGLAS\s+GENERALES)?`,

  // Fine/sanction detection
  fines: String.raw`(?:multa|sanci[oó]n|embargo|decomiso)\s+(?:de\s+)?\$[\d,]+`,
}
```

### Deterministic Hazard Detection

```typescript
// lib/metadata/navigation-builder.ts (partial)

function detectDocumentHazards(lines: string[]): Record<string, string> {
  const warnings: Record<string, string> = {}

  // OCR ordinal pattern detection
  const hasOcrOrdinals = lines.some(l => /ARTICULO\s+\d0\./.test(l))
  if (hasOcrOrdinals) {
    warnings.ocr_ordinals =
      "The ordinal 'o.' was OCR'd as '0.'. " +
      "Article 1o = ARTICULO 10., Article 2o = ARTICULO 20. " +
      "The readArticle quickCommand handles this automatically."
  }

  // Transitorios noise ratio
  const transitorioLine = lines.findIndex(
    l => /^(?:TRANSITORIOS|ART[IÍ]CULOS?\s+TRANSITORIOS)/i.test(l)
  )
  if (transitorioLine > 0) {
    const ratio = (lines.length - transitorioLine) / lines.length
    if (ratio > 0.2) {
      warnings.transitorios_noise =
        `${Math.round(ratio * 100)}% of document (from line ${transitorioLine + 1}) ` +
        `is Transitorios/historical decrees. These are NOT current law.`
    }
  }

  // Outdated fines warning (if annexes detected at end)
  const annexLine = lines.findIndex(
    l => /^ANEXO\s+\d+\s+DE\s+LAS\s+REGLAS\s+GENERALES/i.test(l)
  )
  if (annexLine > 0) {
    warnings.outdated_fines =
      'Fine amounts in article text may be outdated. ' +
      `The updated amounts are in the Annex section starting at line ${annexLine + 1}. ` +
      'Use findUpdatedFines quickCommand instead.'
  }

  return warnings
}
```

### Merge Criteria for Phase 1

- All regex patterns tested against 3+ fixtures (contrato, ley, sentencia)
- Document type detection >= 95% accuracy on fixtures
- TOC extraction produces correct line ranges
- Entity extraction finds all dates, amounts, legal refs in fixtures
- Zod schema validates the generated sidecar without errors
- All tests pass with `pnpm test`
- Branch: `feat/sidecar-regex` -> merge to `main`

---

## Phase 2: LLM-Enhanced Summaries

**Branch:** `feat/sidecar-llm`
**Methodology:** TDD (with mocked LLM responses)

### New Files

```
lib/metadata/
  llm-enrichment.ts     # generateObject call with domain-aware Zod schema
  sidecar-merger.ts      # Merge LLM output into Phase 1 deterministic sidecar

test/lib/metadata/
  llm-enrichment.test.ts  # Tests with mocked AI SDK responses
  sidecar-merger.test.ts
```

### LLM Enrichment Schema

```typescript
// lib/metadata/llm-enrichment.ts

const LlmEnrichmentSchema = z.object({
  title: z.string(),
  documentType: z.enum(['contrato', 'ley', 'sentencia', 'nom', 'otro']),
  parties: z.array(z.object({
    name: z.string(),
    role: z.string(),
    definedAs: z.string(),
  })).optional(),
  sections: z.array(z.object({
    id: z.string(),
    summary: z.string().describe('1-2 sentence summary for agent navigation'),
    isTransitoryOrAnnex: z.boolean().describe('TRUE if Decreto Transitorio or Annexo'),
    containsFines: z.boolean().describe('TRUE if imposes multas, embargos, sanciones'),
  })),
  definedTerms: z.array(z.object({
    term: z.string(),
    article: z.string().describe('Article where defined, e.g., "2o. fraccion XVI"'),
    meaning: z.string(),
  })),
  documentSpecificWarnings: z.array(z.string())
    .describe('Hazards: OCR quirks, outdated data, special interpretation rules'),
})
```

### LLM Call

```typescript
export async function enrichWithLlm(
  toc: TocEntry[],
  markdownPreview: string,
): Promise<z.infer<typeof LlmEnrichmentSchema>> {
  const { generateObject } = await import('ai')
  const { openai } = await import('@ai-sdk/openai')

  const { object } = await generateObject({
    model: openai('gpt-4o'),
    schema: LlmEnrichmentSchema,
    prompt: [
      'Analyze this Mexican legal document.',
      'ATTENTION: OCR may have read ordinal "o." as "0." (e.g., ARTICULO 10. = Art 1o).',
      'Classify rigorously whether sections are current articles or historical Transitorios.',
      '',
      `Sections:\n${toc.map(s => `[${s.id}] Lines ${s.lineStart}-${s.lineEnd}: ${s.heading}`).join('\n')}`,
      '',
      `Document (first 12000 chars):\n${markdownPreview.slice(0, 12000)}`,
    ].join('\n'),
  })

  return object
}
```

### Merge Criteria for Phase 2

- LLM enrichment tested with mocked `generateObject` responses
- Sidecar merger correctly overlays LLM data onto deterministic sidecar
- Zod validation passes on merged sidecar
- All tests pass with `pnpm test`
- Branch: `feat/sidecar-llm` -> merge to `main`

---

## Phase 3: Workflow Integration

**Branch:** `feat/sidecar-workflow`
**Methodology:** DDD (modifying existing workflow)

### Modified Files

```
workflows/parse-document.ts     # Add generateSidecarStep after parseWithSdk
lib/document-storage.ts         # Add saveSidecar() function
lib/types/documents.ts          # Add sidecarPath to DocumentMetadata
app/api/chat/route.ts           # Update system prompt with sidecar workflow
```

### Workflow Change

```typescript
// workflows/parse-document.ts — new step
async function generateSidecarStep(
  documentId: string,
  markdown: string,
  pageCount: number,
): Promise<SidecarSchema> {
  'use step'

  const { generateSidecar } = await import('@/lib/metadata/sidecar-generator')
  const { enrichWithLlm } = await import('@/lib/metadata/llm-enrichment')
  const { mergeLlmEnrichment } = await import('@/lib/metadata/sidecar-merger')

  // Pass 1: Deterministic extraction
  const baseSidecar = generateSidecar(markdown, `${documentId}.md`)

  // Pass 2: LLM enrichment
  const llmData = await enrichWithLlm(baseSidecar.tableOfContents, markdown)

  // Merge
  return mergeLlmEnrichment(baseSidecar, llmData)
}
```

### Updated Workflow Flow

```
parseDocumentWorkflow(documentId, fileName)
  1. parseWithSdk(documentId)           // Existing
  2. generateSidecarStep(...)           // NEW
  3. saveResultStep(documentId, ...)    // Modified: also saves sidecar
```

### Agent System Prompt Update

```typescript
// app/api/chat/route.ts — system prompt addition

const sidecarInstructions = `
## Document Navigation with Sidecars

Each document has a .meta.json sidecar alongside its content.md.

MANDATORY WORKFLOW:
1. ALWAYS read the metadata.json sidecar FIRST before accessing any document
2. Check navigation.warnings for document-specific hazards (OCR quirks, outdated data)
3. Scan tableOfContents summaries and isTransitoryOrAnnex flags
4. Use navigation.quickCommands templates for targeted extraction
5. For monetary amounts, check if containsFines is true and use findUpdatedFines
6. NEVER cat an entire .md file — always use sed -n 'START,ENDp' with line ranges

Example:
  cat /documents/{id}/metadata.json | jq '.tableOfContents[] | select(.id == "titulo-octavo")'
  sed -n '8200,10500p' /documents/{id}/content.md
`
```

### Merge Criteria for Phase 3

- Workflow produces sidecar alongside content.md for new uploads
- Existing documents still work (backward compatible)
- Agent system prompt includes sidecar workflow instructions
- Integration test: upload PDF -> verify sidecar generated -> verify agent uses it
- All tests pass with `pnpm test`
- Branch: `feat/sidecar-workflow` -> merge to `main`

---

## Phase 4: LlamaCloud Indexing & Semantic Retrieval

**Branch:** `feat/llamacloud-indexing`
**Methodology:** TDD (new modules)
**Decision:** SDK-only (`@llamaindex/llama-cloud`), no `llamaindex` framework

### New Files

```
lib/indexing/
  pipeline-manager.ts        # Create/upsert pipelines
  document-indexer.ts        # Push documents with sidecar metadata
  semantic-retriever.ts      # Hybrid search with alpha, reranking
  types.ts                   # Zod schemas for indexing config

test/lib/indexing/
  pipeline-manager.test.ts   # Tests with mocked LlamaCloud client
  document-indexer.test.ts
  semantic-retriever.test.ts
```

### Pipeline Configuration

```typescript
// lib/indexing/pipeline-manager.ts
export async function ensurePipeline(client: LlamaCloud) {
  return client.pipelines.upsert({
    name: 'legal-documents',
    project_id: process.env.LLAMA_CLOUD_PROJECT_ID,
    embedding_config: {
      type: 'OPENAI',
      model: 'text-embedding-3-small',
      dimensions: 1536,
    },
    transform_config: {
      mode: 'advanced',
      segmentation_config: { type: 'element' },
      chunking_config: {
        type: 'sentence',
        chunk_size: 512,
        chunk_overlap: 50,
      },
    },
    sparse_model_config: { enable: true },
  })
}
```

### Retrieval

```typescript
// lib/indexing/semantic-retriever.ts
export async function searchDocuments(
  client: LlamaCloud,
  pipelineId: string,
  query: string,
  options?: { alpha?: number; topK?: number; filters?: MetadataFilters },
) {
  return client.pipelines.retrieve(pipelineId, {
    query,
    alpha: options?.alpha ?? 0.5,
    dense_similarity_top_k: options?.topK ?? 20,
    sparse_similarity_top_k: options?.topK ?? 20,
    enable_reranking: true,
    rerank_top_n: 5,
    retrieval_mode: 'chunks',
    search_filters: options?.filters,
  })
}
```

### Workflow Integration

New step after sidecar generation:

```typescript
async function indexInPipelineStep(markdown: string, sidecar: SidecarSchema, documentId: string) {
  'use step'
  const { ensurePipeline } = await import('@/lib/indexing/pipeline-manager')
  const { indexDocument } = await import('@/lib/indexing/document-indexer')
  // ... push to LlamaCloud
}
```

### Chat Tool

```typescript
// New search tool for the agent
const searchTool = tool({
  description: 'Semantic search across all indexed legal documents. Use for broad queries.',
  parameters: z.object({
    query: z.string().describe('Natural language query in Spanish or English'),
    documentType: z.enum(['contrato', 'ley', 'sentencia', 'nom', 'all']).optional(),
  }),
  execute: async ({ query, documentType }) => {
    const filters = documentType && documentType !== 'all'
      ? { filters: [{ key: 'document_type', value: documentType, operator: 'eq' as const }], condition: 'and' as const }
      : undefined
    const results = await searchDocuments(client, pipelineId, query, { filters })
    return results.retrieval_nodes.map(n => ({
      text: n.text.slice(0, 500),
      score: n.score,
      document: n.metadata.file_name,
      page: n.metadata.page_number,
    }))
  },
})
```

### Merge Criteria for Phase 4

- Pipeline creation tested with mocked LlamaCloud client
- Document indexing includes sidecar metadata
- Retrieval returns ranked results with metadata
- Search tool integrated into chat agent
- All tests pass with `pnpm test`
- Branch: `feat/llamacloud-indexing` -> merge to `main`

---

## Phase 5: Vercel Blob Storage Migration

**Branch:** `feat/blob-storage`
**Methodology:** DDD (modifying existing storage layer)
**New Package:** `@vercel/blob`

### Modified Files

```
lib/document-storage.ts     # Add Blob backend alongside local
lib/sandbox.ts              # Fetch from Blob URLs at sandbox creation
lib/manifest.ts             # NEW: MANIFEST.json generation
app/api/documents/route.ts  # Support Blob listing
```

### Dual Backend

```typescript
// Environment variable controls backend
const STORAGE_BACKEND = process.env.STORAGE_BACKEND ?? 'local' // 'local' | 'blob'
```

### Sandbox Hydration from Blob

```typescript
async function hydrateFromBlob(): Promise<Record<string, string>> {
  const { list } = await import('@vercel/blob')
  const { blobs } = await list({ prefix: 'documents/' })
  const files: Record<string, string> = {}
  for (const blob of blobs) {
    if (blob.pathname.endsWith('.md') || blob.pathname.endsWith('.json')) {
      const res = await fetch(blob.url)
      files[`/${blob.pathname}`] = await res.text()
    }
  }
  return files
}
```

### MANIFEST.json

```typescript
// lib/manifest.ts
export async function generateManifest(): Promise<string> {
  // Lists all documents and produces:
  // { documents: [{ id, name, type, contentFile, sidecarFile, status }] }
}
```

### Merge Criteria for Phase 5

- Local storage still works with STORAGE_BACKEND=local
- Blob storage works with STORAGE_BACKEND=blob + BLOB_READ_WRITE_TOKEN
- Sandbox hydrates from Blob when configured
- MANIFEST.json generated and included in sandbox
- All tests pass with `pnpm test`
- Branch: `feat/blob-storage` -> merge to `main`

---

## Risk Assessment

| Phase | Risk | Mitigation |
|-------|------|------------|
| 1 | Regex false positives on edge cases | Extensive test fixtures with real legal text |
| 2 | LLM hallucination in summaries | Zod validation, deterministic fallback |
| 3 | Workflow step failure breaks pipeline | Error handling preserves content.md even if sidecar fails |
| 4 | LlamaCloud API changes | Pinned SDK version, verified types |
| 5 | Blob migration breaks local dev | Dual backend with env var switch |

---

## Estimated File Count

| Phase | New Files | Modified Files | Test Files |
|-------|-----------|----------------|------------|
| 1 | 8 | 0 | 7 + 3 fixtures |
| 2 | 2 | 0 | 2 |
| 3 | 0 | 4 | 1 integration |
| 4 | 4 | 2 | 3 |
| 5 | 1 | 3 | 2 |
| **Total** | **15** | **9** | **15 + 3** |
