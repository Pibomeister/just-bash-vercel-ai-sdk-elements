# Web Research: LlamaIndex & LlamaCloud

## Executive Summary

LlamaIndex has undergone a major SDK and API transformation with the introduction of `@llamaindex/llama-cloud` and LlamaParse v2. The new SDK provides auto-generated TypeScript bindings from OpenAPI specs, ensuring API parity with minimal lag. LlamaParse v2 introduces a tier-based system (fast, cost_effective, agentic, agentic_plus) with structured output capabilities and custom prompting. For Spanish legal text processing, multilingual embedding models like `llama-text-embed-v2` and NVIDIA's `llama-embed-nemotron-8b` offer significant performance improvements over generic embeddings.

**CRITICAL: The old `llama-cloud-services` package is deprecated and will be maintained only until May 1, 2026. Migration to `@llamaindex/llama-cloud` is required for continued support.**

## Discovery Summary

Research focused on three critical areas:

1. **SDK Migration Path**: Identified the deprecation timeline and breaking changes between v1 and v2 APIs
2. **LlamaParse v2 Capabilities**: Discovered tier-based processing system with structured output support
3. **Multilingual Embeddings**: Found optimal models for Spanish legal text with 20%+ performance improvements

Key finding: The new SDK cannot access v1 API endpoints, making this a hard migration requirement rather than optional upgrade.

## SDK Migration

### Package Change

```bash
# Old (deprecated)
npm uninstall llama-cloud-services

# New (required)
npm install @llamaindex/llama-cloud
```

### Breaking Changes

- **API Version**: New SDK only supports v2 API endpoints
- **Import Paths**: All imports change from `llama-cloud-services` to `@llamaindex/llama-cloud`
- **Feature Parity**: v2 API achieves feature parity with v1 as of January 2026
- **Maintenance Window**: v1 API and old SDK supported until May 1, 2026

### SDK Generation

- Auto-generated from OpenAPI specifications
- Keeps TypeScript bindings synchronized with API changes
- Reduces manual maintenance overhead
- TypeScript SDK documentation lags slightly behind Python SDK

## LlamaParse v2 Tiers

### Tier Comparison

| Tier | Use Case | Speed | Accuracy | Custom Prompts | AI Reasoning |
|------|----------|-------|----------|----------------|--------------|
| **fast** | Simple documents | Fastest | Good | No | No |
| **cost_effective** | Budget-conscious | Fast | Good | Yes | No |
| **agentic** | Complex documents | Medium | High | Yes | Yes |
| **agentic_plus** | Maximum accuracy | Slower | Highest | Yes | Advanced |

### Tier Selection Guide

**fast**: Use for straightforward documents without complex layouts
- Invoices with standard formatting
- Simple contracts
- Basic text extraction

**cost_effective**: Budget option with customization needs
- High-volume processing
- Custom extraction requirements
- Consistent document formats

**agentic**: Complex document processing
- Financial statements
- Legal documents
- Scanned PDFs with OCR needs
- Multi-column layouts

**agentic_plus**: Maximum accuracy requirements
- Critical legal documents
- Complex financial reports
- Documents with mixed formats and embedded images
- Highest stakes applications

### Structured Output

The `expand` parameter controls output format:

- **text**: Plain text extraction
- **markdown**: Markdown-formatted output with structure preservation
- **items**: JSON-structured data extraction
- **metadata**: Document metadata and structure information
- **images_content_metadata**: Complete extraction including embedded images

### Custom Prompting

Available for `cost_effective`, `agentic`, and `agentic_plus` tiers:

```typescript
const result = await llamaParse.parse({
  file: documentBuffer,
  tier: 'agentic',
  prompt: 'Extract all contract clauses, payment terms, and party names',
  expand: 'items'
});
```

## Multilingual Embeddings

### Spanish Legal Text Optimization

