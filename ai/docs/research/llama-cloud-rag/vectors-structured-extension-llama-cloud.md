# Building a legal document pipeline with LlamaIndex TypeScript and Vercel Workflows

**The complete pipeline—PDF ingestion through LlamaParse, structural metadata generation, LlamaCloud semantic indexing, and agent-friendly file storage—can be built entirely in TypeScript using three core packages: `@llamaindex/llama-cloud` for parsing and indexing, `workflow` for durable multi-step orchestration on Vercel, and `bash-tool` for AI agent filesystem access.** The LlamaIndex TypeScript ecosystem recently reached feature parity with its Python counterpart through a new auto-generated SDK, and Vercel's Workflow Development Kit (WDK) provides the exact durable execution model needed for long-running document processing. This report covers the full architecture with working TypeScript code, a battle-tested JSON sidecar schema for agent navigation, and comprehensive regex patterns for Mexican legal documents.

---

## The TypeScript package landscape has just shifted

The LlamaIndex TypeScript ecosystem is mid-migration. The correct packages for new projects as of February 2026:

| Package                   | Purpose                                                                                    | Status                     |
| ------------------------- | ------------------------------------------------------------------------------------------ | -------------------------- |
| `@llamaindex/llama-cloud` | **Low-level API client** — parsing, indexing, retrieval, file upload                       | ✅ Active, recommended     |
| `llamaindex`              | **Framework integration** — `LlamaCloudIndex`, `VectorStoreIndex`, `Document` abstractions | ✅ Active                  |
| `@llamaindex/openai`      | OpenAI LLM/embedding provider                                                              | ✅ Active                  |
| `llama-cloud-services`    | Legacy hand-written SDK                                                                    | ⚠️ Deprecated May 2026     |
| `@llamaindex/cloud`       | Old cloud integration                                                                      | ⚠️ Deprecated since v4.1.0 |

**Install the correct stack:**

```bash
npm install @llamaindex/llama-cloud llamaindex @llamaindex/openai
npm install workflow @vercel/blob bash-tool
npm install ai @ai-sdk/openai zod
```

Authentication uses a single API key (prefix `llx-`) from `cloud.llamaindex.ai/api-key`. Both the low-level client and framework accept it via constructor or `LLAMA_CLOUD_API_KEY` environment variable.

---

## LlamaParse v2 API extracts rich structural metadata

LlamaParse's v2 API (accessed through `@llamaindex/llama-cloud`) returns **page-segmented output with bounding boxes, table structure, and header/footer detection**. For legal PDFs, use the `agentic` or `agentic_plus` tier—these enable precise bounding box detection and handle complex layouts.

```typescript
import { LlamaCloud } from '@llamaindex/llama-cloud';
import fs from 'fs';

const client = new LlamaCloud({ apiKey: process.env.LLAMA_CLOUD_API_KEY! });

// Upload and parse with full structural metadata
const fileObj = await client.files.create({
  file: fs.createReadStream('./contrato-servicios.pdf'),
  purpose: 'parse',
});

const result = await client.parsing.parse({
  file_id: fileObj.id,
  tier: 'agentic',
  version: 'latest',
  input_options: {},
  output_options: {
    markdown: {
      tables: {
        output_tables_as_markdown: false, // HTML tables preserve structure better
        merge_continued_tables: true, // merge tables spanning pages
      },
      remove_header_from_markdown: true,
      remove_footer_from_markdown: true,
    },
    extract_printed_page_numbers: true, // actual printed page numbers
  },
  processing_options: {
    agentic_options: {
      custom_prompt:
        'This is a Mexican legal document. Preserve section numbering, article hierarchy (TÍTULO > CAPÍTULO > ARTÍCULO > fracción > inciso), clause numbering, and all legal citation formats exactly as written.',
    },
    ocr_parameters: { languages: ['es'] },
  },
  // Controls what structural data comes back
  expand: ['text', 'markdown', 'items', 'images_content_metadata'],
});

// Access page-segmented markdown
for (const page of result.markdown.pages) {
  console.log(`Page ${page.page_number}:\n${page.markdown}`);
}

// Access structured items (tables with rows, bounding boxes)
for (const page of result.items.pages) {
  for (const item of page.items) {
    if (item.type === 'table') {
      console.log(
        `Table on page ${page.page_number}: ${item.rows.length} rows`,
      );
    }
  }
}
```

