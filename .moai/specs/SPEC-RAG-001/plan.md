# SPEC-RAG-001: Implementation Plan

**SPEC:** LlamaCloud RAG Pipeline for Mexican Legal Documents
**Methodology:** Hybrid (TDD for new code, DDD for modified code)
**Target Coverage:** 85%

---

## Phase Breakdown

### Phase 1: Deterministic Metadata Extraction

**Branch:** `feat/sidecar-regex`
**Methodology:** TDD (pure functions)
**Tasks:** 1-9

Build the entire regex-based extraction pipeline bottom-up. Every module is a pure function with zero external dependencies, tested against three fixture document types (ley, contrato, sentencia). The sidecar generator orchestrates all extractors into a single JSON sidecar output validated by Zod schemas.

**New files:**

| File | Purpose |
|------|---------|
| `lib/metadata/types.ts` | Zod schemas for sidecar structure |
| `lib/metadata/mexican-legal-regex.ts` | OCR-aware regex library for Mexican legal patterns |
| `lib/metadata/document-type-detector.ts` | Classify documents as ley, contrato, sentencia, nom, otro |
| `lib/metadata/heading-extractor.ts` | Build table of contents from headings |
| `lib/metadata/entity-extractor.ts` | Extract dates, monetary amounts, terms, legal references |
| `lib/metadata/navigation-builder.ts` | Generate warnings, quick commands, topic sections |
| `lib/metadata/sidecar-generator.ts` | Orchestrator composing all extractors into final sidecar |

**Test files:**

| File | Covers |
|------|--------|
| `test/lib/metadata/types.test.ts` | Zod schema validation and rejection |
| `test/lib/metadata/mexican-legal-regex.test.ts` | All regex patterns including OCR edge cases |
| `test/lib/metadata/document-type-detector.test.ts` | Classification against 3 fixture types |
| `test/lib/metadata/heading-extractor.test.ts` | TOC generation, transitory section detection |
| `test/lib/metadata/entity-extractor.test.ts` | Entity extraction across all categories |
| `test/lib/metadata/navigation-builder.test.ts` | Warnings, quick commands, topic grouping |
| `test/lib/metadata/sidecar-generator.test.ts` | Full sidecar generation, schema compliance |

**Fixtures:**

| File | Document type |
|------|---------------|
| `test/fixtures/ley-sample.md` | Legislation (Ley Aduanera) |
| `test/fixtures/contrato-sample.md` | Contract (prestacion de servicios) |
| `test/fixtures/sentencia-sample.md` | Court ruling (amparo indirecto) |

---

### Phase 2: LLM-Enhanced Enrichment

**Branch:** `feat/sidecar-llm`
**Methodology:** TDD (mocked LLM via AI SDK)
**Tasks:** 10-12

Add LLM-powered summaries and definitions on top of the deterministic sidecar. Uses AI SDK v6 `generateObject` with Zod output schemas. All tests mock the LLM via `vi.mock('ai')` so no API calls are made during testing. The merger combines deterministic and LLM outputs with deterministic values taking priority on conflict.

**New files:**

| File | Purpose |
|------|---------|
| `lib/metadata/llm-enrichment.ts` | Generate section summaries and term definitions via LLM |
| `lib/metadata/sidecar-merger.ts` | Deep-merge deterministic + LLM sidecars, deterministic wins |

**Test files:**

| File | Covers |
|------|--------|
| `test/lib/metadata/llm-enrichment.test.ts` | LLM enrichment with mocked generateObject |
| `test/lib/metadata/sidecar-merger.test.ts` | Merge logic, conflict resolution, fallback behavior |

---

### Phase 3: Workflow Integration

**Branch:** `feat/sidecar-workflow`
**Methodology:** DDD (modifying existing workflow and storage code)
**Tasks:** 13-17

Wire sidecar generation into the existing WDK parse-document workflow. Each workflow step is wrapped in try/catch so sidecar failures never block the primary content.md pipeline. Update the chat agent system prompt to reference sidecar data when available, and mount the sidecar in the bash sandbox.