**llama-text-embed-v2**:
- Supports 26 languages including Spanish
- Outperforms `text-embedding-3-large` by 20%+ on multilingual benchmarks
- Optimized for document retrieval tasks
- Production-ready and stable

**NVIDIA llama-embed-nemotron-8b**:
- #1 ranking on MTEB multilingual leaderboard
- Superior performance on Spanish text
- 8B parameter model for enhanced accuracy
- Best choice for critical legal document retrieval

### Dynamic Embedding Sizes

LlamaCloud supports variable embedding dimensions:
- Reduces storage requirements by up to 35x
- Maintains accuracy with dimension reduction
- Configurable per use case
- Trade-off between storage cost and retrieval precision

### Comparison Metrics

| Model | Spanish Performance | Storage Efficiency | Latency |
|-------|---------------------|-------------------|---------|
| text-embedding-3-large | Baseline | Standard | Low |
| llama-text-embed-v2 | +20% | 35x reduction (dynamic) | Low |
| llama-embed-nemotron-8b | +30%+ | Standard | Medium |

## Community Consensus

### Positive Feedback

- Auto-generated SDK approach keeps TypeScript bindings current
- v2 API structured output significantly improved over v1
- `waitForCompletion()` method eliminates manual polling complexity
- Tier system provides clear upgrade path based on accuracy needs

### Known Limitations

- TypeScript documentation lags behind Python SDK
- Migration from v1 to v2 requires code changes (not backward compatible)
- Some advanced features documented in Python examples only
- Community examples still reference deprecated `llama-cloud-services`

### Migration Experience

Developers report straightforward migration with primary challenges:
- Finding equivalent v2 API endpoints for v1 patterns
- Updating import statements across codebase
- Adapting to new response structures in structured output mode

## Documentation Extracts

### TypeScript SDK Installation

```typescript
import { LlamaCloudClient } from '@llamaindex/llama-cloud';

const client = new LlamaCloudClient({
  apiKey: process.env.LLAMA_CLOUD_API_KEY
});
```

### LlamaParse v2 Basic Usage

```typescript
const parseResult = await client.llamaParse.parse({
  file: fs.readFileSync('document.pdf'),
  tier: 'agentic',
  expand: 'markdown'
});

// Wait for completion
const finalResult = await parseResult.waitForCompletion();
console.log(finalResult.text);
```

### Structured Output Example

```typescript
const structuredResult = await client.llamaParse.parse({
  file: legalDocumentBuffer,
  tier: 'agentic_plus',
  expand: 'items',
  prompt: 'Extract party names, contract dates, payment amounts, and clauses'
});

const items = structuredResult.items; // JSON array of extracted entities
```

## Warnings

### Critical Deprecation Timeline

- **May 1, 2026**: End of maintenance for `llama-cloud-services` and v1 API
- **Action Required**: Migrate to `@llamaindex/llama-cloud` before this date
- **No Backward Compatibility**: v2 SDK cannot access v1 endpoints
- **Testing Required**: Thoroughly test migration in staging environment

### Migration Risks

- Breaking changes in response structures
- API endpoint paths have changed
- Authentication flow remains the same but method signatures differ
- Structured output format differs between v1 and v2

### Cost Implications

- Tier selection significantly impacts processing costs
- `agentic_plus` is premium-priced compared to `fast` tier
- High-volume applications should benchmark costs across tiers
- Dynamic embedding sizes reduce storage but may impact retrieval performance

## Sources

- [LlamaIndex TypeScript Cloud Guide](https://developers.llamaindex.ai/typescript/cloud/llamaparse/api-v2-guide/)
- [LlamaParse with TypeScript Tutorial](https://www.codu.co/articles/llamaparsereader-with-typescript-and-express-js-cumhj9l3)
- [LlamaCloud SDK Migration Announcement](https://www.llamaindex.ai/blog/announcing-new-llamacloud-sdks-and-parse-api-v2)
- LlamaIndex Community Discussions (Discord, GitHub Issues)
- LlamaCloud API Documentation