The `expand` parameter is the key control. Setting `expand: ["markdown", "items"]` returns both formatted markdown and structured item data with bounding boxes per page. The JSON mode (via `items`) returns tables with rows, CSV representation, and `b_box` coordinates.

**What LlamaParse provides natively vs. what you must build:**

- ✅ **Native**: Page numbers/boundaries, table extraction with bounding boxes, header/footer separation, cross-page table merging, printed page number extraction, custom parsing instructions
- ⚠️ **Partial**: Headings are preserved in markdown (`#`, `##`) but no explicit hierarchy tree—you parse the heading structure yourself
- ❌ **Not native**: Table of contents, section-level metadata, semantic classification, post-processing hooks—all must be built client-side

---

## LlamaCloud indexing and semantic search in TypeScript

Once LlamaParse produces markdown, push it to a LlamaCloud index for embedding and semantic retrieval. Two approaches exist: the **low-level API client** gives full control over pipeline configuration, while the **framework `LlamaCloudIndex`** provides a simpler but less flexible interface.

### Low-level approach for production pipelines

```typescript
const client = new LlamaCloud({ apiKey: process.env.LLAMA_CLOUD_API_KEY! });

// 1. Upload parsed markdown as a document
const fileObj = await client.files.create({
  file: Buffer.from(markdownContent),
  purpose: 'user_data',
});

// 2. Create or connect to a pipeline with embedding config
const pipeline = await client.pipelines.upsert({
  name: 'legal-documents-index',
  project_id: 'your-project-id',
  embedding_config: {
    type: 'OPENAI_EMBEDDING',
    component: {
      api_key: process.env.OPENAI_API_KEY!,
      model_name: 'text-embedding-3-small',
    },
  },
  transform_config: {
    mode: 'auto',
    chunk_size: 512, // 256-512 tokens optimal for legal text
    chunk_overlap: 50,
  },
});

// 3. Add documents with metadata
await client.pipelines.documents.create(pipeline.id, {
  body: [
    {
      text: markdownContent,
      metadata: {
        documentId: 'contract-2024-001',
        documentType: 'contrato',
        title: 'Contrato de Servicios Profesionales',
        parties: 'Acme S.A. de C.V., Beta S. de R.L.',
      },
    },
  ],
});

// 4. Poll for indexing completion
let status = await client.pipelines.getStatus(pipeline.id, {});
while (status.status === 'IN_PROGRESS') {
  await new Promise((r) => setTimeout(r, 5000));
  status = await client.pipelines.getStatus(pipeline.id, {});
}

// 5. Semantic search with hybrid retrieval
const results = await client.pipelines.retrieve(pipeline.id, {
  query: '¿Cuáles son las obligaciones de confidencialidad?',
  dense_similarity_top_k: 20,
  sparse_similarity_top_k: 20,
  alpha: 0.5, // hybrid: 0=keyword, 1=vector, 0.5=balanced
  enable_reranking: true,
  rerank_top_n: 5,
});
```

### Framework approach for simpler cases

```typescript
import { LlamaCloudIndex, Document } from 'llamaindex';

const doc = new Document({
  text: markdownContent,
  metadata: { documentId: 'contract-2024-001', type: 'contrato' },
});

// Creates index, uploads, embeds — all in one call
const index = await LlamaCloudIndex.fromDocuments({
  documents: [doc],
  name: 'legal-documents',
  projectName: 'Default',
  apiKey: process.env.LLAMA_CLOUD_API_KEY!,
});

// Query with configurable retrieval
const retriever = index.asRetriever({
  denseSimilarityTopK: 5,
  alpha: 0.5,
  enableReranking: true,
});
const nodes = await retriever.retrieve('cláusula de penalización');
```

LlamaCloud supports **OpenAI, Cohere, Gemini, HuggingFace, AWS Bedrock, and Azure** embedding models. For Spanish legal text, `text-embedding-3-small` works well, though fine-tuning `multilingual-e5-large` on a legal corpus would improve precision.

---

## The JSON sidecar schema that makes bash agents effective

The design draws from how three production AI agents navigate files: **Cursor** stores line-number ranges alongside vector embeddings, **Claude Code** relies on `CLAUDE.md` sidecar files as persistent navigation context, and **Aider** generates a repo map of key symbols with PageRank-based importance scoring. Vercel's own research found that replacing custom tools with filesystem + bash **cut costs 75%** and **improved success rate from 80% to 100%** for document analysis tasks.

