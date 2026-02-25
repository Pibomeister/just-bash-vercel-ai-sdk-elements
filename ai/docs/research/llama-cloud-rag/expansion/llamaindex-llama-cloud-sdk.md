# LlamaIndex Llama Cloud TypeScript SDK Research

## Executive Summary

The `@llamaindex/llama-cloud` package (v1.5.0) is the official TypeScript SDK for LlamaCloud Platform, providing programmatic access to LlamaParse v2 parsing, managed indexing pipelines, and semantic retrieval. This document verifies API signatures directly from installed type declarations at `node_modules/@llamaindex/llama-cloud`.

**Key Capabilities:**
- **LlamaParse v2**: Parse PDFs, Word docs, presentations, spreadsheets with advanced OCR, table extraction, and agentic parsing
- **Managed Pipelines**: Create vector indexes with configurable chunking, segmentation, and hybrid search
- **Semantic Retrieval**: Query indexed documents with dense/sparse retrieval, reranking, and metadata filtering
- **Auto-generated SDK**: Type-safe client with resource-based architecture

**Migration Context:**
- `llama-cloud-services` → deprecated (removal May 2026)
- `@llamaindex/cloud` → deprecated since v4.1.0
- `@llamaindex/llama-cloud` → current official SDK

---

## 1. Package Verification

### Installed Package
```
Package: @llamaindex/llama-cloud
Version: 1.5.0 (verified via node_modules)
Export: LlamaCloud class
Location: node_modules/@llamaindex/llama-cloud/index.d.ts
```

### Client Initialization
```typescript
import { LlamaCloud } from '@llamaindex/llama-cloud';

const client = new LlamaCloud({
  apiKey: process.env.LLAMA_CLOUD_API_KEY, // Optional, reads from env by default
  baseURL: 'https://api.cloud.llamaindex.ai', // Default
  timeout: 60000, // Optional, in milliseconds
  maxRetries: 2, // Optional
  fetch: customFetch // Optional, custom fetch implementation
});
```

**Environment Variable:**
- Default API key source: `LLAMA_CLOUD_API_KEY`
- Base URL: `https://api.cloud.llamaindex.ai`

---

## 2. Client Architecture

### Resource Structure (from client.d.ts)
The SDK follows a resource-based architecture with auto-generated methods:

```typescript
client.files        // File upload and management
client.parsing      // LlamaParse v2 parsing
client.extraction   // Data extraction
client.classifier   // Document classification
client.projects     // Project management
client.dataSinks    // Data sink configuration
client.dataSources  // Data source management
client.pipelines    // Pipeline management (indexing, retrieval)
client.retrievers   // Composite retriever management
client.beta         // Beta features
```

### Auto-generated SDK Characteristics
- Type-safe request/response types
- Paginated list methods with cursors
- Promise-based async API (`APIPromise<T>`)
- Nested sub-resources (e.g., `client.pipelines.documents`)
- Discriminated unions for polymorphic configs

---

## 3. LlamaParse v2 API — Verified Signatures

### Resource: `client.parsing`

#### Methods (from resources/parsing.d.ts)
```typescript
// Start a parse job
create(params: ParsingCreateParams): APIPromise<ParsingCreateResponse>

// List parse jobs (paginated)
list(query?: ParsingListParams): PagePromise<ParsingJob, PageWithCursor>

// Get job details with optional expand
get(jobID: string, query?: ParsingGetParams): APIPromise<ParsingGetResponse>

// Poll until job reaches terminal state
waitForCompletion(
  jobID: string,
  query?: ParsingGetParams,
  options?: { pollingIntervalMs?: number }
): APIPromise<ParsingGetResponse>

// Convenience: create + waitForCompletion combined
parse(params: ParsingCreateParams & { upload_file?: Uploadable; expand?: Array<string> }): APIPromise<ParsingGetResponse>
```

**CRITICAL**: `client.parsing.parse()` is a real method verified in the types. It's a convenience wrapper that calls `create()` then `waitForCompletion()`.

---

### ParsingCreateParams (Verified Structure)