**Modified files:**

| File | Change |
|------|--------|
| `lib/document-storage.ts` | Add `saveSidecar()` and `getSidecarPath()` functions |
| `lib/types/documents.ts` | Add `sidecarPath` field to DocumentMetadata |
| `workflows/parse-document.ts` | Add sidecar generation step after content extraction |
| `app/api/chat/route.ts` | Inject sidecar instructions into agent system prompt |
| `lib/sandbox.ts` | Verify sidecar.json is accessible (no code change needed) |

**Test files:**

| File | Covers |
|------|--------|
| `test/lib/document-storage.test.ts` | saveSidecar, getSidecarPath functions |
| `test/workflows/parse-document.test.ts` | Workflow with sidecar step, failure isolation |
| `test/app/api/chat/route.test.ts` | System prompt includes sidecar instructions |
| `test/lib/sandbox.test.ts` | Sidecar accessibility from sandbox |

---

### Phase 4: Semantic Indexing

**Branch:** `feat/llamacloud-indexing`
**Methodology:** TDD (new modules with mocked SDK)
**Tasks:** 18-24

Build the LlamaCloud integration layer using `@llamaindex/llama-cloud` SDK. Pipeline Manager handles upsert operations, Document Indexer converts sidecar-enriched documents into LlamaCloud format, and Semantic Retriever provides vector search for the chat agent. All SDK calls are mocked in tests. Indexing is conditional on `LLAMA_CLOUD_PROJECT_ID` being set.

**New files:**

| File | Purpose |
|------|---------|
| `lib/indexing/types.ts` | Zod schemas for indexing configuration and results |
| `lib/indexing/pipeline-manager.ts` | LlamaCloud pipeline upsert and management |
| `lib/indexing/document-indexer.ts` | Convert and index documents with sidecar metadata |
| `lib/indexing/semantic-retriever.ts` | Vector search and result formatting |

**Modified files:**

| File | Change |
|------|--------|
| `workflows/parse-document.ts` | Add `indexInPipelineStep` after sidecar generation |
| `app/api/chat/route.ts` | Add semantic search tool to agent tool list |

**Test files:**

| File | Covers |
|------|--------|
| `test/lib/indexing/types.test.ts` | Indexing schema validation |
| `test/lib/indexing/pipeline-manager.test.ts` | Pipeline upsert with mocked SDK |
| `test/lib/indexing/document-indexer.test.ts` | Document conversion and indexing |
| `test/lib/indexing/semantic-retriever.test.ts` | Search queries and result formatting |

---

### Phase 5: Cloud Storage Migration

**Branch:** `feat/blob-storage`
**Methodology:** DDD (modifying existing storage layer)
**Tasks:** 25-28

Migrate from local filesystem storage to Vercel Blob with a dual-backend architecture controlled by the `STORAGE_BACKEND` environment variable. Local development continues working unchanged. A MANIFEST.json file tracks all uploaded documents and their sidecar paths for the sandbox to enumerate available files.

**New package:** `@vercel/blob`

**New files:**

| File | Purpose |
|------|---------|
| `lib/manifest.ts` | MANIFEST.json generator listing all documents and sidecars |

**Modified files:**

| File | Change |
|------|--------|
| `lib/document-storage.ts` | Dual backend (local/blob) switched by env var |
| `lib/sandbox.ts` | Read from blob when `STORAGE_BACKEND=blob` |

**Test files:**

| File | Covers |
|------|--------|
| `test/lib/document-storage-blob.test.ts` | Blob upload, download, dual backend switching |
| `test/lib/manifest.test.ts` | MANIFEST.json generation and schema |

---

## Task List

