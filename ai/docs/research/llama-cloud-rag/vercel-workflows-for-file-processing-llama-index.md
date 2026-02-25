# Durable PDF parsing with Vercel Workflow and LlamaParse

**Vercel's Workflow DevKit transforms long-running PDF processing from a fragile server action into a durable, automatically retried pipeline that survives serverless timeouts and deployment restarts.** This guide implements a complete system: upload a PDF, parse it to markdown via LlamaParse, store the result in Vercel Blob, and explore it through an AI-powered chat using bash-tool. The architecture replaces the previous server action approach with a step-based workflow that persists state to an event log, sleeps between LlamaParse polls without consuming compute, and retries failed steps automatically.

A critical note before diving in: the current Workflow DevKit (the `workflow` npm package) uses **`"use workflow"` and `"use step"` JavaScript directives** — not the older `context.run()` / `serve()` pattern you may have seen in earlier Upstash-era documentation. The API surface is fundamentally different and significantly more ergonomic.

## Complete project structure and configuration

```
pdf-workflow-app/
├── next.config.ts                    # withWorkflow wrapper
├── package.json
├── .env.local                        # API keys
├── workflows/
│   └── parse-pdf.ts                  # Durable PDF processing workflow
├── lib/
│   ├── llamaparse.ts                 # LlamaParse REST API client
│   └── blob-storage.ts              # Vercel Blob helpers
├── app/
│   ├── page.tsx                      # Main UI with upload + chat
│   ├── api/
│   │   ├── upload/
│   │   │   └── route.ts             # Vercel Blob client upload handler
│   │   ├── parse/
│   │   │   ├── route.ts             # POST: start workflow
│   │   │   └── [runId]/
│   │   │       └── route.ts         # GET: check workflow status
│   │   └── chat/
│   │       └── route.ts             # POST: bash-tool chat endpoint
│   └── components/
│       ├── pdf-uploader.tsx          # Upload + processing UI
│       └── document-chat.tsx         # Chat interface
```

**`package.json`** — all required dependencies:

```json
{
  "name": "pdf-workflow-app",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^16.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "workflow": "^4.0.1-beta.26",
    "ai": "^6.0.0",
    "@ai-sdk/react": "^2.0.0",
    "@ai-sdk/anthropic": "^5.0.0",
    "@vercel/blob": "^2.2.0",
    "bash-tool": "^1.3.14",
    "just-bash": "latest",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "typescript": "^5.7.0"
  }
}
```

**`next.config.ts`** — the `withWorkflow` wrapper enables the `"use workflow"` and `"use step"` directives via SWC build-time transformation:

```typescript
import { withWorkflow } from 'workflow/next';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['just-bash'],
};

export default withWorkflow(nextConfig);
```

**`.env.local`** — required environment variables:

```bash
LLAMA_CLOUD_API_KEY=llx-your-api-key-here
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_your-token-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

## The durable PDF processing workflow

The heart of the system is a single workflow file that orchestrates four discrete steps: upload the PDF to LlamaParse, start parsing, poll for completion with durable sleeps, and persist the markdown result. Each `"use step"` function runs in an isolated execution context with full Node.js access, automatic retries on failure, and result caching for replay.

**`workflows/parse-pdf.ts`**:

```typescript
import { sleep, FatalError, RetryableError } from 'workflow';

// ─── Types ────────────────────────────────────────────────────────

interface ParseResult {
  markdown: string;
  blobUrl: string;
  fileName: string;
  jobId: string;
  pageCount?: number;
}

interface JobStatus {
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  errorMessage: string | null;
  markdown?: string;
}

// ─── Workflow ─────────────────────────────────────────────────────