The core principle: **the agent reads the sidecar first, identifies which sections are relevant by scanning summaries, then uses `sed -n 'START,ENDp'` to extract only what it needs.** The sidecar should never exceed what fits in a single context window read.

### Complete sidecar schema

```json
{
  "schemaVersion": "1.0.0",
  "generatedAt": "2026-02-15T10:30:00Z",
  "sourceFile": "contrato-servicios-2024.md",
  "sourceHash": "sha256:a1b2c3...",

  "document": {
    "title": "Contrato de Prestación de Servicios Profesionales",
    "type": "contrato",
    "totalLines": 1847,
    "totalWords": 28450,
    "language": "es",
    "parties": [
      {
        "name": "Grupo Industrial Alfa S.A. de C.V.",
        "role": "Prestador",
        "definedAs": "EL PRESTADOR"
      },
      {
        "name": "Comercializadora Beta S. de R.L.",
        "role": "Cliente",
        "definedAs": "EL CLIENTE"
      }
    ]
  },

  "tableOfContents": [
    {
      "id": "declaraciones",
      "heading": "DECLARACIONES",
      "level": 1,
      "lineStart": 5,
      "lineEnd": 48,
      "summary": "Both parties declare legal capacity, RFC, and representative credentials. Prestador is a Mexican SA de CV incorporated in Monterrey.",
      "grepPattern": "^# DECLARACIONES"
    },
    {
      "id": "clausula-primera",
      "heading": "CLÁUSULA PRIMERA: Objeto",
      "level": 1,
      "lineStart": 50,
      "lineEnd": 78,
      "summary": "Defines scope of professional services: IT consulting and ERP implementation. References Anexo A for detailed SOW.",
      "grepPattern": "^# CL[AÁ]USULA PRIMERA"
    },
    {
      "id": "clausula-septima",
      "heading": "CLÁUSULA SÉPTIMA: Confidencialidad",
      "level": 1,
      "lineStart": 340,
      "lineEnd": 410,
      "summary": "Mutual NDA with 3-year survival. Excludes publicly available info. Penalty: 500 UMAs per breach.",
      "grepPattern": "^# CL[AÁ]USULA S[ÉE]PTIMA"
    }
  ],

  "entities": {
    "dates": [
      {
        "value": "15 de marzo de 2024",
        "context": "Fecha efectiva del contrato",
        "line": 3
      },
      {
        "value": "15 de septiembre de 2025",
        "context": "Fin del plazo inicial",
        "line": 520
      }
    ],
    "monetaryAmounts": [
      {
        "value": "$2,500,000.00 M.N.",
        "context": "Valor total del contrato",
        "line": 110
      },
      { "value": "$150,000.00 M.N.", "context": "Pago mensual", "line": 115 }
    ],
    "definedTerms": [
      {
        "term": "Información Confidencial",
        "definedAtLine": 345,
        "usageLines": [120, 400, 567]
      },
      {
        "term": "Entregables",
        "definedAtLine": 55,
        "usageLines": [200, 310, 450]
      }
    ],
    "legalReferences": [
      { "type": "ley", "reference": "Código Civil Federal", "line": 600 },
      { "type": "nom", "reference": "NOM-035-STPS-2018", "line": 380 }
    ]
  },

  "navigation": {
    "quickCommands": {
      "readSection": "sed -n '{{lineStart}},{{lineEnd}}p' contrato-servicios-2024.md",
      "findAllHeadings": "grep -n '^#' contrato-servicios-2024.md",
      "findDefinedTerms": "grep -nE '\\(\"[^\"]+\"\\)' contrato-servicios-2024.md",
      "findMoneyAmounts": "grep -nE '\\$[0-9]' contrato-servicios-2024.md",
      "findArticleRefs": "grep -niE '(artículo|art\\.)\\s+[0-9]' contrato-servicios-2024.md",
      "findNOMRefs": "grep -n 'NOM-' contrato-servicios-2024.md",
      "findObligations": "grep -niE '\\b(deberá|obligación|se obliga)\\b' contrato-servicios-2024.md"
    },
    "sectionsByTopic": {
      "payment": { "sections": ["clausula-segunda"], "lineRange": [79, 140] },
      "confidentiality": {
        "sections": ["clausula-septima"],
        "lineRange": [340, 410]
      },
      "termination": {
        "sections": ["clausula-novena"],
        "lineRange": [480, 550]
      },
      "governing_law": {
        "sections": ["clausula-decima"],
        "lineRange": [551, 600]
      }
    }
  },

  "legalPatterns": {
    "regexLibrary": {
      "articles": "(?:Art[íi]culo|Art\\.)\\s+\\d{1,4}\\s*(?:Bis|Ter|Qu[aá]ter)?",
      "fractions": "fracci[oó]n(?:es)?\\s+[IVXLCDM]+",
      "clausulas": "CL[AÁ]USULA\\s+(?:PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|S[ÉE]PTIMA|OCTAVA|NOVENA|D[ÉE]CIMA)",
      "noms": "NOM-\\d{3}-[A-Z]{2,10}-\\d{4}",
      "dofDates": "DOF\\s+\\d{1,2}[-/]\\d{1,2}[-/]\\d{2,4}",
      "spanishDates": "\\d{1,2}\\s+de\\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\\s+de\\s+\\d{4}",
      "pesos": "\\$[\\d,]+(?:\\.\\d{1,2})?\\s*(?:M\\.?N\\.?|pesos|MXN)?",
      "legalEntities": "S\\.A\\.(?:\\s*de\\s*C\\.V\\.)?|S\\.\\s*de\\s*R\\.L\\.(?:\\s*de\\s*C\\.V\\.)?"
    }
  }
}
```

