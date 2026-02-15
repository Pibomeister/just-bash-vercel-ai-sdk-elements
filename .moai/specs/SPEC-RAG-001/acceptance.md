# SPEC-RAG-001: Acceptance Criteria

> LlamaCloud RAG Pipeline for Mexican Legal Documents

---

## Module 1: Deterministic Metadata Extraction

### Scenario 1.1: Ley document type detection

**Given** the `ley-sample.md` fixture containing TITULOS, CAPITULOS, ARTICULOS, and TRANSITORIOS
**When** `detectDocumentType(markdown)` is called
**Then** it returns `'ley'`

### Scenario 1.2: Contrato document type detection

**Given** the `contrato-sample.md` fixture containing CLAUSULAS, DECLARACIONES, and party definitions
**When** `detectDocumentType(markdown)` is called
**Then** it returns `'contrato'`

### Scenario 1.3: Sentencia document type detection

**Given** the `sentencia-sample.md` fixture containing RESULTANDO, CONSIDERANDO, and RESUELVE sections
**When** `detectDocumentType(markdown)` is called
**Then** it returns `'sentencia'`

### Scenario 1.4: Unknown document returns 'otro'

**Given** a markdown string containing only plain prose with no structural legal patterns (no ARTICULOS, CLAUSULAS, CONSIDERANDO, or NOM references)
**When** `detectDocumentType(markdown)` is called
**Then** it returns `'otro'`

### Scenario 1.5: OCR ordinal regex matching (ARTICULO 10. = Art 1o.)

**Given** a line containing `"ARTICULO 10. Esta Ley, las de los Impuestos Generales..."` where `10.` is the OCR-corrupted ordinal of `1o.`
**When** the `articlesOcrAware` regex from `MEXICAN_LEGAL_REGEX` is tested against the line
**Then** the regex matches the full article reference `"ARTICULO 10."`
**And** the OCR warning is included in the sidecar's `navigation.warnings.ocr_ordinals` field

### Scenario 1.6: Sidecar validates against SidecarSchema

**Given** the `ley-sample.md` fixture is processed by `generateSidecar(markdown, 'ley-sample.md')`
**When** the output object is validated with `SidecarSchema.parse(sidecar)`
**Then** validation succeeds without throwing
**And** `sidecar.schemaVersion` equals `'1.0.0'`
**And** `sidecar.document.type` equals `'ley'`
**And** `sidecar.document.language` equals `'es'`
**And** `sidecar.tableOfContents` is a non-empty array
**And** `sidecar.entities.monetaryAmounts` is a non-empty array

### Scenario 1.7: Transitorios noise warning generated

**Given** the `ley-sample.md` fixture where >20% of lines after the first TRANSITORIOS marker are historical decrees
**When** `generateSidecar(markdown, 'ley-sample.md')` is called
**Then** `sidecar.navigation.warnings.transitorios_noise` is a non-empty string
**And** the warning contains the word "Transitorios"
**And** the warning contains a percentage value

### Scenario 1.8: Outdated fines warning generated

**Given** the `ley-sample.md` fixture containing an `ANEXO 13 DE LAS REGLAS GENERALES DE COMERCIO EXTERIOR` section at the end
**When** `generateSidecar(markdown, 'ley-sample.md')` is called
**Then** `sidecar.navigation.warnings.outdated_fines` is a non-empty string
**And** the warning mentions "Annex" or "Anexo"
**And** the warning includes the line number where the annex section starts

### Scenario 1.9: TOC extraction produces correct line ranges

**Given** the `ley-sample.md` fixture with multiple TITULO and CAPITULO headings
**When** `generateSidecar(markdown, 'ley-sample.md')` is called
**Then** each entry in `sidecar.tableOfContents` has `lineStart` less than `lineEnd`
**And** no two entries have overlapping line ranges
**And** `lineEnd` of the last entry does not exceed `sidecar.document.totalLines`

### Scenario 1.10: Entity extraction finds dates, amounts, and legal references