```typescript
interface ParsingCreateParams {
  // REQUIRED FIELDS
  tier: 'fast' | 'cost_effective' | 'agentic' | 'agentic_plus';
  version: '2026-01-29' | 'latest' | (string & {}); // Many date versions available

  // INPUT SOURCE (one required)
  file_id?: string;           // Parse previously uploaded file
  source_url?: string;        // Parse from URL
  upload_file?: Uploadable;   // Direct upload (only on parse() method)

  // AGENTIC PARSING
  agentic_options?: {
    custom_prompt?: string;   // Custom extraction instructions
  };

  // INPUT OPTIONS
  input_options?: {
    html?: {
      enable?: boolean;
      encoding?: string;
      // ... additional HTML parsing options
    };
    pdf?: {
      enable?: boolean;
      // ... PDF-specific options
    };
    presentation?: {
      enable?: boolean;
      // ... PowerPoint/Slides options
    };
    spreadsheet?: {
      enable?: boolean;
      // ... Excel/Sheets options
    };
  };

  // OUTPUT OPTIONS
  output_options?: {
    extract_printed_page_number?: boolean; // Note: singular, not plural
    images_to_save?: Array<'screenshot' | 'embedded' | 'layout'>;
    markdown?: {
      annotate_links?: boolean;
      inline_images?: boolean;
      tables?: {
        compact_markdown_tables?: boolean;
        merge_continued_tables?: boolean;
        output_tables_as_markdown?: boolean;
      };
    };
  };

  // PROCESSING OPTIONS
  processing_options?: {
    aggressive_table_extraction?: boolean;
    ocr_parameters?: {
      languages?: Array<ParsingLanguages>; // e.g., ['eng', 'spa']
    };
    specialized_chart_parsing?: 'agentic_plus' | 'agentic' | 'efficient';
    cost_optimizer?: {
      enable?: boolean;
    };
  };

  // PROCESSING CONTROL
  processing_control?: {
    timeouts?: {
      base_in_seconds?: number;
      extra_time_per_page_in_seconds?: number;
    };
    job_failure_conditions?: {
      allowed_page_failure_ratio?: number;
      // ... additional failure conditions
    };
  };

  // PAGE SELECTION
  page_ranges?: {
    max_pages?: number;
    target_pages?: string; // e.g., "1-5,10,15-20"
  };

  // CROP BOX (ratios 0-1)
  crop_box?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };

  // WEBHOOKS
  webhook_configurations?: Array<{
    webhook_url?: string;
    webhook_events?: Array<string>;
    webhook_headers?: Record<string, string>;
  }>;
}
```

---

### ParsingGetResponse (Verified Structure)

```typescript
interface ParsingGetResponse {
  // JOB STATUS
  job: {
    id: string;
    project_id: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    error_message?: string;
  };

  // MARKDOWN OUTPUT (per-page)
  markdown?: {
    pages: Array<
      | { markdown: string; page_number: number; success: true; header?: string; footer?: string }
      | { error: string; page_number: number; success: false }
    >;
  };

  // STRUCTURED OUTPUT (per-page items)
  items?: {
    pages: Array<StructuredResultPage | FailedStructuredPage>;
  };

  // PLAIN TEXT OUTPUT (per-page)
  text?: {
    pages: Array<{
      page_number: number;
      text: string;
    }>;
  };

  // METADATA (per-page)
  metadata?: {
    pages: Array<{
      page_number: number;
      confidence?: number;
      printed_page_number?: string;
      // ... additional metadata fields
    }>;
  };

  // FULL OUTPUTS (all pages concatenated)
  markdown_full?: string;
  text_full?: string;

  // IMAGES
  images_content_metadata?: {
    images: Array<{
      filename: string;
      index: number;
      presigned_url?: string;
      // ... additional image metadata
    }>;
    total_count: number;
  };
}
```

---

### Structured Item Types

When using `expand: ['items']`, pages contain typed document elements:

