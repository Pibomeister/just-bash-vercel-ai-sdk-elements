---
id: SPEC-RAG-001
version: "1.0.0"
status: approved
created: "2026-02-15"
updated: "2026-02-15"
author: MoAI
priority: high
---

## HISTORY

| Date | Version | Change |
|------|---------|--------|
| 2026-02-15 | 1.0.0 | Initial creation from approved design doc and implementation plan |

---

# SPEC-RAG-001: LlamaCloud RAG Pipeline for Mexican Legal Documents

## Overview

This specification defines a Retrieval-Augmented Generation (RAG) pipeline purpose-built for Mexican legal documents. The system ingests markdown-parsed legal texts (contratos, leyes, sentencias, NOMs), produces rich deterministic metadata sidecars enhanced by LLM enrichment, indexes content into LlamaCloud for hybrid semantic search, and exposes retrieval tools to an AI chat agent running inside a simulated bash sandbox. A storage abstraction layer enables migration from local filesystem to Vercel Blob without changing application logic.

The pipeline is divided into five modules that build on each other: deterministic metadata extraction, LLM-enhanced enrichment, workflow integration, semantic indexing via LlamaCloud, and cloud storage migration.

---

## Module 1: Deterministic Metadata Extraction

### Environment

- Runtime: Node.js with TypeScript strict mode
- Validation: Zod v4 schemas (`SidecarSchema`)
- Input: Markdown text produced by the WDK `parseWithSdk` step
- Output: A JSON sidecar file conforming to `SidecarSchema`

### Assumptions

- All input documents are in Spanish and follow Mexican legal formatting conventions.
- OCR-processed documents may contain corrupted ordinals (e.g., "ARTICULO 10." instead of "Articulo 1o.").
- The regex library operates deterministically without any LLM dependency.
- Line numbers referenced in sidecar output are 1-based.

### Requirements

**R1.1 (Ubiquitous):** The sidecar output **shall always** validate against `SidecarSchema` (Zod) without errors.

**R1.2 (Event-Driven):** **When** markdown text is provided to the document type detector, **the system shall** classify it as one of `contrato | ley | sentencia | nom | otro` with >=95% accuracy on test fixtures.

**R1.3 (Event-Driven):** **When** markdown text is provided to the heading extractor, **the system shall** produce `TocEntry[]` with accurate `lineStart`/`lineEnd` ranges, `grepPattern` commands, and `isTransitoryOrAnnex` / `containsFines` boolean flags.

**R1.4 (Event-Driven):** **When** markdown text is provided to the entity extractor, **the system shall** identify all dates (Spanish format), monetary amounts (pesos, UMAs), defined terms (with usage lines), and legal references (ley, nom, dof, tesis) with 1-based line numbers.

**R1.5 (Event-Driven):** **When** a document contains OCR-corrupted ordinals (e.g., "ARTICULO 10." meaning "Articulo 1o."), **the system shall** match them using the `articlesOcrAware` regex pattern and generate `navigation.warnings.ocr_ordinals`.

**R1.6 (Event-Driven):** **When** a document contains a Transitorios section exceeding 20% of total lines, **the system shall** populate `navigation.warnings.transitorios_noise` with the percentage and starting line.

**R1.7 (Event-Driven):** **When** a document contains annexes with updated fine amounts, **the system shall** populate `navigation.warnings.outdated_fines` directing to the annex section.

**R1.8 (Unwanted):** The regex library **shall not** produce false positive matches on English-only or non-legal Spanish text.

---

## Module 2: LLM-Enhanced Enrichment

### Environment

- LLM provider: OpenAI via AI SDK v6 (`generateObject`)
- Schema: `LlmEnrichmentSchema` (Zod v4)
- Dependency: Module 1 deterministic sidecar must succeed first

### Assumptions

- The LLM enrichment layer is optional; the system must function with deterministic sidecar alone.
- LLM calls are the most expensive operation and should be gated behind successful deterministic extraction.
- Merge logic never overwrites deterministic fields with LLM output.