export async function parsePdfWorkflow(
  pdfBlobUrl: string,
  fileName: string,
  documentId: string,
): Promise<ParseResult> {
  'use workflow';

  // Step 1: Download PDF from Blob and upload to LlamaParse
  const jobId = await uploadAndStartParse(pdfBlobUrl, fileName);

  // Step 2: Poll for completion with durable sleeps
  // Each sleep suspends the workflow without consuming compute.
  // Each poll is a separate step — cached on replay.
  let finalStatus: JobStatus | null = null;

  for (let attempt = 0; attempt < 60; attempt++) {
    await sleep('5s');
    const status = await checkParseStatus(jobId);

    if (status.status === 'COMPLETED') {
      finalStatus = status;
      break;
    }

    if (status.status === 'FAILED' || status.status === 'CANCELLED') {
      throw new FatalError(
        `LlamaParse job ${status.status}: ${status.errorMessage ?? 'Unknown error'}`,
      );
    }

    // Still PENDING or RUNNING — loop continues
  }

  if (!finalStatus || finalStatus.status !== 'COMPLETED') {
    throw new FatalError('LlamaParse job timed out after 5 minutes of polling');
  }

  // Step 3: Fetch the full markdown result
  const markdown = await fetchMarkdownResult(jobId);

  // Step 4: Save markdown to Vercel Blob for persistent storage
  const blobUrl = await saveMarkdownToBlob(markdown, documentId, fileName);

  return { markdown, blobUrl, fileName, jobId };
}

// ─── Step functions ───────────────────────────────────────────────

async function uploadAndStartParse(
  pdfBlobUrl: string,
  fileName: string,
): Promise<string> {
  'use step';

  const LLAMA_API_KEY = process.env.LLAMA_CLOUD_API_KEY;
  if (!LLAMA_API_KEY) throw new FatalError('LLAMA_CLOUD_API_KEY not set');

  const BASE = 'https://api.cloud.llamaindex.ai';

  // Download PDF from Vercel Blob
  const pdfResponse = await fetch(pdfBlobUrl);
  if (!pdfResponse.ok) {
    throw new FatalError(
      `Failed to download PDF from Blob: ${pdfResponse.status}`,
    );
  }
  const pdfBuffer = await pdfResponse.arrayBuffer();

  // Upload to LlamaParse using the combined upload+parse v2 endpoint
  const formData = new FormData();
  formData.append(
    'file',
    new Blob([pdfBuffer], { type: 'application/pdf' }),
    fileName,
  );
  formData.append(
    'configuration',
    JSON.stringify({
      tier: 'agentic',
      version: 'latest',
      output_options: {
        markdown: {
          tables: { output_tables_as_markdown: true },
        },
      },
    }),
  );

  const parseResponse = await fetch(`${BASE}/api/v2/parse/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LLAMA_API_KEY}`,
    },
    body: formData,
  });

  if (parseResponse.status === 429) {
    throw new RetryableError('LlamaParse rate limited', { retryAfter: '30s' });
  }

  if (!parseResponse.ok) {
    const errorText = await parseResponse.text();
    throw new Error(
      `LlamaParse upload failed (${parseResponse.status}): ${errorText}`,
    );
  }

  const data = await parseResponse.json();
  return data.id; // job_id
}
uploadAndStartParse.maxRetries = 3;

async function checkParseStatus(jobId: string): Promise<JobStatus> {
  'use step';

  const LLAMA_API_KEY = process.env.LLAMA_CLOUD_API_KEY!;
  const BASE = 'https://api.cloud.llamaindex.ai';

  const response = await fetch(`${BASE}/api/v2/parse/${jobId}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${LLAMA_API_KEY}`,
    },
  });

  if (response.status === 429) {
    throw new RetryableError('Rate limited while polling', {
      retryAfter: '10s',
    });
  }

  if (!response.ok) {
    throw new Error(`Poll request failed: ${response.status}`);
  }

  const data = await response.json();
  return {
    status: data.job.status,
    errorMessage: data.job.error_message,
  };
}
checkParseStatus.maxRetries = 5;