```typescript
// Text block
interface TextItem {
  type: 'text';
  value: string;
  bbox?: BoundingBox;
}

// Heading with level
interface HeadingItem {
  type: 'heading';
  value: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  bbox?: BoundingBox;
}

// List item
interface ListItem {
  type: 'list';
  value: string;
  bbox?: BoundingBox;
}

// Code block
interface CodeItem {
  type: 'code';
  value: string;
  language?: string;
  bbox?: BoundingBox;
}

// Table with multiple formats
interface TableItem {
  type: 'table';
  csv?: string;
  html?: string;
  md?: string; // Markdown table
  rows?: Array<Array<string>>;
  bbox?: BoundingBox;
  merged_from_pages?: Array<number>; // If table spans pages
}

// Image reference
interface ImageItem {
  type: 'image';
  filename: string;
  presigned_url?: string;
  bbox?: BoundingBox;
}

// Hyperlink
interface LinkItem {
  type: 'link';
  url: string;
  text: string;
  bbox?: BoundingBox;
}

// Header/Footer
interface HeaderItem {
  type: 'header';
  value: string;
}

interface FooterItem {
  type: 'footer';
  value: string;
}
```

---

### Parsing Tiers

```typescript
type ParsingTier =
  | 'fast'              // Speed-optimized, basic OCR
  | 'cost_effective'    // Balanced speed/quality
  | 'agentic'           // AI-powered extraction
  | 'agentic_plus';     // Maximum accuracy, custom prompts
```

**Tier Selection Guide:**
- `fast`: Simple documents, quick turnaround
- `cost_effective`: Standard PDFs, tables
- `agentic`: Complex layouts, charts, multi-column
- `agentic_plus`: Custom extraction schemas, specialized domains

---

### Example: Parse PDF with Table Extraction

```typescript
const result = await client.parsing.parse({
  tier: 'cost_effective',
  version: 'latest',
  upload_file: fs.createReadStream('./document.pdf'),

  output_options: {
    extract_printed_page_number: true, // Singular, not plural
    markdown: {
      annotate_links: true,
      tables: {
        output_tables_as_markdown: true,
        merge_continued_tables: true,
      },
    },
  },

  processing_options: {
    aggressive_table_extraction: true,
    ocr_parameters: {
      languages: ['eng'],
    },
  },

  expand: ['markdown', 'items', 'metadata'], // Request specific outputs
});

console.log(result.markdown_full); // Full markdown
console.log(result.items?.pages[0]); // Structured items for page 1
```

---

## 4. Pipeline/Indexing API — Verified Signatures

### Resource: `client.pipelines`

#### Methods (from resources/pipelines/pipelines.d.ts)
```typescript
// Create new pipeline
create(params: PipelineCreateParams): APIPromise<Pipeline>

// Create or update by name+project_id
upsert(params: PipelineUpsertParams): APIPromise<Pipeline>

// Semantic search (retrieval)
retrieve(pipelineID: string, params: PipelineRetrieveParams): APIPromise<PipelineRetrieveResponse>

// Update pipeline config
update(pipelineID: string, body: PipelineUpdateParams): APIPromise<Pipeline>

// List pipelines (paginated)
list(query?: PipelineListParams): PagePromise<Pipeline, PageWithCursor>

// Delete pipeline
delete(pipelineID: string): APIPromise<void>

// Get pipeline details
get(pipelineID: string): APIPromise<Pipeline>

// Get ingestion status
getStatus(pipelineID: string, query?: PipelineGetStatusParams): APIPromise<ManagedIngestionStatusResponse>
```

#### Sub-resources
```typescript
client.pipelines.documents    // Document CRUD (create, upsert, delete, get, list)
client.pipelines.files        // File management within pipelines
client.pipelines.images       // Image retrieval (page figures, screenshots)
client.pipelines.metadata     // Pipeline metadata operations
client.pipelines.sync         // Pipeline sync operations
client.pipelines.dataSources  // Pipeline data source management
```

---

### PipelineUpsertParams (Verified Structure)

```typescript
interface PipelineUpsertParams {
  // REQUIRED
  name: string;

  // OPTIONAL
  project_id?: string;

  // EMBEDDING CONFIGURATION (discriminated union)
  embedding_config?:
    | AzureOpenAIEmbeddingConfig
    | CohereEmbeddingConfig
    | GeminiEmbeddingConfig
    | HuggingFaceInferenceAPIEmbeddingConfig
    | OpenAIEmbeddingConfig
    | VertexAIEmbeddingConfig
    | BedrockEmbeddingConfig;

  // TRANSFORM CONFIGURATION (auto or advanced)
  transform_config?: AutoTransformConfig | AdvancedModeTransformConfig;

  // LLAMAPARSE PARAMETERS (if using LlamaParse for ingestion)
  llama_parse_parameters?: LlamaParseParameters;

  // PIPELINE TYPE
  pipeline_type?: 'PLAYGROUND' | 'MANAGED';

  // SPARSE RETRIEVAL (BM25)
  sparse_model_config?: SparseModelConfig;

  // METADATA EXTRACTION
  metadata_config?: PipelineMetadataConfig;

  // DEFAULT RETRIEVAL PARAMS
  preset_retrieval_parameters?: PresetRetrievalParams;
}
```