**Given** the `contrato-sample.md` fixture containing dates (`15 de enero de 2026`), amounts (`$150,000.00`), UMAs (`50 UMAs`), and legal references (`NOM-035-STPS-2018`, `tesis 2a./J. 47/2014`)
**When** `generateSidecar(markdown, 'contrato-sample.md')` is called
**Then** `sidecar.entities.dates` contains at least one entry with value matching `15 de enero de 2026`
**And** `sidecar.entities.monetaryAmounts` contains at least one entry with value matching `$150,000.00`
**And** `sidecar.entities.legalReferences` contains at least one entry with type `'nom'`
**And** `sidecar.entities.legalReferences` contains at least one entry with type `'tesis'`

### Scenario 1.11: Quick commands generated for ley document

**Given** the `ley-sample.md` fixture
**When** `generateSidecar(markdown, 'ley-sample.md')` is called
**Then** `sidecar.navigation.quickCommands` is a non-empty object
**And** at least one quick command key references article extraction (e.g., `readArticle`)
**And** at least one quick command key references fine lookup (e.g., `findUpdatedFines`)

### Scenario 1.12: Empty document does not crash

**Given** an empty string `""` as markdown input
**When** `generateSidecar('', 'empty.md')` is called
**Then** the function does not throw
**And** the result validates against `SidecarSchema`
**And** `sidecar.document.type` equals `'otro'`
**And** `sidecar.tableOfContents` is an empty array

---

## Module 2: LLM-Enhanced Summaries

### Scenario 2.1: LLM enrichment produces summaries (mocked)

**Given** a deterministic sidecar from Phase 1 with 5 TOC entries that have empty `summary` fields
**And** a mocked `generateObject` from AI SDK that returns an `LlmEnrichmentSchema`-conforming object with 5 section summaries
**When** `enrichWithLlm(sidecar.tableOfContents, markdownPreview)` is called
**Then** the result validates against `LlmEnrichmentSchema`
**And** `result.sections` has length 5
**And** each section in `result.sections` has a non-empty `summary` string

### Scenario 2.2: Merger preserves deterministic fields

**Given** a deterministic sidecar with `sidecar.entities.dates` containing 3 entries and `sidecar.navigation.warnings.ocr_ordinals` set
**And** an LLM enrichment result with section summaries, parties, and defined terms
**When** `mergeLlmEnrichment(sidecar, llmData)` is called
**Then** the merged sidecar still has exactly 3 entries in `entities.dates`
**And** `navigation.warnings.ocr_ordinals` is preserved unchanged
**And** each TOC entry's `summary` field is now populated from the LLM data
**And** `document.parties` is populated from the LLM data

### Scenario 2.3: LLM failure returns deterministic sidecar

**Given** a deterministic sidecar from Phase 1 that is fully valid
**And** a mocked `generateObject` that throws a network error
**When** the sidecar generation pipeline handles the LLM enrichment step
**Then** the pipeline does not throw
**And** the returned sidecar is the original deterministic sidecar without LLM fields
**And** the returned sidecar validates against `SidecarSchema`

### Scenario 2.4: Merged sidecar validates against schema

**Given** a deterministic sidecar and a valid LLM enrichment result
**When** `mergeLlmEnrichment(sidecar, llmData)` is called
**And** the result is parsed with `SidecarSchema.parse(merged)`
**Then** validation succeeds without throwing
**And** `merged.schemaVersion` equals `'1.0.0'`

### Scenario 2.5: LLM enrichment respects OCR ordinal context in prompt

**Given** a ley document sidecar with the `ocr_ordinals` warning set
**When** `enrichWithLlm(sidecar.tableOfContents, markdownPreview)` is called (mocked)
**Then** the prompt sent to the LLM includes the string "OCR" and references ordinal corruption
**And** the mocked response correctly identifies `ARTICULO 10.` as `Art 1o.`

---

## Module 3: Workflow Integration

### Scenario 3.1: Workflow generates sidecar alongside content.md