### Requirements

**R2.1 (Event-Driven):** **When** a deterministic sidecar and markdown preview are provided, **the system shall** call AI SDK v6 `generateObject` with `LlmEnrichmentSchema` to produce section summaries, party extraction, and defined term meanings.

**R2.2 (Event-Driven):** **When** LLM enrichment output is available, **the sidecar merger shall** overlay LLM fields onto the deterministic sidecar without overwriting deterministic fields.

**R2.3 (Unwanted):** The system **shall not** call the LLM if deterministic sidecar generation failed.

**R2.4 (Event-Driven):** **When** the LLM call fails or times out, **the system shall** return the deterministic sidecar unchanged (graceful degradation).

---

## Module 3: Workflow Integration

### Environment

- Workflow engine: Vercel WDK v4.1.0-beta.57
- Sandbox: bash-tool v1.3.14 simulated filesystem
- Storage: Local filesystem or Vercel Blob (configurable)

### Assumptions

- The sidecar generation step runs after `parseWithSdk` produces `content.md`.
- Sidecar failure must not block `content.md` persistence.
- The agent system prompt always includes instructions for navigating sidecar metadata.

### Requirements

**R3.1 (Event-Driven):** **When** a document is parsed by the WDK workflow, **the system shall** execute a `generateSidecarStep` after `parseWithSdk` to produce and save the sidecar alongside `content.md`.

**R3.2 (State-Driven):** **While** the sidecar generation step fails, **the workflow shall** still save `content.md` successfully.

**R3.3 (Event-Driven):** **When** a document with sidecar exists, **the sandbox shall** mount both files at `/documents/{id}/`.

**R3.4 (Ubiquitous):** The agent system prompt **shall always** include sidecar navigation instructions.

**R3.5 (Event-Driven):** **When** `saveSidecar()` is called, **the system shall** store the sidecar and update `DocumentMetadata.sidecarPath`.

---

## Module 4: Semantic Indexing

### Environment

- SDK: `@llamaindex/llama-cloud` v1.5.0 (REST client only, no `llamaindex` framework)
- Embedding model: `text-embedding-3-small` (1536 dimensions)
- Chunking: Sentence-based, 512 tokens chunk size, 50 tokens overlap
- Search: Hybrid (dense + sparse), alpha=0.5, reranking enabled

### Assumptions

- LlamaCloud provides managed pipelines for ingestion and retrieval.
- The system does not depend on the full `llamaindex` framework package.
- Sidecar metadata fields are pushed as filterable properties alongside document content.

### Requirements

**R4.1 (Event-Driven):** **When** `ensurePipeline` is called, **the system shall** upsert a pipeline with `text-embedding-3-small` (1536 dims), sentence chunking (512/50), and sparse model enabled.

**R4.2 (Event-Driven):** **When** a document with sidecar is processed, **the indexer shall** push content with sidecar metadata as filterable fields.

**R4.3 (Event-Driven):** **When** a search query is submitted, **the retriever shall** execute hybrid search (alpha=0.5, top_k=20) with reranking (top_n=5).

**R4.4 (Event-Driven):** **When** the chat agent receives a broad legal question, **a search tool shall** be available for semantic search with optional `documentType` filter.

**R4.5 (Unwanted):** The system **shall not** require the `llamaindex` framework package. Only `@llamaindex/llama-cloud` SDK v1.5.0.

---

## Module 5: Cloud Storage Migration

### Environment

- Storage abstraction: `StorageBackend` interface with `local` and `blob` implementations
- Blob provider: Vercel Blob (`@vercel/blob`)
- Configuration: `STORAGE_BACKEND` environment variable

### Assumptions

- Local filesystem is the default storage backend for development.
- Vercel Blob is the target for production deployment.
- The storage interface is transparent to consumers; switching backends requires no application code changes.
- A MANIFEST.json provides a registry of all stored documents.

### Requirements

**R5.1 (State-Driven):** **If** `STORAGE_BACKEND=local` (default), **the system shall** use local filesystem unchanged.