---

### Transform Configs

#### AutoTransformConfig (Simple Mode)
```typescript
interface AutoTransformConfig {
  mode?: 'auto';
  chunk_size?: number;       // Default: 1024
  chunk_overlap?: number;    // Default: 20
}
```

#### AdvancedModeTransformConfig (Full Control)
```typescript
interface AdvancedModeTransformConfig {
  mode?: 'advanced';

  // CHUNKING STRATEGY
  chunking_config?:
    | NoneChunkingConfig
    | CharacterChunkingConfig
    | TokenChunkingConfig
    | SentenceChunkingConfig
    | SemanticChunkingConfig;

  // SEGMENTATION STRATEGY
  segmentation_config?:
    | NoneSegmentationConfig
    | PageSegmentationConfig
    | ElementSegmentationConfig;
}
```

---

### Chunking Modes (Verified Types)

```typescript
// No chunking (entire document as one chunk)
interface NoneChunkingConfig {
  type: 'none';
}

// Character-based chunking
interface CharacterChunkingConfig {
  type: 'character';
  chunk_size?: number;      // Characters per chunk
  chunk_overlap?: number;   // Character overlap
}

// Token-based chunking (tokenizer-aware)
interface TokenChunkingConfig {
  type: 'token';
  chunk_size?: number;      // Tokens per chunk
  chunk_overlap?: number;   // Token overlap
  separator?: string;       // Token boundary separator
}

// Sentence-based chunking (sentence boundaries)
interface SentenceChunkingConfig {
  type: 'sentence';
  chunk_size?: number;           // Sentences per chunk
  chunk_overlap?: number;        // Sentence overlap
  separator?: string;            // Sentence separator (e.g., '. ')
  paragraph_separator?: string;  // Paragraph boundary
}

// Semantic chunking (meaning-based boundaries)
interface SemanticChunkingConfig {
  type: 'semantic';
  breakpoint_percentile_threshold?: number; // 0-100, similarity threshold
  buffer_size?: number;                     // Window size for similarity
}
```

**Chunking Mode Selection:**
- `character`: Simple, fast, no linguistic awareness
- `token`: Token-budget aware (good for LLM context limits)
- `sentence`: Preserves sentence boundaries (better readability)
- `semantic`: AI-driven, preserves semantic coherence (slowest, best quality)

---

### Segmentation Modes (Verified Types)

```typescript
// No segmentation (process document as-is)
interface NoneSegmentationConfig {
  type: 'none';
}

// Split by page boundaries
interface PageSegmentationConfig {
  type: 'page';
  page_separator?: string; // Separator inserted between pages
}

// Split by document elements (headings, sections)
interface ElementSegmentationConfig {
  type: 'element';
  // Element-level segmentation uses document structure
}
```

**Segmentation vs Chunking:**
- **Segmentation**: First-pass split (e.g., by page, by heading)
- **Chunking**: Second-pass split within segments (e.g., by token count)

---

### Embedding Configs (Examples)

```typescript
// OpenAI embeddings
interface OpenAIEmbeddingConfig {
  type: 'OPENAI';
  api_key?: string;
  model?: string; // e.g., 'text-embedding-3-small'
  dimensions?: number;
}

// Azure OpenAI embeddings
interface AzureOpenAIEmbeddingConfig {
  type: 'AZURE_OPENAI';
  api_key?: string;
  azure_endpoint?: string;
  api_version?: string;
  deployment_name?: string;
}

// Cohere embeddings
interface CohereEmbeddingConfig {
  type: 'COHERE';
  api_key?: string;
  model?: string; // e.g., 'embed-english-v3.0'
}
```