async function fetchMarkdownResult(jobId: string): Promise<string> {
  'use step';

  const LLAMA_API_KEY = process.env.LLAMA_CLOUD_API_KEY!;
  const BASE = 'https://api.cloud.llamaindex.ai';

  const response = await fetch(
    `${BASE}/api/v2/parse/${jobId}?expand=markdown`,
    {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${LLAMA_API_KEY}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch markdown: ${response.status}`);
  }

  const data = await response.json();

  if (!data.markdown) {
    throw new FatalError('LlamaParse returned no markdown content');
  }

  return data.markdown;
}
fetchMarkdownResult.maxRetries = 3;

async function saveMarkdownToBlob(
  markdown: string,
  documentId: string,
  fileName: string,
): Promise<string> {
  'use step';

  // Dynamic import since @vercel/blob is a Node.js module
  const { put } = await import('@vercel/blob');

  const baseName = fileName.replace(/\.pdf$/i, '');
  const pathname = `parsed-docs/${documentId}/${baseName}.md`;

  const blob = await put(pathname, markdown, {
    access: 'public',
    contentType: 'text/markdown',
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  // Also save metadata sidecar
  await put(
    `parsed-docs/${documentId}/${baseName}.meta.json`,
    JSON.stringify({
      sourceFile: fileName,
      documentId,
      processedAt: new Date().toISOString(),
      markdownLength: markdown.length,
      blobUrl: blob.url,
    }),
    {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    },
  );

  return blob.url;
}
saveMarkdownToBlob.maxRetries = 2;
```

**How the polling loop works durably:** The `for` loop in the workflow function is not an ordinary loop — each iteration through `await sleep("5s")` suspends the entire workflow without consuming any compute. The workflow state is persisted to an event log. When the sleep expires, the workflow replays from the beginning using cached step results until it reaches the next unexecuted step. This means even if a Vercel Function times out or a deployment happens mid-parse, the workflow resumes exactly where it left off.

## API routes for triggering and monitoring workflows

**`app/api/upload/route.ts`** — handles Vercel Blob client uploads for PDFs of any size:

```typescript
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  const jsonResponse = await handleUpload({
    body,
    request,
    onBeforeGenerateToken: async (pathname) => ({
      allowedContentTypes: ['application/pdf'],
      maximumSizeInBytes: 100 * 1024 * 1024, // 100 MB max
    }),
    onUploadCompleted: async ({ blob }) => {
      console.log('PDF uploaded to Blob:', blob.pathname);
    },
  });

  return NextResponse.json(jsonResponse);
}
```

**`app/api/parse/route.ts`** — starts the workflow and returns a `runId` for tracking:

```typescript
import { start } from 'workflow/api';
import { parsePdfWorkflow } from '@/workflows/parse-pdf';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { pdfBlobUrl, fileName } = await request.json();

  if (!pdfBlobUrl || !fileName) {
    return NextResponse.json(
      { error: 'pdfBlobUrl and fileName are required' },
      { status: 400 },
    );
  }

  const documentId = crypto.randomUUID();

  const run = await start(parsePdfWorkflow, [pdfBlobUrl, fileName, documentId]);

  return NextResponse.json({
    runId: run.runId,
    documentId,
    status: 'started',
  });
}
```

**`app/api/parse/[runId]/route.ts`** — polls workflow status and retrieves the final result:

```typescript
import { getRun } from 'workflow/api';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;

  try {
    const run = getRun(runId);

    // Attempt to get the result with a short timeout.
    // If the workflow is still running, this will not resolve immediately.
    // We use Promise.race to avoid blocking the serverless function.
    const result = await Promise.race([
      run.result().then((value) => ({
        status: 'completed' as const,
        result: value,
      })),
      new Promise<{ status: 'running' }>((resolve) =>
        setTimeout(() => resolve({ status: 'running' }), 2000),
      ),
    ]);

    if (result.status === 'completed') {
      return NextResponse.json({
        status: 'completed',
        blobUrl: (result.result as any).blobUrl,
        fileName: (result.result as any).fileName,
        jobId: (result.result as any).jobId,
      });
    }

    return NextResponse.json({ status: 'running' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { status: 'failed', error: message },
      { status: 500 },
    );
  }
}
```

## The bash-tool chat endpoint

This is where parsed markdown becomes interactive. The chat route fetches markdown from Vercel Blob, loads it into bash-tool's virtual filesystem, and lets an AI agent explore the document using bash commands like `grep`, `cat`, `head`, and `awk`.

**`app/api/chat/route.ts`**:

```typescript
import { streamText, convertToModelMessages } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createBashTool } from 'bash-tool';
import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages, documentUrls } = await req.json();

  // documentUrls is an array of { url, fileName } objects
  // representing parsed markdown files stored in Vercel Blob
  if (!documentUrls || documentUrls.length === 0) {
    return NextResponse.json({ error: 'No documents loaded' }, { status: 400 });
  }

  // Fetch all markdown documents from Vercel Blob
  // and construct the virtual filesystem
  const files: Record<string, string> = {};

  for (const doc of documentUrls) {
    const response = await fetch(doc.url);
    if (!response.ok) {
      console.error(`Failed to fetch ${doc.url}: ${response.status}`);
      continue;
    }
    const markdown = await response.text();
    const baseName = doc.fileName.replace(/\.pdf$/i, '');
    files[`documents/${baseName}.md`] = markdown;
  }

  // Create bash-tool with the loaded documents
  const { tools } = await createBashTool({
    files,
    extraInstructions: [
      'The /documents directory contains parsed PDF documents in markdown format.',
      'Use bash commands to explore, search, and analyze these documents.',
      'Useful commands: cat, grep -i, head, tail, wc, awk, find, ls -la',
      'When the user asks about document content, search through the files first',
      'before answering — do not guess or hallucinate content.',
    ].join('\n'),
  });

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: `You are a document analysis assistant. You have access to parsed PDF documents
in a virtual filesystem. Use the bash, readFile, and writeFile tools to explore
and analyze these documents. Always ground your answers in the actual file content.
When asked about specific information, use grep to search for relevant sections first,
then read the surrounding context. Be precise and cite specific sections.`,
    messages: await convertToModelMessages(messages),
    tools,
    maxSteps: 15,
  });

  return result.toUIMessageStreamResponse();
}
```

## Client-side integration with React

**`app/components/pdf-uploader.tsx`** — handles the full upload → parse → status tracking flow:

```tsx
'use client';

import { upload } from '@vercel/blob/client';
import { useState, useCallback } from 'react';

interface ParsedDocument {
  url: string;
  fileName: string;
  documentId: string;
}

interface PdfUploaderProps {
  onDocumentReady: (doc: ParsedDocument) => void;
}

type Status =
  | { phase: 'idle' }
  | { phase: 'uploading'; progress: number }
  | { phase: 'parsing'; runId: string; documentId: string }
  | { phase: 'completed'; document: ParsedDocument }
  | { phase: 'error'; message: string };

export function PdfUploader({ onDocumentReady }: PdfUploaderProps) {
  const [status, setStatus] = useState<Status>({ phase: 'idle' });

  const handleUpload = useCallback(
    async (file: File) => {
      try {
        // Phase 1: Upload PDF to Vercel Blob
        setStatus({ phase: 'uploading', progress: 0 });

        const blob = await upload(file.name, file, {
          access: 'public',
          handleUploadUrl: '/api/upload',
          multipart: true,
          onUploadProgress: ({ percentage }) => {
            setStatus({ phase: 'uploading', progress: percentage });
          },
        });

        // Phase 2: Start the parse workflow
        setStatus({
          phase: 'parsing',
          runId: '',
          documentId: '',
        });

        const parseResponse = await fetch('/api/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pdfBlobUrl: blob.url,
            fileName: file.name,
          }),
        });

        if (!parseResponse.ok) {
          throw new Error(`Parse request failed: ${parseResponse.status}`);
        }

        const { runId, documentId } = await parseResponse.json();
        setStatus({ phase: 'parsing', runId, documentId });

        // Phase 3: Poll for workflow completion
        const document = await pollForCompletion(runId, documentId, file.name);

        setStatus({ phase: 'completed', document });
        onDocumentReady(document);
      } catch (error) {
        setStatus({
          phase: 'error',
          message: error instanceof Error ? error.message : 'Upload failed',
        });
      }
    },
    [onDocumentReady],
  );

  return (
    <div className="w-full max-w-lg mx-auto p-6 border rounded-lg">
      <h2 className="text-lg font-semibold mb-4">Upload PDF for Processing</h2>

      {status.phase === 'idle' && (
        <label className="flex flex-col items-center p-8 border-2 border-dashed rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
          <span className="text-gray-500 mb-2">
            Drop a PDF or click to upload
          </span>
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />
        </label>
      )}

      {status.phase === 'uploading' && (
        <div>
          <p className="mb-2">Uploading… {Math.round(status.progress)}%</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${status.progress}%` }}
            />
          </div>
        </div>
      )}

      {status.phase === 'parsing' && (
        <div className="flex items-center gap-3">
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
          <p>Parsing PDF with LlamaParse…</p>
        </div>
      )}

      {status.phase === 'completed' && (
        <div className="text-green-600 font-medium">
          ✓ {status.document.fileName} parsed successfully
        </div>
      )}

      {status.phase === 'error' && (
        <div className="text-red-600">
          <p className="font-medium">Error: {status.message}</p>
          <button
            className="mt-2 text-sm underline"
            onClick={() => setStatus({ phase: 'idle' })}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Polling helper ────────────────────────────────────────────

async function pollForCompletion(
  runId: string,
  documentId: string,
  fileName: string,
): Promise<ParsedDocument> {
  const MAX_POLLS = 120; // 10 minutes at 5s intervals
  const POLL_INTERVAL = 5000;

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));

    const response = await fetch(`/api/parse/${runId}`);
    if (!response.ok) continue;

    const data = await response.json();

    if (data.status === 'completed') {
      return {
        url: data.blobUrl,
        fileName: data.fileName,
        documentId,
      };
    }

    if (data.status === 'failed') {
      throw new Error(data.error ?? 'Workflow failed');
    }
  }

  throw new Error('Polling timed out after 10 minutes');
}
```

**`app/components/document-chat.tsx`** — the chat interface powered by bash-tool:

```tsx
'use client';