### Two-pass generation strategy

**Pass 1 (deterministic, no API calls)**: Extract headings with line numbers, regex-match entities (dates, amounts, NOMs, defined terms), build the table of contents, classify sections by topic using keyword matching. This runs in milliseconds.

**Pass 2 (LLM-enhanced)**: Send each section's text to an LLM via Vercel AI SDK's `generateObject` to produce high-quality `summary` fields, accurate party extraction with roles, and risk flags. This is the expensive but high-value step.

```typescript
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// LLM pass for section summaries
const { object } = await generateObject({
  model: openai('gpt-4o'),
  schema: z.object({
    sections: z.array(
      z.object({
        id: z.string(),
        summary: z
          .string()
          .describe(
            '1-2 sentence summary helping an agent decide if this section is relevant',
          ),
        riskFlags: z.array(z.string()).optional(),
      }),
    ),
    parties: z.array(
      z.object({
        name: z.string(),
        role: z.string(),
        definedAs: z.string(),
      }),
    ),
    documentType: z.enum(['contrato', 'ley', 'sentencia', 'nom', 'otro']),
  }),
  prompt: `Analyze this Mexican legal document and provide section summaries and party extraction:\n\n${markdownContent.slice(0, 12000)}`,
});
```

### Agent system prompt integration

```
You have access to legal documents as markdown files with JSON sidecar metadata.

WORKFLOW:
1. ALWAYS read the .meta.json sidecar first to understand document structure
2. Scan tableOfContents summaries to identify relevant sections
3. Use sed -n 'START,ENDp' filename.md to read ONLY the sections you need
4. Use navigation.quickCommands for common searches
5. Use entities for pre-extracted dates, amounts, and defined terms
6. NEVER read the entire markdown file at once — use targeted extraction
```

---

## Vercel Workflows wire it all together

Vercel's **Workflow Development Kit (WDK)** is currently in beta and provides exactly the execution model needed: **durable, resumable, multi-step pipelines with automatic retry and state persistence**. Each step compiles into an isolated API route; between steps, the workflow suspends without consuming compute resources. There are **no overall timeout limits**—individual steps run as standard Vercel Functions (5 min default, up to 800s on Pro).

Two directives power the entire system: `"use workflow"` marks the orchestrator (sandboxed, deterministic), and `"use step"` marks units of durable work (full Node.js runtime).

### Pipeline architecture

```
POST /api/process-document
        │
  ┌─────▼──────┐
  │  WORKFLOW   │  "use workflow" — orchestrates steps
  └─────┬──────┘
        │
  ┌─────▼──────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
  │  Step 1    │────▶│   Step 2     │────▶│   Step 3     │────▶│   Step 4     │
  │ LlamaParse │     │ Metadata Gen │     │ LlamaCloud   │     │ Blob Storage │
  │ PDF → MD   │     │ JSON Sidecar │     │ Index + Embed│     │ PDF+MD+JSON  │
  └────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### Complete workflow implementation

```typescript
// next.config.ts
import { withWorkflow } from 'workflow/next';
import type { NextConfig } from 'next';
export default withWorkflow({} satisfies NextConfig);
```

```typescript
// workflows/document-pipeline.ts