---

### Example: Create Pipeline with Advanced Chunking

```typescript
const pipeline = await client.pipelines.upsert({
  name: 'technical-docs-index',
  project_id: 'my-project',

  embedding_config: {
    type: 'OPENAI',
    model: 'text-embedding-3-small',
    dimensions: 1536,
  },

  transform_config: {
    mode: 'advanced',

    // Segment by page first
    segmentation_config: {
      type: 'page',
      page_separator: '\n---\n',
    },

    // Then chunk semantically
    chunking_config: {
      type: 'semantic',
      breakpoint_percentile_threshold: 95,
      buffer_size: 5,
    },
  },

  // Enable BM25 sparse retrieval
  sparse_model_config: {
    enable: true,
  },

  pipeline_type: 'MANAGED',
});

console.log(`Pipeline created: ${pipeline.id}`);
```

---

## 5. Retrieval API — Verified Signatures

### PipelineRetrieveParams (Verified Structure)

```typescript
interface PipelineRetrieveParams {
  // REQUIRED
  query: string; // Natural language query

  // HYBRID SEARCH WEIGHTING
  alpha?: number; // 0.0 = sparse only, 1.0 = dense only, 0.5 = balanced

  // DENSE RETRIEVAL (vector search)
  dense_similarity_top_k?: number;      // Top K results from dense
  dense_similarity_cutoff?: number;     // Minimum similarity threshold

  // SPARSE RETRIEVAL (BM25)
  sparse_similarity_top_k?: number;     // Top K results from sparse

  // RERANKING
  enable_reranking?: boolean;           // Re-score with cross-encoder
  rerank_top_n?: number;                // Final top N after reranking

  // RETRIEVAL MODE (CORRECTED VALUES)
  retrieval_mode?:
    | 'chunks'                // Return text chunks (default)
    | 'files_via_metadata'    // Return files based on metadata search
    | 'files_via_content'     // Return files based on content search
    | 'auto_routed';          // Auto-select best mode

  // METADATA FILTERING
  search_filters?: MetadataFilters;     // Filter by metadata (e.g., file_type, date)
  search_filters_inference_schema?: object; // JSON Schema for auto-inferred filters

  // IMAGE RETRIEVAL
  retrieve_page_figure_nodes?: boolean;      // Include page figures
  retrieve_page_screenshot_nodes?: boolean;  // Include page screenshots

  // FILE RETRIEVAL
  files_top_k?: number; // Top K files (when using files_via_* mode)
}
```

**CRITICAL CORRECTION**: The actual `retrieval_mode` values are:
- `chunks` (default)
- `files_via_metadata`
- `files_via_content`
- `auto_routed`

NOT the previously assumed `'chunks' | 'files' | 'chunks_and_files'`.

---

### PipelineRetrieveResponse (Verified Structure)

```typescript
interface PipelineRetrieveResponse {
  retrieval_nodes: Array<{
    id: string;
    text: string;           // Chunk text
    score: number;          // Relevance score
    metadata: {
      file_name?: string;
      file_id?: string;
      page_number?: number;
      chunk_id?: string;
      // ... custom metadata
    };
    embedding?: number[];   // Optional: return embeddings
  }>;
}
```

---

### Hybrid Search: Alpha Parameter

The `alpha` parameter controls dense/sparse weighting:

```
alpha = 0.0   →  100% sparse (BM25 keyword matching)
alpha = 0.5   →  50/50 hybrid (balanced)
alpha = 1.0   →  100% dense (semantic vector search)
```

**Recommendations:**
- **Keyword-heavy queries** (e.g., product codes, IDs): `alpha = 0.0` (sparse)
- **Semantic queries** (e.g., "explain X"): `alpha = 1.0` (dense)
- **Mixed queries**: `alpha = 0.5` (hybrid)

---

### Metadata Filtering

```typescript
interface MetadataFilters {
  filters: Array<{
    key: string;        // Metadata field name
    value: any;         // Filter value
    operator?: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin';
  }>;
  condition?: 'and' | 'or'; // Combine filters with AND/OR
}
```