import { useChat } from '@ai-sdk/react';

interface DocumentChatProps {
  documentUrls: Array<{ url: string; fileName: string }>;
}

export function DocumentChat({ documentUrls }: DocumentChatProps) {
  const { messages, input, setInput, handleSubmit, status } = useChat({
    api: '/api/chat',
    body: { documentUrls },
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  return (
    <div className="flex flex-col h-[600px] border rounded-lg">
      <div className="p-3 border-b bg-gray-50">
        <h3 className="font-medium">Chat with your documents</h3>
        <p className="text-sm text-gray-500">
          {documentUrls.length} document{documentUrls.length > 1 ? 's' : ''}{' '}
          loaded
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.parts.map((part, i) => {
                if (part.type === 'text') {
                  return (
                    <div key={i} className="whitespace-pre-wrap">
                      {part.text}
                    </div>
                  );
                }
                if (part.type === 'tool-invocation') {
                  return (
                    <details key={i} className="text-xs opacity-60 mt-1">
                      <summary>Tool: {part.toolInvocation.toolName}</summary>
                      <pre className="mt-1 overflow-x-auto">
                        {JSON.stringify(part.toolInvocation.args, null, 2)}
                      </pre>
                    </details>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3 animate-pulse">
              Thinking…
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your document…"
          className="flex-1 p-2 border rounded"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
```

**`app/page.tsx`** — ties everything together:

```tsx
'use client';

import { useState } from 'react';
import { PdfUploader } from './components/pdf-uploader';
import { DocumentChat } from './components/document-chat';

interface ParsedDocument {
  url: string;
  fileName: string;
  documentId: string;
}

export default function Home() {
  const [documents, setDocuments] = useState<ParsedDocument[]>([]);

  return (
    <main className="max-w-4xl mx-auto py-12 px-4 space-y-8">
      <h1 className="text-3xl font-bold">PDF → Markdown → Chat</h1>

      <PdfUploader
        onDocumentReady={(doc) => setDocuments((prev) => [...prev, doc])}
      />

      {documents.length > 0 && (
        <DocumentChat
          documentUrls={documents.map((d) => ({
            url: d.url,
            fileName: d.fileName,
          }))}
        />
      )}
    </main>
  );
}
```

## Why Workflow beats server actions for PDF parsing

The previous server action approach suffered from a fundamental constraint: **Vercel serverless functions have hard timeout limits** — 10 seconds on Hobby, 60 seconds on Pro, 300 seconds on Enterprise. LlamaParse can take 30 seconds to several minutes for complex documents with the agentic tier. A server action that polls LlamaParse in a loop will timeout before the parse completes.

Vercel Workflow solves this through **durable execution with event sourcing**. When the workflow calls `await sleep("5s")`, the function terminates and no compute runs during that period. When the sleep expires, the system replays the workflow from the beginning, returning cached results for every previously executed step until reaching the next unexecuted code. This means a PDF that takes 3 minutes to parse costs only the compute for each individual step invocation (milliseconds each), not a continuously running function.

The practical differences are significant:

- **Timeout immunity**: Workflows can run for minutes, hours, or days. The 5-minute polling loop in the workflow above would require 300 seconds of continuous compute with a server action — impossible on Hobby or Pro tiers. With Workflow, each poll step runs for under 1 second.
- **Automatic step-level retries**: If LlamaParse returns a **429 rate limit**, the step throws `RetryableError` and re-executes after a configurable delay. Server actions require you to build retry logic manually.
- **Crash resilience**: If Vercel deploys a new version mid-parse, the workflow resumes from its last completed step. Server actions simply fail.
- **Built-in observability**: Run `npx workflow web` locally or check Vercel Dashboard → AI → Workflows in production to see every step's input, output, duration, and retry count. Server actions offer no such visibility without custom instrumentation.

## Error handling and retry mechanics in depth

Every `"use step"` function retries **3 times by default** (4 total attempts) when an unhandled error is thrown. The Workflow DevKit provides three error types for precise control:

```typescript
import { FatalError, RetryableError, getStepMetadata } from 'workflow';

async function robustLlamaParseUpload(pdfBlobUrl: string, fileName: string) {
  'use step';

  const metadata = getStepMetadata();
  console.log(`Attempt ${metadata.attempt} of upload`);

  const response = await fetch(
    'https://api.cloud.llamaindex.ai/api/v2/parse/upload',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.LLAMA_CLOUD_API_KEY}` },
      body: buildFormData(pdfBlobUrl, fileName),
    },
  );

  // 401/403: Bad API key — never retry, fix the config
  if (response.status === 401 || response.status === 403) {
    throw new FatalError(
      'Invalid LLAMA_CLOUD_API_KEY — check your environment variables',
    );
  }

  // 429: Rate limited — retry after the specified delay
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After') ?? '30';
    throw new RetryableError('LlamaParse rate limited', {
      retryAfter: `${retryAfter}s`,
    });
  }

  // 5xx: Server error — retry with exponential backoff
  if (response.status >= 500) {
    throw new RetryableError('LlamaParse server error', {
      retryAfter: metadata.attempt ** 2 * 2000, // 2s, 8s, 18s...
    });
  }

  // 4xx (other): Client error — likely malformed request, don't retry
  if (!response.ok) {
    const body = await response.text();
    throw new FatalError(
      `LlamaParse rejected upload (${response.status}): ${body}`,
    );
  }

  return (await response.json()).id;
}
robustLlamaParseUpload.maxRetries = 5;
```

**`FatalError`** stops the step immediately with no retries — use it for unrecoverable conditions like invalid credentials or malformed input. **`RetryableError`** lets you specify exactly when to retry via a duration string, Date object, or millisecond count. **Regular `Error`** triggers immediate retry with no delay, up to `maxRetries` attempts.

At the workflow level, a failed step (after exhausting retries) propagates the error to the workflow function. Wrap sections in try/catch to handle failures gracefully:

```typescript
export async function parsePdfWithFallback(
  pdfBlobUrl: string,
  fileName: string,
  docId: string,
) {
  'use workflow';

  try {
    const jobId = await uploadAndStartParse(pdfBlobUrl, fileName);
    // ... polling loop ...
    return await fetchAndSaveResult(jobId, docId, fileName);
  } catch (error) {
    // If agentic tier fails, fall back to cost_effective tier
    const jobId = await uploadAndStartParseFallback(pdfBlobUrl, fileName);
    // ... polling loop with the fallback job ...
    return await fetchAndSaveResult(jobId, docId, fileName);
  }
}
```

## Production deployment and operational concerns

**Step consumption matters.** The polling loop creates one step per poll iteration. A PDF that takes 60 seconds to parse generates roughly **12 polling steps** (at 5-second intervals) plus 3–4 processing steps, totaling ~16 steps per document. The Hobby plan includes **50,000 steps/month** — enough for ~3,000 PDF parses. At scale, increase the poll interval to 10 seconds for the `agentic` tier (which rarely finishes in under 15 seconds anyway) to halve step consumption.

**Handling very large PDFs.** PDFs over 50 pages with the `agentic_plus` tier can take 5+ minutes. Extend the polling loop cap and consider setting LlamaParse's `job_timeout_in_seconds` parameter. The Vercel Blob client upload supports files up to **5 TB** with multipart uploads, so file size is not a bottleneck on the upload side.

**Cost breakdown per document parse:**

| Component                       | Free tier              | Pro tier            |
| ------------------------------- | ---------------------- | ------------------- |
| Workflow steps (~16/parse)      | 50,000/mo included     | $25/million         |
| Workflow storage                | 1 GB/mo included       | $0.50/GB/mo         |
| Blob storage (markdown output)  | 1 GB/mo included       | $0.023/GB/mo        |
| LlamaParse (agentic, ~10 pages) | 10,000 credits/mo free | ~30 credits ($0.03) |
| Vercel Functions compute        | Included               | Standard rates      |

**Monitoring workflow runs.** In local development, run `npx workflow web` to open a web UI showing all workflow runs, each step's input/output, timing, and error details. In production on Vercel, navigate to your project's **AI → Workflows** section in the dashboard. Every step execution, sleep duration, retry attempt, and final result is automatically recorded in the event log.

**Idempotency for safety.** LlamaParse upload is not naturally idempotent — uploading the same PDF twice creates two separate jobs. If the upload step retries after a network timeout (where the request succeeded server-side but the response was lost), you may end up with a duplicate job. This is harmless but wastes credits. For critical production use, generate a deterministic job key from a hash of the file content and check for existing jobs before uploading.

**Environment-aware sleep intervals** speed up local development:

```typescript
const POLL_INTERVAL = process.env.NODE_ENV === 'production' ? '10s' : '3s';
// In the polling loop:
await sleep(POLL_INTERVAL);
```

## Wiring workflow output into the bash-tool filesystem

The connection between the workflow and the chat endpoint is Vercel Blob. The workflow's final step writes markdown to a Blob URL like `https://abcdef.public.blob.vercel-storage.com/parsed-docs/uuid/report.md`. The chat endpoint fetches this URL and injects the content into bash-tool's virtual filesystem. The AI agent then navigates these files like a developer exploring a codebase.

For **multiple documents**, the chat endpoint builds a richer filesystem:

```typescript
// In app/api/chat/route.ts — building the virtual filesystem
const files: Record<string, string> = {
  'README.md': `# Loaded Documents\n\n${documentUrls
    .map((d, i) => `${i + 1}. ${d.fileName}`)
    .join('\n')}`,
};

for (const doc of documentUrls) {
  const response = await fetch(doc.url);
  const markdown = await response.text();
  const baseName = doc.fileName.replace(/\.pdf$/i, '');
  files[`documents/${baseName}.md`] = markdown;
}
```

The agent can then run commands like `grep -rn "revenue" documents/` to search across all loaded documents, `wc -l documents/*.md` to compare document lengths, or `head -50 documents/quarterly-report.md` to preview content. This filesystem-based retrieval pattern is more flexible than stuffing all content into the system prompt — the agent decides what to read based on the user's question, reducing token waste for large documents.

## Conclusion

The shift from server actions to Vercel Workflow for PDF processing is not incremental — it changes the reliability model entirely. Server actions treat PDF parsing as a synchronous request that must complete within a serverless timeout window. Workflow treats it as a series of durable steps that persist progress, sleep without cost, retry on failure, and resume after crashes. The `"use workflow"` and `"use step"` directive system makes this surprisingly ergonomic — ordinary async/await code gains durability through two directive strings.

The most significant architectural insight is the **sleep-based polling pattern**: each `await sleep("5s")` in the workflow loop costs zero compute and creates zero risk of timeout, turning what was previously the hardest part of the server action approach (keeping a function alive while LlamaParse works) into the simplest. Combined with `RetryableError` for rate limit handling and `FatalError` for unrecoverable failures, the workflow handles every LlamaParse edge case without custom retry infrastructure.

For teams already using bash-tool for document exploration, the Vercel Blob bridge between workflow output and chat input creates a clean separation: the workflow handles durable processing, Blob handles persistent storage, and bash-tool handles interactive retrieval. Each component is independently testable and replaceable.