export async function processDocumentPipeline(
  pdfUrl: string,
  documentId: string,
) {
  'use workflow';

  // Step 1: Parse PDF to markdown via LlamaParse
  const parseResult = await parsePdfWithLlamaParse(pdfUrl);

  // Step 2: Generate structural metadata + agent hints
  const metadata = await generateSidecarMetadata(
    parseResult.markdown,
    documentId,
    parseResult.pageCount,
  );

  // Step 3: Push to LlamaCloud for semantic search
  await indexInLlamaCloud(parseResult.markdown, metadata, documentId);

  // Step 4: Store all artifacts in Vercel Blob
  await storeAllArtifacts(pdfUrl, parseResult.markdown, metadata, documentId);

  return { documentId, status: 'completed', pages: parseResult.pageCount };
}
```

```typescript
// steps/parse-pdf.ts
export async function parsePdfWithLlamaParse(pdfUrl: string) {
  'use step';

  const { LlamaCloud } = await import('@llamaindex/llama-cloud');
  const client = new LlamaCloud({ apiKey: process.env.LLAMA_CLOUD_API_KEY! });

  const pdfResponse = await fetch(pdfUrl);
  const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

  const fileObj = await client.files.create({
    file: new Blob([pdfBuffer]),
    purpose: 'parse',
  });

  const result = await client.parsing.parse({
    file_id: fileObj.id,
    tier: 'agentic',
    version: 'latest',
    output_options: {
      markdown: {
        tables: { merge_continued_tables: true },
        remove_header_from_markdown: true,
        remove_footer_from_markdown: true,
      },
      extract_printed_page_numbers: true,
    },
    processing_options: {
      agentic_options: {
        custom_prompt:
          'Mexican legal document. Preserve article/clause numbering hierarchy exactly.',
      },
      ocr_parameters: { languages: ['es'] },
    },
    expand: ['markdown', 'items'],
  });

  const fullMarkdown = result.markdown.pages
    .map((p: any) => `<!-- Page ${p.page_number} -->\n${p.markdown}`)
    .join('\n\n');

  return {
    markdown: fullMarkdown,
    pageCount: result.markdown.pages.length,
    pages: result.markdown.pages,
  };
}
```

```typescript
// steps/generate-metadata.ts
export async function generateSidecarMetadata(
  markdown: string,
  documentId: string,
  pageCount: number,
) {
  'use step';

  // Pass 1: Deterministic extraction
  const lines = markdown.split('\n');
  const toc = extractTableOfContents(lines);
  const entities = extractEntities(lines);

  // Pass 2: LLM-enhanced summaries
  const { generateObject } = await import('ai');
  const { openai } = await import('@ai-sdk/openai');
  const { z } = await import('zod');

  const { object: aiMeta } = await generateObject({
    model: openai('gpt-4o'),
    schema: z.object({
      title: z.string(),
      documentType: z.enum(['contrato', 'ley', 'sentencia', 'nom', 'otro']),
      parties: z.array(
        z.object({
          name: z.string(),
          role: z.string(),
          definedAs: z.string(),
        }),
      ),
      sectionSummaries: z.array(
        z.object({
          id: z.string(),
          summary: z.string(),
        }),
      ),
    }),
    prompt: `Analyze this Mexican legal document. For each section, write a 1-2 sentence summary that helps an AI agent decide whether to read it.\n\nSections:\n${toc.map((s) => `[${s.id}] Lines ${s.lineStart}-${s.lineEnd}: ${s.heading}`).join('\n')}\n\nDocument (first 10000 chars):\n${markdown.slice(0, 10000)}`,
  });

  // Merge AI summaries into TOC
  for (const section of toc) {
    const aiSummary = aiMeta.sectionSummaries.find((s) => s.id === section.id);
    if (aiSummary) section.summary = aiSummary.summary;
  }

  return {
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    sourceFile: `${documentId}.md`,
    document: {
      title: aiMeta.title,
      type: aiMeta.documentType,
      totalLines: lines.length,
      language: 'es',
      parties: aiMeta.parties,
    },
    tableOfContents: toc,
    entities,
    navigation: buildNavigationHints(`${documentId}.md`, toc, lines),
    legalPatterns: { regexLibrary: MEXICAN_LEGAL_REGEX },
  };
}
```

```typescript
// steps/index-llamacloud.ts
export async function indexInLlamaCloud(
  markdown: string,
  metadata: any,
  documentId: string,
) {
  'use step';

  const { LlamaCloudIndex, Document } = await import('llamaindex');

  const doc = new Document({
    text: markdown,
    metadata: {
      documentId,
      title: metadata.document.title,
      documentType: metadata.document.type,
      parties: metadata.document.parties.map((p: any) => p.name).join(', '),
    },
  });

  await LlamaCloudIndex.fromDocuments({
    documents: [doc],
    name: 'legal-documents',
    projectName: 'Default',
    apiKey: process.env.LLAMA_CLOUD_API_KEY!,
  });
}
```

```typescript
// steps/store-artifacts.ts
export async function storeAllArtifacts(
  pdfUrl: string,
  markdown: string,
  metadata: any,
  documentId: string,
) {
  'use step';

  const { put } = await import('@vercel/blob');

  const pdfResponse = await fetch(pdfUrl);
  await put(`documents/${documentId}/source.pdf`, await pdfResponse.blob(), {
    access: 'public',
    addRandomSuffix: false,
  });

  await put(`documents/${documentId}/content.md`, markdown, {
    access: 'public',
    contentType: 'text/markdown',
    addRandomSuffix: false,
  });

  await put(
    `documents/${documentId}/metadata.json`,
    JSON.stringify(metadata, null, 2),
    {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    },
  );
}
```

### Route handler trigger

```typescript
// app/api/process-document/route.ts
import { start } from 'workflow/api';
import { processDocumentPipeline } from '@/workflows/document-pipeline';