### Phase 1: Deterministic Metadata Extraction (Tasks 1-9)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 1 | Create Test Fixtures | `test/fixtures/ley-sample.md`, `contrato-sample.md`, `sentencia-sample.md` | Quick |
| 2 | Create Sidecar Zod Schemas | `lib/metadata/types.ts`, `test/lib/metadata/types.test.ts` | Quick |
| 3 | Mexican Legal Regex Library | `lib/metadata/mexican-legal-regex.ts`, `test/lib/metadata/mexican-legal-regex.test.ts` | Medium |
| 4 | Document Type Detector | `lib/metadata/document-type-detector.ts`, `test/lib/metadata/document-type-detector.test.ts` | Quick |
| 5 | Heading Extractor (TOC Builder) | `lib/metadata/heading-extractor.ts`, `test/lib/metadata/heading-extractor.test.ts` | Medium |
| 6 | Entity Extractor | `lib/metadata/entity-extractor.ts`, `test/lib/metadata/entity-extractor.test.ts` | Medium |
| 7 | Navigation Builder | `lib/metadata/navigation-builder.ts`, `test/lib/metadata/navigation-builder.test.ts` | Medium |
| 8 | Sidecar Generator (Orchestrator) | `lib/metadata/sidecar-generator.ts`, `test/lib/metadata/sidecar-generator.test.ts` | Involved |
| 9 | Phase 1 Test Suite and Coverage Check | All Phase 1 files | Quick |

### Phase 2: LLM-Enhanced Enrichment (Tasks 10-12)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 10 | LLM Enrichment Module | `lib/metadata/llm-enrichment.ts`, `test/lib/metadata/llm-enrichment.test.ts` | Medium |
| 11 | Sidecar Merger | `lib/metadata/sidecar-merger.ts`, `test/lib/metadata/sidecar-merger.test.ts` | Medium |
| 12 | Phase 2 Coverage Check | All Phase 1-2 files | Quick |

### Phase 3: Workflow Integration (Tasks 13-17)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 13 | Add saveSidecar to Document Storage | `lib/document-storage.ts`, `lib/types/documents.ts`, `test/lib/document-storage.test.ts` | Medium |
| 14 | Add Sidecar Generation Step to Workflow | `workflows/parse-document.ts`, `test/workflows/parse-document.test.ts` | Involved |
| 15 | Update Agent System Prompt for Sidecar | `app/api/chat/route.ts` | Medium |
| 16 | Mount Sidecar in Sandbox | `lib/sandbox.ts` (verify only) | Quick |
| 17 | Phase 3 Full Test Suite | All Phase 1-3 files | Quick |

### Phase 4: Semantic Indexing (Tasks 18-24)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 18 | Indexing Types | `lib/indexing/types.ts`, `test/lib/indexing/types.test.ts` | Quick |
| 19 | Pipeline Manager | `lib/indexing/pipeline-manager.ts`, `test/lib/indexing/pipeline-manager.test.ts` | Medium |
| 20 | Document Indexer | `lib/indexing/document-indexer.ts`, `test/lib/indexing/document-indexer.test.ts` | Medium |
| 21 | Semantic Retriever | `lib/indexing/semantic-retriever.ts`, `test/lib/indexing/semantic-retriever.test.ts` | Medium |
| 22 | Add Indexing Step to Workflow | `workflows/parse-document.ts` | Medium |
| 23 | Add Search Tool to Chat Agent | `app/api/chat/route.ts` | Medium |
| 24 | Phase 4 Full Test Suite | All Phase 1-4 files | Quick |

### Phase 5: Cloud Storage Migration (Tasks 25-28)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 25 | Install @vercel/blob | `package.json` | Quick |
| 26 | Dual Storage Backend | `lib/document-storage.ts`, `test/lib/document-storage-blob.test.ts` | Involved |
| 27 | MANIFEST.json Generator | `lib/manifest.ts`, `test/lib/manifest.test.ts` | Medium |
| 28 | Final Validation | All project files | Quick |

---

## Dependency Graph