**Given** a PDF file uploaded via `POST /api/upload`
**When** the `parseDocumentWorkflow` completes all steps (parseWithSdk, generateSidecarStep, saveResultStep)
**Then** a `content.md` file is saved for the document
**And** a `metadata.json` sidecar file is saved alongside it
**And** the sidecar file validates against `SidecarSchema`

### Scenario 3.2: Sidecar failure does not break parsing

**Given** a PDF file uploaded via `POST /api/upload`
**And** the `generateSidecarStep` function throws an error (e.g., regex timeout or unexpected markdown structure)
**When** the `parseDocumentWorkflow` completes
**Then** the `content.md` file is still saved successfully
**And** the document metadata in storage reflects a completed status
**And** no sidecar file is saved (or a minimal fallback sidecar is saved)

### Scenario 3.3: Sidecar accessible from sandbox

**Given** a document has been processed with both `content.md` and `metadata.json` saved
**When** the bash-tool sandbox is initialized for a chat session with that document
**Then** the sandbox filesystem contains the file at `/documents/{id}/metadata.json`
**And** `cat /documents/{id}/metadata.json | jq '.document.type'` returns a valid document type string

### Scenario 3.4: System prompt contains sidecar instructions

**Given** the chat agent is initialized via `POST /api/chat`
**When** the system prompt is composed
**Then** the system prompt includes the text "ALWAYS read the metadata.json sidecar FIRST"
**And** the system prompt includes references to `navigation.warnings`
**And** the system prompt includes references to `quickCommands`

### Scenario 3.5: Backward compatibility (old docs without sidecar)

**Given** a document was processed before the sidecar feature existed (no `metadata.json` file)
**When** the bash-tool sandbox is initialized for a chat session with that document
**Then** the sandbox filesystem contains the `content.md` file
**And** the sandbox does not contain a `metadata.json` file
**And** the chat agent does not crash or error when no sidecar is found

### Scenario 3.6: DocumentMetadata type includes sidecarPath

**Given** the `DocumentMetadata` type in `lib/types/documents.ts`
**When** a document is processed with sidecar generation
**Then** `metadata.sidecarPath` is a string pointing to the sidecar file location
**And** for legacy documents without sidecars, `metadata.sidecarPath` is `undefined`

---

## Module 4: LlamaCloud Indexing & Semantic Retrieval

### Scenario 4.1: Pipeline upsert with correct config

**Given** a mocked LlamaCloud client with `pipelines.upsert` method
**When** `ensurePipeline(client)` is called
**Then** `pipelines.upsert` is called with `name: 'legal-documents'`
**And** `embedding_config.model` equals `'text-embedding-3-small'`
**And** `embedding_config.dimensions` equals `1536`
**And** `transform_config.chunking_config.chunk_size` equals `512`
**And** `sparse_model_config.enable` equals `true`

### Scenario 4.2: Document indexed with sidecar metadata

**Given** a mocked LlamaCloud client and a valid pipeline ID
**And** a processed document with `content.md` and a sidecar containing `document.type: 'ley'` and `document.title: 'LEY ADUANERA'`
**When** `indexDocument(client, pipelineId, markdown, sidecar, documentId)` is called
**Then** the document is pushed to LlamaCloud with metadata including `document_type: 'ley'`
**And** metadata includes `document_title: 'LEY ADUANERA'`
**And** metadata includes `source_file` matching the document ID

### Scenario 4.3: Semantic search returns ranked results

**Given** a mocked LlamaCloud client with `pipelines.retrieve` returning 5 nodes with scores
**When** `searchDocuments(client, pipelineId, 'multas por importacion ilegal')` is called
**Then** the result contains `retrieval_nodes` with length 5
**And** each node has a `text`, `score`, and `metadata` property
**And** results are ordered by descending `score`

### Scenario 4.4: Search tool available in chat agent

**Given** the chat agent configuration in `app/api/chat/route.ts`
**When** the tools are registered for the agent
**Then** a `searchDocuments` tool (or equivalent semantic search tool) is present
**And** the tool accepts a `query` string parameter
**And** the tool accepts an optional `documentType` parameter with enum values `['contrato', 'ley', 'sentencia', 'nom', 'all']`