export async function POST(request: Request) {
  const { pdfUrl, documentId } = await request.json();
  await start(processDocumentPipeline, [pdfUrl, documentId]);
  return Response.json({ message: 'Pipeline started', documentId });
}
```

### Key WDK constraints to know

- **Deploy to `iad1` region**—WDK's backend is single-region there during beta
- **All step parameters and return values must be JSON-serializable** (passed by value, not reference)
- **`"use step"` only works on top-level exported functions**, not arrow functions inside objects
- **Step timeouts**: 5 min default, 800s max on Pro—large PDFs may need polling within the step
- **Determinism required**: No `Math.random()` or `new Date()` in workflow orchestrators—only inside steps
- **Vercel Blob server uploads max 4.5 MB**—use multipart for larger PDFs

---

## Comprehensive regex patterns for Mexican legal documents

Mexican law follows a strict hierarchical citation system. The patterns below cover the major citation types in JavaScript/TypeScript regex format.

### Core citation patterns

```typescript
const MEXICAN_LEGAL_REGEX = {
  // Articles: "Artículo 123", "Art. 1 Bis", "artículo 27"
  articles: String.raw`(?:Art[íi]culo|Art\.)\s+(?:Transitorio\s+)?\d{1,4}\s*(?:Bis|Ter|Qu[aá]ter)?`,

  // Fractions: "fracción I", "fracciones I, II y III"
  fractions: String.raw`fracci[oó]n(?:es)?\s+[IVXLCDM]+(?:\s*[,y]\s*[IVXLCDM]+)*`,

  // Incisos: "inciso a)", "incisos a) y b)"
  incisos: String.raw`inciso(?:s)?\s+[a-z]\)(?:\s*[,y]\s*[a-z]\))*`,

  // NOMs: "NOM-001-STPS-2008", "NOM-059-SEMARNAT-2010"
  noms: String.raw`NOM-\d{3}-[A-Z]{2,10}(?:\/[A-Z]{2,10})?-\d{4}`,

  // DOF short: "DOF 01-01-2024"
  dofShort: String.raw`DOF\s+\d{1,2}[-/]\d{1,2}[-/]\d{2,4}`,

  // DOF long form
  dofLong: String.raw`(?:publicad[oa]|reformad[oa])\s+en\s+el\s+Diario\s+Oficial\s+de\s+la\s+Federaci[oó]n\s+(?:el\s+)?\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+\d{4}`,

  // Contract clauses: "CLÁUSULA PRIMERA", "Cláusula Décima Segunda"
  clausulas: String.raw`CL[AÁ]USULA\s+(?:PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|S[ÉE]PTIMA|OCTAVA|NOVENA|D[ÉE]CIMA(?:\s+(?:PRIMERA|SEGUNDA|TERCERA))?|VIG[ÉE]SIMA(?:\s+\w+)?|\d+)`,

  // Spanish dates: "15 de marzo de 2024"
  spanishDates: String.raw`\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+\d{4}`,

  // Mexican pesos: "$1,000,000.00 M.N."
  pesos: String.raw`\$[\d,]+(?:\.\d{1,2})?\s*(?:M\.?N\.?|pesos|MXN)?`,

  // UMAs/UDIs: "500 UMAs", "1,000 UDIs"
  umas: String.raw`[\d,]+(?:\.\d{1,2})?\s*(?:UMA[Ss]?|UDI[Ss]?|VSM)`,

  // Legal entities: "S.A. de C.V.", "S. de R.L. de C.V."
  legalEntities: String.raw`S\.A\.(?:\s*de\s*C\.V\.)?|S\.\s*de\s*R\.L\.(?:\s*de\s*C\.V\.)?|S\.A\.P\.I\.(?:\s*de\s*C\.V\.)?|A\.C\.|S\.A\.S\.`,

  // Tesis/jurisprudencia: "Tesis 1a./J. 15/2023 (11a.)"
  tesis: String.raw`[Tt]esis\s+(?:\d{1,2}a\.\s*(?:\/J\.)?\s*)?\d{1,4}\/\d{4}\s*(?:\(\d{1,2}a\.\))?`,

  // Structural headers in legislation
  titulos: String.raw`T[IÍ]TULO\s+(?:PRIMERO|SEGUNDO|TERCERO|CUARTO|QUINTO|[IVXLC]+)`,
  capitulos: String.raw`CAP[IÍ]TULO\s+(?:[IVXLC]+|\d+)`,

  // Court ruling structure
  considerandos: String.raw`CONSIDERANDO\s*(?:PRIMERO|SEGUNDO|TERCERO|\d+)?`,
  resolutivos: String.raw`(?:PUNTOS?\s+)?RESOLUTIVOS?|R\s*E\s*S\s*U\s*E\s*L\s*V\s*E`,
};
```

### Document type detection

```typescript
function detectDocumentType(
  markdown: string,
): 'contrato' | 'ley' | 'sentencia' | 'nom' | 'otro' {
  const text = markdown.slice(0, 3000).toUpperCase();
  if (/CLÁUSULA\s+PRIMERA|DECLARACIONES.*CLÁUSULAS|CONTRATO\s+DE/.test(text))
    return 'contrato';
  if (/CONSIDERANDO|RESULTANDO|RESUELVE|VISTOS/.test(text)) return 'sentencia';
  if (/^NOM-\d{3}/.test(text) || /NORMA\s+OFICIAL\s+MEXICANA/.test(text))
    return 'nom';
  if (
    /ARTÍCULO\s+1|CAPÍTULO\s+I|TÍTULO\s+PRIMERO|DISPOSICIONES\s+GENERALES/.test(
      text,
    )
  )
    return 'ley';
  return 'otro';
}
```

---

## Chunking strategies tuned for Mexican legal text

The optimal chunking strategy depends on document type. **Article-level chunking** is the default for legislation because each article is a self-contained legal unit. For contracts, chunk at the **cláusula** level. For court rulings, chunk at the **considerando** level.

**Legal-aware separator hierarchy** (in priority order for recursive chunking):

```typescript
const LEGAL_SEPARATORS = [
  /^(?:LIBRO|T[IÍ]TULO|CAP[IÍ]TULO|SECCI[OÓ]N)\s/m, // Major divisions
  /^(?:Art[íi]culo|ART[ÍI]CULO)\s+\d/m, // Articles
  /^(?:CL[AÁ]USULA)\s/m, // Contract clauses
  /^(?:CONSIDERANDO|RESULTANDO)\s/m, // Ruling sections
  /^(?:[IVXLC]+\.\s|-\s|[a-z]\)\s)/m, // Fractions/incisos
  /\n\n/, // Paragraph break
  /\.\s/, // Sentence boundary
];
```

**Critical practice: always prepend hierarchical context** to each chunk. A chunk containing Article 76's text should include its path: `[Ley Federal del Trabajo > Título Tercero > Capítulo II] Artículo 76.- Los trabajadores que tengan más de un año...`. Without this prefix, queries like "vacation rights under labor law" will fail to match isolated article text.

**Recommended chunk sizes**: **256–512 tokens** for legislation and contracts (dense, precise lookup), **500–1000 tokens** for court ruling considerandos (longer legal reasoning that needs context). Use **zero overlap** at article/clause boundaries (they're self-contained) and **50-token overlap** only when splitting within a single long article.

**Metadata to attach per chunk**: `document_type`, `document_name`, `hierarchy_path` (e.g., "Título Tercero > Capítulo II > Artículo 76"), `article_number`, `dof_date`, and `last_reform_date`. LlamaCloud's metadata filtering combined with hybrid search (`alpha: 0.5`) then enables queries like "find all articles about vacation in the Ley Federal del Trabajo" to hit both the vector similarity and keyword paths.

---

## Connecting the bash agent to processed documents

Vercel's `bash-tool` package provides an in-memory sandboxed filesystem that supports `cat`, `grep`, `find`, `sed`, `awk`, and `jq`. Pre-populate it with your processed documents and sidecars from Vercel Blob:

```typescript
import { createBashTool } from 'bash-tool';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { list } from '@vercel/blob';

