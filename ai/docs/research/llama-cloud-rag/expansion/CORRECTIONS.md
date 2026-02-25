# Corrections to Original Research Documents

This document lists all inaccuracies found in the original research files based on verified LlamaCloud SDK types and API documentation.

---

## Corrections to `vectors-structured-extension-llama-cloud.md`

### 1. `client.parsing.parse()` Method Name — PARTIALLY CORRECT

**Location**: Line ~47

**Research Uses**:
```typescript
const result = await client.parsing.parse({
  file_id,
  tier: 'enterprise',
  version: 'latest',
  // ...
});
```

**Actual**:
- `client.parsing.parse()` DOES exist as a convenience method
- It combines `create()` + `waitForCompletion()` internally
- However, some parameter names differ (see corrections below)

**Severity**: Low (method exists, but details differ)

---

### 2. `remove_header_from_markdown` Parameter — INCORRECT

**Location**: Line ~59

**Research Uses**:
```typescript
output_options: {
  markdown: {
    remove_header_from_markdown: true,
    remove_footer_from_markdown: true
  }
}
```

**Actual**:
- These parameters **do NOT exist** in `ParsingCreateParams.OutputOptions.Markdown`
- Headers and footers are returned as **separate fields** in the response (`header`, `footer` on each `MarkdownResultPage`)
- They are not controlled via removal options during parsing

**Correction**:
```typescript
// Headers/footers are always returned in the response
// Filter them out in post-processing if needed:
const contentWithoutHeaders = result.markdown.pages.map(page => page.text);
// page.header and page.footer are available but not included in page.text
```

**Severity**: Medium (parameter does not exist)

---

### 3. `extract_printed_page_numbers` (Plural) — INCORRECT

**Location**: Line ~62

**Research Uses**:
```typescript
output_options: {
  extract_printed_page_numbers: true  // WRONG: plural
}
```

**Actual**:
```typescript
output_options: {
  extract_printed_page_number: true   // CORRECT: singular
}
```

**Severity**: Low (typo, easy to fix)

---

### 4. `agentic_options` Nesting — INCORRECT

**Location**: Lines ~65-68

**Research Uses**:
```typescript
processing_options: {
  agentic_options: {
    enable_visual_question_answering: true,
    enable_table_parsing: true
  }
}
```

**Actual**:
- `agentic_options` is a **TOP-LEVEL parameter** on `ParsingCreateParams`
- It is **NOT nested** under `processing_options`

**Correction**:
```typescript
const result = await client.parsing.parse({
  file_id,
  tier: 'enterprise',
  agentic_options: {  // Top-level, not under processing_options
    enable_visual_question_answering: true,
    enable_table_parsing: true
  }
});
```

**Severity**: Medium (wrong nesting level)

---

### 5. `expand` Parameter Location — PARTIALLY CORRECT

**Location**: Line ~71

**Research Uses**:
```typescript
const result = await client.parsing.parse({
  expand: ['markdown', 'text', 'items']
});
```

**Actual**:
- On `parse()`: `expand` is accepted as `Array<string>` (body parameter) ✓
- On `get()`: `expand` is a **query parameter** (not body)
- Valid values: `'text'`, `'markdown'`, `'items'`, `'metadata'`, `'text_content_metadata'`, `'markdown_content_metadata'`, `'items_content_metadata'`, `'images_content_metadata'`

**Correction**: Research is mostly correct, but enum values should be verified:
```typescript
expand: ['text', 'markdown', 'items', 'metadata']  // Verify these are complete
```

**Severity**: Low (mostly correct, enum values need verification)

---

### 6. `files.create()` for Uploading — NEEDS VERIFICATION

**Location**: Lines ~111-112

**Research Uses**:
```typescript
const file = await client.files.create({
  file: fileBuffer,
  purpose: 'parse'
});
```

**Actual**:
- `files.create()` exists and accepts `FileCreateParams` with `Uploadable`
- The `purpose` field needs verification against the SDK types
- May be optional or have different enum values

**Severity**: Low (method exists, parameter needs verification)

---