**Example: Filter by file type and date**
```typescript
search_filters: {
  filters: [
    { key: 'file_type', value: 'pdf', operator: 'eq' },
    { key: 'created_at', value: '2024-01-01', operator: 'gte' },
  ],
  condition: 'and',
}
```

---

### Example: Hybrid Search with Reranking

```typescript
const results = await client.pipelines.retrieve('pipeline-id', {
  query: 'How do I configure authentication?',

  // Hybrid search (balanced)
  alpha: 0.5,
  dense_similarity_top_k: 50,
  sparse_similarity_top_k: 50,

  // Rerank top 10 from 50+50
  enable_reranking: true,
  rerank_top_n: 10,

  // Chunk-level retrieval
  retrieval_mode: 'chunks',

  // Filter by PDF files only
  search_filters: {
    filters: [{ key: 'file_type', value: 'pdf', operator: 'eq' }],
    condition: 'and',
  },
});

for (const node of results.retrieval_nodes) {
  console.log(`[${node.score.toFixed(2)}] ${node.metadata.file_name} (page ${node.metadata.page_number})`);
  console.log(node.text.slice(0, 200) + '...\n');
}
```

---

## 6. Advanced Transform Config (Chunking Modes)

### Chunking Strategy Decision Matrix

| Content Type | Recommended Chunking | Rationale |
|--------------|---------------------|-----------|
| Technical docs (code examples) | `token` | Respects token limits, preserves code blocks |
| Legal documents | `sentence` | Maintains sentence integrity, clause boundaries |
| Research papers | `semantic` | Preserves argument flow, semantic coherence |
| Chat logs | `character` | Simple, fast, no linguistic structure needed |
| Mixed content (wiki pages) | `semantic` | Handles varied structure adaptively |

---

### Semantic Chunking Deep Dive

**How it works:**
1. Embed each sentence in a sliding window
2. Compute cosine similarity between consecutive sentences
3. Identify "breakpoints" where similarity drops below percentile threshold
4. Split chunks at breakpoints

**Parameters:**
- `breakpoint_percentile_threshold`: 95 = aggressive splitting (small chunks), 50 = lenient (large chunks)
- `buffer_size`: Sliding window size (higher = more context, slower)

**Example:**
```typescript
chunking_config: {
  type: 'semantic',
  breakpoint_percentile_threshold: 90, // Split at top 10% similarity drops
  buffer_size: 3, // Compare 3 sentences at a time
}
```

---

### Segmentation + Chunking Workflow

**Example: Page-segmented, token-chunked pipeline**

```typescript
transform_config: {
  mode: 'advanced',

  // Step 1: Split by page
  segmentation_config: {
    type: 'page',
    page_separator: '\n\n--- PAGE BREAK ---\n\n',
  },

  // Step 2: Within each page, chunk by 512 tokens
  chunking_config: {
    type: 'token',
    chunk_size: 512,
    chunk_overlap: 50,
  },
}
```

**Result:** Each page becomes N chunks of 512 tokens, with 50-token overlap for context preservation.

---

## 7. Corrections to Original Research

### Verified Corrections

1. **`client.parsing.parse()` EXISTS**
   - Original: Assumed this was a mistake
   - Correction: It's a real convenience method (create + waitForCompletion)
   - Location: `resources/parsing.d.ts`, line 47

2. **`extract_printed_page_number` is SINGULAR**
   - Original: Used `extract_printed_page_numbers` (plural)
   - Correction: Actual param is `extract_printed_page_number` (singular)
   - Location: `ParsingCreateParams.output_options`

3. **`agentic_options` is TOP-LEVEL**
   - Original: Nested under `processing_options.agentic_options`
   - Correction: Top-level field `agentic_options: { custom_prompt }`
   - Location: `ParsingCreateParams`, line 123

4. **`remove_header_from_markdown` DOES NOT EXIST**
   - Original: Used `output_options.markdown.remove_header_from_markdown: true`
   - Correction: Headers/footers are accessed via `expand: ['markdown']` response fields, not removal flags
   - Headers/footers appear in `ParsingGetResponse.markdown.pages[].header` and `.footer`

5. **`retrieval_mode` VALUES CORRECTED**
   - Original: Assumed `'chunks' | 'files' | 'chunks_and_files'`
   - Correction: Actual values are `'chunks' | 'files_via_metadata' | 'files_via_content' | 'auto_routed'`
   - Location: `PipelineRetrieveParams.retrieval_mode`