// Fetch all processed documents from Blob storage
const { blobs } = await list({ prefix: 'documents/' });
const files: Record<string, string> = {};

for (const blob of blobs) {
  if (blob.pathname.endsWith('.md') || blob.pathname.endsWith('.json')) {
    const res = await fetch(blob.url);
    files[`/${blob.pathname}`] = await res.text();
  }
}

// Also load the MANIFEST.json (top-level document index)
files['/MANIFEST.json'] = JSON.stringify({
  documents: blobs
    .filter((b) => b.pathname.endsWith('.meta.json'))
    .map((b) => ({
      file: b.pathname.replace('.meta.json', '.md'),
      sidecar: b.pathname,
    })),
});

const { tools } = await createBashTool({ files });

const result = await generateText({
  model: openai('gpt-4o'),
  tools,
  system: `You are a legal document analyst. You have access to Mexican legal documents.

WORKFLOW:
1. cat /MANIFEST.json to see all available documents
2. For each relevant document, cat its .meta.json sidecar FIRST
3. Read section summaries in tableOfContents to find relevant sections
4. Use sed -n 'START,ENDp' to extract only needed sections
5. Use the navigation.quickCommands for pattern searches
6. NEVER cat an entire .md file — always use targeted extraction`,
  prompt:
    '¿Cuáles son las obligaciones de confidencialidad en el contrato de servicios?',
});
```

### Project structure

```
my-pipeline/
├── next.config.ts                  # withWorkflow(nextConfig)
├── app/
│   └── api/
│       ├── process-document/
│       │   └── route.ts            # POST trigger → starts workflow
│       └── query/
│           └── route.ts            # Agent query endpoint
├── workflows/
│   └── document-pipeline.ts        # Main workflow + step functions
├── lib/
│   ├── metadata/
│   │   ├── sidecar-generator.ts    # Deterministic extraction
│   │   ├── mexican-legal-regex.ts  # All regex patterns
│   │   └── topic-classifier.ts     # Keyword-based topic mapping
│   └── agent/
│       └── document-agent.ts       # bash-tool agent setup
└── package.json
```

---

## Conclusion

The pipeline rests on three well-matched technologies. **LlamaParse's v2 API** via `@llamaindex/llama-cloud` handles the hardest part—extracting structured markdown from complex legal PDFs with page boundaries and table metadata intact. **Vercel WDK** provides durable multi-step orchestration that gracefully handles LlamaParse's async processing and retries failures automatically. The **JSON sidecar pattern**, validated by Vercel's own research showing 75% cost reduction, turns the bash agent from a brute-force file reader into a precision instrument that reads summaries first, then extracts only relevant sections.

The most impactful design decision is the **two-pass metadata generation**: deterministic regex extraction (fast, free, reliable) followed by LLM-powered section summarization (the summaries are what make the agent effective). For Mexican legal documents specifically, the hierarchical chunking strategy—articles for legislation, cláusulas for contracts, considerandos for rulings, always with hierarchy path prepended—aligns with how Mexican law is actually structured and referenced. The comprehensive regex library covers the full citation apparatus from NOMs and DOF references to tesis and UMAs.

One important caveat: Vercel WDK is still in beta with single-region deployment and evolving APIs. The `"use step"` directive has a known limitation preventing use in arrow functions. For production, pin your `workflow` package version and plan for migration when WDK reaches GA.