**R5.2 (State-Driven):** **If** `STORAGE_BACKEND=blob`, **the system shall** use Vercel Blob for all storage.

**R5.3 (Event-Driven):** **When** sandbox is created with blob backend, **the system shall** hydrate files from Blob URLs.

**R5.4 (Event-Driven):** **When** documents are stored, **a MANIFEST.json shall** be generated listing all documents.

---

## Technical Constraints

| Constraint | Value |
|---|---|
| Language | TypeScript strict mode |
| Test framework | Vitest, minimum 85% coverage |
| Schema validation | Zod v4 |
| LLM integration | AI SDK v6 (`generateObject`, `stopWhen: stepCountIs`) |
| Indexing SDK | `@llamaindex/llama-cloud` v1.5.0 |
| Sandbox runtime | bash-tool v1.3.14 |
| Workflow engine | Vercel WDK v4.1.0-beta.57 |
| Package manager | pnpm |
| Node.js | >= 20 |

---

## Dependencies

Module dependencies follow a linear chain with each module building on the previous:

```
M1 (Deterministic Metadata Extraction)
 --> M2 (LLM-Enhanced Enrichment)
      --> M3 (Workflow Integration)
           --> M4 (Semantic Indexing)
                --> M5 (Cloud Storage Migration)
```

- **M1 is standalone**: No upstream module dependency. Produces deterministic sidecar JSON.
- **M2 depends on M1**: Requires a valid deterministic sidecar before calling the LLM.
- **M3 depends on M2**: Integrates sidecar generation (M1 + M2) into the WDK workflow.
- **M4 depends on M3**: Requires documents with sidecars to be available via the workflow before indexing.
- **M5 depends on M4**: Storage abstraction must be in place before indexing writes to the chosen backend.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes | - | OpenAI API key for LLM enrichment (M2) and embeddings (M4) |
| `LLAMA_CLOUD_API_KEY` | Yes | - | LlamaCloud API key for pipeline management and retrieval |
| `LLAMA_CLOUD_PROJECT_ID` | Yes | - | LlamaCloud project identifier for pipeline scoping |
| `STORAGE_BACKEND` | No | `local` | Storage backend selection: `local` or `blob` |
| `BLOB_READ_WRITE_TOKEN` | Conditional | - | Vercel Blob token; required when `STORAGE_BACKEND=blob` |

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| OCR quality degrades regex accuracy | Medium | High | R1.5 OCR-aware regex; characterization tests on corrupted fixtures |
| LLM latency exceeds acceptable thresholds | Medium | Medium | R2.4 graceful degradation; deterministic sidecar returned on timeout |
| LlamaCloud API breaking changes | Low | High | Pin `@llamaindex/llama-cloud` to v1.5.0; integration test suite |
| Vercel Blob rate limits under bulk ingestion | Low | Medium | Batch uploads with exponential backoff; MANIFEST.json consistency checks |
| Zod v4 migration introduces schema incompatibilities | Low | Medium | Strict schema tests; validate all sidecar outputs in CI |
| Sandbox filesystem limits block large documents | Low | Low | Chunk large documents; monitor sandbox memory usage |
| Spanish NLP edge cases (regional variations) | Medium | Medium | Expand regex test corpus; add region-specific fixture files |

---

## Reference Documents

| Document | Location | Description |
|---|---|---|
| Design Document | `agent-os/specs/2026-02-13-ai-bash-agent/shape.md` | Approved architectural design and AI SDK v6 shape reference |
| Implementation Plan | `agent-os/specs/2026-02-13-ai-bash-agent/` | Phased implementation plan with module breakdown |
| Research Corpus | `docs/research/` | Mexican legal document samples and OCR analysis findings |

---

## Traceability

- **SPEC-RAG-001** traces to implementation via `plan.md` (milestones) and `acceptance.md` (Given-When-Then scenarios).
- Each requirement ID (R1.1--R5.4) maps to acceptance criteria in `acceptance.md`.
- Module boundaries align with implementation milestones in `plan.md`.