### Scenario 4.5: Search with document type filter

**Given** a mocked LlamaCloud client
**When** `searchDocuments(client, pipelineId, 'clausula de confidencialidad', { filters: { filters: [{ key: 'document_type', value: 'contrato', operator: 'eq' }], condition: 'and' } })` is called
**Then** the `search_filters` parameter in the retrieve call includes the `document_type` filter
**And** only results matching `document_type: 'contrato'` are returned

### Scenario 4.6: Search with no results returns empty array

**Given** a mocked LlamaCloud client with `pipelines.retrieve` returning zero nodes
**When** `searchDocuments(client, pipelineId, 'nonexistent legal concept xyz')` is called
**Then** the result contains an empty `retrieval_nodes` array
**And** the function does not throw

---

## Module 5: Vercel Blob Storage Migration

### Scenario 5.1: Local backend unchanged (default)

**Given** `STORAGE_BACKEND` environment variable is not set (or set to `'local'`)
**When** a document is saved via `saveDocument(documentId, content, sidecar)`
**Then** files are written to the local filesystem under the documents directory
**And** no calls are made to `@vercel/blob` APIs
**And** the document is retrievable via the existing local storage path

### Scenario 5.2: Blob backend stores documents

**Given** `STORAGE_BACKEND` is set to `'blob'`
**And** `BLOB_READ_WRITE_TOKEN` is set to a valid token
**When** a document is saved via `saveDocument(documentId, content, sidecar)`
**Then** `content.md` is uploaded to Vercel Blob at path `documents/{id}/content.md`
**And** `metadata.json` is uploaded to Vercel Blob at path `documents/{id}/metadata.json`
**And** both uploads succeed without error

### Scenario 5.3: Sandbox hydrates from blob

**Given** `STORAGE_BACKEND` is set to `'blob'`
**And** Vercel Blob contains `documents/{id}/content.md` and `documents/{id}/metadata.json`
**When** the bash-tool sandbox is initialized for a chat session
**Then** `hydrateFromBlob()` is called to fetch all `.md` and `.json` files from the blob prefix
**And** the sandbox filesystem contains `/documents/{id}/content.md`
**And** the sandbox filesystem contains `/documents/{id}/metadata.json`

### Scenario 5.4: MANIFEST.json generated

**Given** 3 documents have been stored (2 with sidecars, 1 legacy without sidecar)
**When** `generateManifest()` is called
**Then** the result is a valid JSON string
**And** the parsed manifest has a `documents` array with 3 entries
**And** each entry has `id`, `name`, `type`, `contentFile`, and `status` fields
**And** the 2 documents with sidecars have a `sidecarFile` field set
**And** the 1 legacy document has `sidecarFile` set to `null` or absent

### Scenario 5.5: Blob backend unavailable falls back gracefully

**Given** `STORAGE_BACKEND` is set to `'blob'`
**And** `BLOB_READ_WRITE_TOKEN` is invalid or the Blob service is unreachable
**When** a document save is attempted
**Then** an error is thrown with a descriptive message mentioning Blob connectivity
**And** no partial files are left in an inconsistent state

### Scenario 5.6: Sandbox hydration handles mixed storage

**Given** `STORAGE_BACKEND` is set to `'blob'`
**And** Vercel Blob contains documents, some with sidecars and some without
**When** the sandbox is hydrated via `hydrateFromBlob()`
**Then** all `.md` and `.json` files are fetched
**And** documents without `metadata.json` are hydrated with only `content.md`
**And** the sandbox does not crash for documents missing sidecars

---

## Quality Gates

- [ ] All tests pass: `pnpm test`
- [ ] Coverage >= 85%: `pnpm test:coverage`
- [ ] Type check passes: `pnpm typecheck`
- [ ] Lint passes: `pnpm lint`
- [ ] Biome passes: `pnpm biome:check`
- [ ] No regressions in existing functionality