```
Phase 1 (feat/sidecar-regex)
  Tasks 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9
  Merge to main
        |
        v
Phase 2 (feat/sidecar-llm)
  Tasks 10 → 11 → 12
  Merge to main
        |
        v
Phase 3 (feat/sidecar-workflow)
  Tasks 13 → 14 → 15 → 16 → 17
  Merge to main
        |
        v
Phase 4 (feat/llamacloud-indexing)
  Tasks 18 → 19 → 20 → 21 → 22 → 23 → 24
  Merge to main
        |
        v
Phase 5 (feat/blob-storage)
  Tasks 25 → 26 → 27 → 28
  Merge to main
```

Each phase creates a feature branch from `main` after the previous phase has been merged. Phases are strictly sequential because each builds on the artifacts of the previous one.

---

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| TypeScript | strict mode | Primary language |
| Next.js | 16 (App Router) | Application framework |
| Vitest | 4.x | Test runner |
| @vitest/coverage-v8 | 4.x | Coverage reporting |
| Zod | v4 | Schema validation for sidecar and indexing types |
| AI SDK | v6 | `generateObject`, `streamText`, `stopWhen`, `stepCountIs` |
| @ai-sdk/openai | v6 | OpenAI provider for LLM enrichment |
| @llamaindex/llama-cloud | v1.5.0 | LlamaParse, pipeline management, semantic retrieval |
| bash-tool | v1.3.14 | Simulated bash for document analysis |
| just-bash | v2.10.0 | Bash simulation runtime |
| Vercel WDK (workflow) | v4.1.0-beta.57 | Durable workflow execution |
| @vercel/blob | latest | Cloud blob storage (Phase 5 only) |

---

## Risk Analysis

| Risk | Severity | Phase | Mitigation |
|------|----------|-------|------------|
| Regex false positives on OCR-corrupted articles | Medium | 1 | 3 fixture document types with known OCR traps; matchAll tested per-line |
| LLM hallucinated summaries or definitions | Medium | 2 | Zod output schema validation; deterministic sidecar as fallback via merger |
| Workflow step failure blocks document parsing | High | 3 | Each sidecar step wrapped in try/catch; content.md pipeline never blocked |
| LlamaCloud SDK API breaking changes | Medium | 4 | SDK pinned to v1.5.0; all calls mocked in tests; indexing conditional on env var |
| Blob migration breaks local development | High | 5 | Dual backend with `STORAGE_BACKEND` env var; local mode unchanged by default |
| Sidecar schema evolution requires migration | Low | All | `schemaVersion` field in sidecar enables future migration logic |
| Large documents exceed LLM context window | Medium | 2 | Section-by-section enrichment; graceful degradation to deterministic-only |

---

## Environment Variables

| Variable | Required | Phase | Description |
|----------|----------|-------|-------------|
| `OPENAI_API_KEY` | Yes (Phase 2+) | 2 | OpenAI API key for LLM enrichment via AI SDK |
| `LLAMA_CLOUD_API_KEY` | Yes (Phase 4) | 4 | LlamaCloud API authentication key |
| `LLAMA_CLOUD_PROJECT_ID` | Yes (Phase 4) | 4 | LlamaCloud project identifier; indexing skipped if unset |
| `LLAMA_CLOUD_PIPELINE_NAME` | No | 4 | Pipeline name override (default: `legal-documents`) |
| `STORAGE_BACKEND` | No | 5 | Storage mode: `local` (default) or `blob` |
| `BLOB_READ_WRITE_TOKEN` | Yes (if blob) | 5 | Vercel Blob read/write authentication token |

---

## Summary

| Phase | Tasks | New Files | Test Files | Key Dependencies |
|-------|-------|-----------|------------|-----------------|
| 1. Regex and Extraction | 1-9 | 8 | 7 + 3 fixtures | None |
| 2. LLM Enrichment | 10-12 | 2 | 2 | ai, @ai-sdk/openai (mocked) |
| 3. Workflow Integration | 13-17 | 0 | 4 | workflow (existing) |
| 4. LlamaCloud Indexing | 18-24 | 4 | 4 | @llamaindex/llama-cloud (existing) |
| 5. Vercel Blob | 25-28 | 2 | 2 | @vercel/blob (new) |
| **Total** | **28** | **16** | **19 + 3 fixtures** | |