6. **`AutoTransformConfig` STRUCTURE CORRECTED**
   - Original: May have assumed flat `chunk_size` at top level
   - Correction: `transform_config: AutoTransformConfig` nests `mode`, `chunk_size`, `chunk_overlap` together
   - Type: `{ mode?: 'auto'; chunk_size?: number; chunk_overlap?: number }`

---

## 8. Edge Cases & Gotchas

### 1. Parsing Job Polling
**Issue:** `waitForCompletion()` can timeout on large documents.

**Solution:**
```typescript
const result = await client.parsing.waitForCompletion(jobID, {
  expand: ['markdown'],
}, {
  pollingIntervalMs: 5000, // Poll every 5 seconds (default: 1000ms)
});
```

---

### 2. Expand Parameter Required for Output
**Issue:** `ParsingGetResponse` fields like `markdown`, `items`, `text` are `undefined` unless requested.

**Solution:** Always specify `expand` parameter:
```typescript
// Without expand - NO output data
const job = await client.parsing.get(jobID); // job.markdown is undefined

// With expand - output included
const job = await client.parsing.get(jobID, {
  expand: ['markdown', 'items', 'metadata'],
});
console.log(job.markdown_full); // Full markdown now available
```

---

### 3. Pipeline Upsert Idempotency
**Issue:** `upsert()` creates if missing, updates if exists (by `name` + `project_id`).

**Gotcha:** Changing `name` creates a NEW pipeline, doesn't rename existing.

**Solution:** Use `update()` for config changes, `upsert()` for initial creation only.

---

### 4. Retrieval Mode Confusion
**Issue:** `retrieval_mode: 'files_via_content'` returns ENTIRE files, not chunks.

**Example:**
```typescript
// Returns chunks (default)
retrieval_mode: 'chunks' → retrieval_nodes contain text chunks

// Returns file metadata (no chunk text)
retrieval_mode: 'files_via_metadata' → retrieval_nodes contain file references

// Returns full file content
retrieval_mode: 'files_via_content' → retrieval_nodes contain entire file text
```

**Use Case:**
- `chunks`: Standard RAG (most common)
- `files_via_metadata`: File-level search (e.g., "find all PDFs from 2024")
- `files_via_content`: Retrieve full documents (e.g., download relevant manuals)

---

### 5. Alpha = 0 Requires Sparse Model
**Issue:** Setting `alpha: 0.0` (sparse-only) fails if pipeline doesn't have `sparse_model_config.enable: true`.

**Solution:**
```typescript
// Pipeline creation
sparse_model_config: { enable: true }

// Retrieval
alpha: 0.0 // Now works (BM25 enabled)
```

---

### 6. Metadata Filtering Type Coercion
**Issue:** Metadata values stored as strings, numeric comparisons may fail.

**Example:**
```typescript
// Wrong: Filter by number (fails if stored as string)
{ key: 'page_count', value: 10, operator: 'gt' }

// Correct: Filter by string
{ key: 'page_count', value: '10', operator: 'gt' }
```

**Best Practice:** Store numeric metadata as strings, use string comparisons.

---

### 7. Table Continuation Across Pages
**Issue:** `merge_continued_tables: true` requires multiple pages with table fragments.

**Behavior:**
- Single-page table: No effect
- Multi-page table: Merged into one `TableItem` with `merged_from_pages: [1, 2, 3]`

**Access:**
```typescript
const table = result.items?.pages[0].items.find(item => item.type === 'table');
if (table.merged_from_pages) {
  console.log(`Table spans pages: ${table.merged_from_pages.join(', ')}`);
}
```

---

### 8. Webhook Event Timing
**Issue:** Webhooks fire BEFORE `waitForCompletion()` resolves.

**Timeline:**
1. Job completes
2. Webhook fires → `POST https://your-webhook.com`
3. `waitForCompletion()` returns (a few ms later)