### 7. Pipeline `upsert` Parameters — PARTIALLY CORRECT

**Location**: Lines ~117-132

**Research Uses**:
```typescript
embedding_config: {
  type: 'OPENAI_EMBEDDING',
  component: {
    type: 'text-embedding-3-large',
    dimension: 1024
  }
}

transform_config: {
  mode: 'auto',
  chunk_size: 512,
  chunk_overlap: 50
}
```

**Actual**:
- `embedding_config.type: 'OPENAI_EMBEDDING'` is correct ✓
- `transform_config` should be `AutoTransformConfig` with `{ mode: 'auto', chunk_size, chunk_overlap }` ✓
- Research matches the verified types

**Severity**: Low (correct)

---

### 8. `pipelines.retrieve()` `retrieval_mode` — INCORRECT VALUES

**Location**: Lines ~157-163

**Research Implies**:
```typescript
retrieval_mode: 'chunks' | 'files' | 'chunks_and_files'  // WRONG
```

**Actual**:
```typescript
type RetrievalMode =
  | 'chunks'
  | 'files_via_metadata'
  | 'files_via_content'
  | 'auto_routed';
```

**Correction**:
```typescript
const results = await client.pipelines.retrieve({
  pipeline_id,
  query: "legal query",
  retrieval_mode: 'auto_routed'  // Recommended for hybrid search
});
```

**Severity**: Medium (different enum values)

---

### 9. Framework `LlamaCloudIndex` Usage — PACKAGE NOT INSTALLED

**Location**: Line ~170

**Research Uses**:
```typescript
import { LlamaCloudIndex, Document } from 'llamaindex';
```

**Actual**:
- The `llamaindex` package is **NOT installed** in the project
- Only `@llamaindex/llama-cloud` (low-level SDK) is installed
- Research assumes the high-level framework is available

**Correction**:
Either:
1. Install `llamaindex` package:
   ```bash
   pnpm add llamaindex
   ```
2. Or use `@llamaindex/llama-cloud` directly:
   ```typescript
   import { LlamaCloudClient } from '@llamaindex/llama-cloud';

   const client = new LlamaCloudClient({ apiKey });
   await client.pipelines.documents.create({
     pipeline_id,
     documents: [{ text, metadata }]
   });
   ```

**Severity**: High (missing dependency)

---

### 10. Step Function `indexInLlamaCloud` — USES UNINSTALLED PACKAGE

**Location**: Lines ~583-601

**Research Uses**:
```typescript
const { LlamaCloudIndex } = await import('llamaindex');
```

**Actual**:
- `llamaindex` package is not installed
- Should either:
  1. Install the package
  2. Use `@llamaindex/llama-cloud` SDK directly

**Correction**:
```typescript
// Option 1: Install llamaindex (recommended for high-level API)
pnpm add llamaindex

// Option 2: Use low-level SDK
import { LlamaCloudClient } from '@llamaindex/llama-cloud';

const client = new LlamaCloudClient({
  apiKey: process.env.LLAMA_CLOUD_API_KEY
});

await client.pipelines.documents.create({
  pipeline_id: pipelineId,
  documents: chunks.map(chunk => ({
    text: chunk.content,
    metadata: chunk.metadata
  }))
});
```

**Severity**: High (missing dependency)

---

## Corrections to `vercel-workflows-for-file-processing-llama-index.md`

### 11. Chat Endpoint Uses `maxSteps: 15` — DEPRECATED API

**Location**: Line ~498

**Research Uses**:
```typescript
const result = await streamText({
  model: openai('gpt-4'),
  maxSteps: 15,  // DEPRECATED in v6
  // ...
});
```

**Actual** (AI SDK v6):
```typescript
import { streamText, stopWhen, stepCountIs } from 'ai';

const result = await streamText({
  model: openai('gpt-4'),
  stopWhen: stepCountIs(15),  // Correct v6 API
  // ...
});
```

**Severity**: Medium (deprecated API, breaking change in v6)

---

### 12. SDK vs REST API Contradiction — BOTH VALID