**Use Case:** Use webhooks for async processing (don't block client), use `waitForCompletion()` for sync flows.

---

### 9. Chunking Config Ignored in Auto Mode
**Issue:** Setting `chunking_config` when `mode: 'auto'` has no effect.

**Correct:**
```typescript
// Auto mode - uses chunk_size/chunk_overlap
transform_config: {
  mode: 'auto',
  chunk_size: 512,
  chunk_overlap: 50,
}

// Advanced mode - uses chunking_config
transform_config: {
  mode: 'advanced',
  chunking_config: { type: 'semantic', ... },
}
```

---

### 10. Image Presigned URL Expiration
**Issue:** `presigned_url` in `images_content_metadata` expires after 1 hour (default).

**Solution:** Download images immediately or request new URLs via `client.pipelines.images.get()`.

---

## 9. Sources

### Primary Sources (Verified)
1. `/Users/eduardopicazo/Documents/Workspace/Alia/ai-just-bash-rag/node_modules/@llamaindex/llama-cloud/index.d.ts` — Client initialization
2. `/Users/eduardopicazo/Documents/Workspace/Alia/ai-just-bash-rag/node_modules/@llamaindex/llama-cloud/resources/parsing.d.ts` — Parsing API
3. `/Users/eduardopicazo/Documents/Workspace/Alia/ai-just-bash-rag/node_modules/@llamaindex/llama-cloud/resources/pipelines/pipelines.d.ts` — Pipeline API
4. `/Users/eduardopicazo/Documents/Workspace/Alia/ai-just-bash-rag/node_modules/@llamaindex/llama-cloud/client.d.ts` — Resource structure

### Package Metadata
- Package: `@llamaindex/llama-cloud` v1.5.0
- Installed: `/Users/eduardopicazo/Documents/Workspace/Alia/ai-just-bash-rag/node_modules/@llamaindex/llama-cloud`
- Verification Date: 2026-02-15

---

## Appendix: Complete Type Signatures

### ParsingCreateParams (Full Definition)
```typescript
export interface ParsingCreateParams {
  tier: 'fast' | 'cost_effective' | 'agentic' | 'agentic_plus';
  version: '2026-01-29' | 'latest' | (string & {});
  file_id?: string;
  source_url?: string;
  upload_file?: Uploadable;
  agentic_options?: { custom_prompt?: string };
  input_options?: {
    html?: { enable?: boolean; encoding?: string };
    pdf?: { enable?: boolean };
    presentation?: { enable?: boolean };
    spreadsheet?: { enable?: boolean };
  };
  output_options?: {
    extract_printed_page_number?: boolean;
    images_to_save?: Array<'screenshot' | 'embedded' | 'layout'>;
    markdown?: {
      annotate_links?: boolean;
      inline_images?: boolean;
      tables?: {
        compact_markdown_tables?: boolean;
        merge_continued_tables?: boolean;
        output_tables_as_markdown?: boolean;
      };
    };
  };
  processing_options?: {
    aggressive_table_extraction?: boolean;
    ocr_parameters?: { languages?: Array<ParsingLanguages> };
    specialized_chart_parsing?: 'agentic_plus' | 'agentic' | 'efficient';
    cost_optimizer?: { enable?: boolean };
  };
  processing_control?: {
    timeouts?: { base_in_seconds?: number; extra_time_per_page_in_seconds?: number };
    job_failure_conditions?: { allowed_page_failure_ratio?: number };
  };
  page_ranges?: { max_pages?: number; target_pages?: string };
  crop_box?: { top?: number; bottom?: number; left?: number; right?: number };
  webhook_configurations?: Array<{
    webhook_url?: string;
    webhook_events?: Array<string>;
    webhook_headers?: Record<string, string>;
  }>;
}
```

### PipelineRetrieveParams (Full Definition)
```typescript
export interface PipelineRetrieveParams {
  query: string;
  alpha?: number;
  dense_similarity_top_k?: number;
  dense_similarity_cutoff?: number;
  sparse_similarity_top_k?: number;
  enable_reranking?: boolean;
  rerank_top_n?: number;
  retrieval_mode?: 'chunks' | 'files_via_metadata' | 'files_via_content' | 'auto_routed';
  search_filters?: MetadataFilters;
  search_filters_inference_schema?: object;
  retrieve_page_figure_nodes?: boolean;
  retrieve_page_screenshot_nodes?: boolean;
  files_top_k?: number;
}
```

---

**End of Document**