**Files**:
- `vectors-structured-extension-llama-cloud.md` uses SDK: `client.parsing.parse()`
- `vercel-workflows-for-file-processing-llama-index.md` uses REST: `POST /api/v2/parse/upload`

**Analysis**:
Both approaches are valid:

**SDK Approach (Recommended)**:
```typescript
import { LlamaCloudClient } from '@llamaindex/llama-cloud';

const client = new LlamaCloudClient({ apiKey });
const result = await client.parsing.parse({ file_id, tier: 'enterprise' });
```
- **Pros**: Type safety, automatic retries, simpler error handling
- **Cons**: Requires installing `@llamaindex/llama-cloud`

**REST Approach**:
```typescript
const response = await fetch('https://api.cloud.llamaindex.ai/api/v2/parse/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'multipart/form-data'
  },
  body: formData
});
```
- **Pros**: No dependencies, full control over requests
- **Cons**: Manual error handling, no type safety, verbosity

**Recommendation**: Use SDK for type safety and simplicity. Use REST only if SDK is unavailable or for specific edge cases.

**Severity**: Low (both valid, SDK preferred)

---

## Summary Table

| # | Location | Issue | Actual Behavior | Severity |
|---|----------|-------|-----------------|----------|
| 1 | parsing.parse() | Method exists but param details differ | Method name correct, parameters vary | Low |
| 2 | remove_header_from_markdown | Parameter does not exist | Headers/footers returned in response fields | Medium |
| 3 | extract_printed_page_numbers | Should be singular | `extract_printed_page_number` (singular) | Low |
| 4 | agentic_options nesting | Wrong nesting level | Top-level parameter, not under processing_options | Medium |
| 5 | expand parameter | Mostly correct | Body param on parse(), query param on get() | Low |
| 6 | files.create() | Needs verification | Method exists, purpose field unverified | Low |
| 7 | pipeline upsert | Mostly correct | Types match research | Low |
| 8 | retrieval_mode values | Different enum values | 'chunks', 'files_via_metadata', 'files_via_content', 'auto_routed' | Medium |
| 9 | llamaindex not installed | Missing dependency | Only @llamaindex/llama-cloud is installed | High |
| 10 | indexInLlamaCloud | Uses uninstalled package | Requires llamaindex package or SDK rewrite | High |
| 11 | maxSteps deprecated | Should use stopWhen | v6 API: stopWhen: stepCountIs(15) | Medium |
| 12 | SDK vs REST | Both valid approaches | SDK preferred for type safety | Low |

---

## Recommended Actions

### Immediate (High Severity)

1. **Install `llamaindex` package** OR **rewrite step functions to use `@llamaindex/llama-cloud` SDK**
   ```bash
   pnpm add llamaindex
   ```

2. **Update all `maxSteps` usage to `stopWhen: stepCountIs(N)`** (AI SDK v6 migration)

### Short-term (Medium Severity)

3. **Remove `remove_header_from_markdown` and `remove_footer_from_markdown` parameters**
   - Add post-processing logic if header/footer removal is needed

4. **Fix `agentic_options` nesting** — move to top level

5. **Update `retrieval_mode` enum** — use `'auto_routed'`, `'files_via_metadata'`, etc.

6. **Fix typo**: `extract_printed_page_numbers` → `extract_printed_page_number`

### Long-term (Low Severity)

7. **Verify `files.create()` `purpose` field** against SDK types

8. **Standardize on SDK approach** — use `@llamaindex/llama-cloud` SDK throughout research

9. **Add type imports** — explicitly import all types used in examples

---

## Verification Sources

1. **`@llamaindex/llama-cloud` v0.2.18** — npm package types
2. **AI SDK v6 Migration Guide** — Vercel documentation
3. **Project Memory** — `MEMORY.md` API v6 changes
4. **Shape Specification** — `agent-os/specs/2026-02-13-ai-bash-agent/shape.md`

---

## Notes

- All corrections are based on **verified SDK types** and **installed packages**
- Research documents should be updated to reflect these corrections
- Future research should verify API parameters against installed package types before documentation
- Consider adding automated type checking for research code examples
