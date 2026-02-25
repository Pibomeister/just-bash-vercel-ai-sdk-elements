# Durable File Processing with Vercel Workflow + LlamaParse + AI SDK/bash-tool

Status: Canonical research artifact  
Last updated: February 14, 2026  
Canonical path: `/Users/eduardopicazo/Documents/Workspace/Alia/ai-just-bash-rag/docs/ai/research/vercel-workflows-for-file-processing-llama-index.md`  
Legacy source path: `/Users/eduardopicazo/Documents/Workspace/Alia/ai-just-bash-rag/ai/docs/research/vercel-workflows-for-file-processing-llama-index.md`

## Executive Summary

This architecture replaces fragile long-polling server actions with durable workflow orchestration:

1. Upload source files (PDFs) to Vercel Blob.
2. Start a Vercel Workflow run that calls LlamaParse v2.
3. Poll LlamaParse inside the workflow with durable `sleep()`.
4. Persist parsed markdown and metadata to Blob.
5. Load parsed markdown into `bash-tool`/`just-bash` for grounded chat with AI SDK.

Key implementation result: long-running parsing is resilient to function timeout windows, deployment restarts, and transient API failures.

## Consolidation Notes

- This document is now the canonical source under `docs/ai/research`.
- The previous file under `ai/docs/research` remains as legacy context for now.
- Follow-up cleanup pass should add a legacy-pointer banner in the old file.

## Dependency Baseline (Verified 2026-02-14)

| Package | Version |
| --- | --- |
| `workflow` | `4.1.0-beta.57` |
| `ai` | `6.0.86` |
| `@ai-sdk/react` | `3.0.88` |
| `@ai-sdk/anthropic` | `3.0.44` |
| `@vercel/blob` | `2.2.0` |
| `bash-tool` | `1.3.14` |
| `just-bash` | `2.10.0` |
| `next` | `16.1.6` |
| `react` | `19.2.4` |

Operational note: there is no installed `github-cli` skill file in this environment; repository metadata validation used `gh` CLI directly.

## Core Architecture

```text
Client Upload UI
  -> /api/upload (Vercel Blob client upload)
  -> /api/parse (start workflow run)
     -> workflow: parsePdfWorkflow(...)
        -> step: upload/start LlamaParse
        -> sleep + step: poll LlamaParse
        -> step: fetch parse result (markdown)
        -> step: persist markdown + metadata to Blob
  -> /api/parse/[runId] (status/result polling)
  -> /api/chat (load Blob markdown files into bash-tool, run AI SDK chat)
```

## Verified API Corrections (Superseding Older Draft Assumptions)

### 1) `workflow/api` run retrieval contract

Use:
- `run.runId`
- `await run.status`
- `await run.returnValue`

Do not rely on `run.result()` in current Workflow DevKit docs.

Correct polling route shape:

```ts
import { getRun } from 'workflow/api';
import { NextResponse } from 'next/server';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const run = getRun(runId);

  const status = await run.status;

  if (status === 'completed') {
    const result = await run.returnValue as {
      blobUrl: string;
      fileName: string;
      jobId: string;
      documentId: string;
    };

    return NextResponse.json({ status, ...result });
  }

  if (status === 'failed' || status === 'cancelled') {
    return NextResponse.json({ status }, { status: 500 });
  }

  return NextResponse.json({ status });
}
```

### 2) AI SDK UI chat integration is transport-based

`useChat` no longer owns input state. Use local React state + `sendMessage`.

```tsx
'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

export function DocumentChat({ documentUrls }: {
  documentUrls: Array<{ url: string; fileName: string }>;
}) {
  const [input, setInput] = useState('');

  const { messages, status, sendMessage, stop } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { documentUrls },
    }),
  });

  const isBusy = status === 'submitted' || status === 'streaming';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const text = input.trim();
        if (!text || isBusy) return;
        sendMessage({ text });
        setInput('');
      }}
    >
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={isBusy}
      />
      <button type="submit" disabled={isBusy}>Send</button>
      {isBusy ? <button type="button" onClick={stop}>Stop</button> : null}
    </form>
  );
}
```

### 3) Function duration framing (Fluid vs non-Fluid)

Vercel currently documents two duration models:

- Fluid Compute enabled (default):
  - Hobby: default/max `300s`
  - Pro: default `300s`, max `800s`
  - Enterprise: default `300s`, max `800s`
- Fluid Compute disabled:
  - Hobby: default `10s`, max `60s`
  - Pro: default `15s`, max `300s`
  - Enterprise: default `15s`, max `900s`

Workflow still provides stronger durability guarantees than direct request/response polling even when function limits are higher.

### 4) Workflow pricing/storage rows

Current Workflow pricing rows from Vercel docs:

- Workflow Storage: first `720 GB-Hours` included; then `$0.00069 / GB-Hour`
- Workflow Steps: first `50,000 steps` included; then `$2.50 / 100,000 steps`

Functions compute billing remains separate.

## Implementation Deltas Required in App Design

### Delta A: `/api/parse/[runId]` route

- Replace `run.result()`-style retrieval with `run.status` and `run.returnValue`.
- Return standardized states: `pending|running|completed|failed|cancelled`.
- Include final output payload on `completed` only.

### Delta B: Chat UI migration to modern `useChat`

- Remove reliance on legacy `handleSubmit`/managed `input` APIs.
- Use transport + local input state + `sendMessage`.
- Keep `convertToModelMessages(messages)` in `/api/chat` before `streamText`.

Server route skeleton:

```ts
import { streamText, convertToModelMessages } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export async function POST(req: Request) {
  const { messages, documentUrls } = await req.json();

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    messages: await convertToModelMessages(messages),
    // tools injected from createBashTool(...)
    maxSteps: 15,
  });

  return result.toUIMessageStreamResponse();
}
```

### Delta C: Workflow idempotency for side effects

Use `getStepMetadata().stepId` for idempotency whenever downstream APIs accept keys.

```ts
import { getStepMetadata } from 'workflow';

async function externalSideEffectStep(payload: unknown) {
  'use step';

  const { stepId } = getStepMetadata();

  await callExternalApi(payload, {
    idempotencyKey: `parse:${stepId}`,
  });
}
```

If LlamaParse endpoints do not expose first-class idempotency key support for your call path, use `stepId` in your own dedupe registry/store and treat replayed calls as no-op when already committed.

### Delta D: LlamaParse result retrieval options

Support both retrieval patterns:

1. `GET /api/v2/parse/{job_id}?expand=markdown,text,...`
2. `GET /api/v2/parse/{job_id}/result?include_markdown=true`

Recommendation: use `expand=markdown` for straightforward inline result fetch in the same status call, and optionally fall back to `/result` where needed.

## LlamaParse v2 Production Configuration

### Endpoint choice rules

Use `POST /api/v2/parse/upload` when:
- uploading new file content from client/server multipart forms.

Use `POST /api/v2/parse` when:
- parsing an existing `file_id`, or
- parsing from `source_url`.

### Tier/version pinning policy

- Tiers: `fast | cost_effective | agentic | agentic_plus`
- Policy:
  - Production: pin explicit version date for reproducibility.
  - Staging: allow `latest` for early signal.
- Keep tier/version in explicit config, not implied defaults.

### Cache control

- `disable_cache: true` forces fresh parsing and prevents cache writes for that request.
- Use selectively; do not enable globally unless required for strict freshness.

### Processing control (timeouts/failure conditions)

Use `processing_control` to bound parse times and define failure strictness:

```json
{
  "processing_control": {
    "timeouts": {
      "base_in_seconds": 300,
      "extra_time_per_page_in_seconds": 30
    },
    "job_failure_conditions": {
      "allowed_page_failure_ratio": 0.1,
      "fail_on_image_extraction_error": false,
      "fail_on_image_ocr_error": false,
      "fail_on_markdown_reconstruction_error": true,
      "fail_on_buggy_font": false
    }
  }
}
```

### Output options for markdown/tables/images

For markdown-first retrieval and better table fidelity:

```json
{
  "output_options": {
    "markdown": {
      "annotate_links": true,
      "tables": {
        "output_tables_as_markdown": true,
        "merge_continued_tables": true
      }
    },
    "images_to_save": ["embedded"]
  }
}
```

### Webhook option

LlamaParse supports webhook configuration for completion notifications. Current docs indicate only the first webhook configuration is used. This enables webhook-driven completion as a later optimization over polling.

## bash-tool / just-bash Security and Runtime Posture

### Stay on `just-bash` when

- workload is text/file analysis using shell-like commands,
- no native binaries are required,
- you want secure-by-default virtual FS execution,
- you need predictable command constraints and optional network allow-listing.

### Switch to `@vercel/sandbox` when

- you need full VM semantics,
- you need real binaries/toolchains/runtime installs,
- you need stronger process isolation beyond simulated shell behavior.

### Network allow-list and command interception controls

`just-bash`:
- network is disabled by default,
- enabling network requires explicit allow-lists,
- `curl` exists only when network is configured.

`bash-tool`:
- use `onBeforeBashCall` to block/transform risky commands,
- use `onAfterBashCall` to normalize/truncate output,
- use custom `destination` and sandbox strategy for least privilege.

Example policy wiring:

```ts
import { Bash } from 'just-bash';
import { createBashTool } from 'bash-tool';

const sandbox = new Bash({
  cwd: '/workspace',
  network: {
    allowedUrlPrefixes: ['https://api.cloud.llamaindex.ai'],
    allowedMethods: ['GET', 'HEAD'],
  },
});

const { tools } = await createBashTool({
  sandbox,
  destination: '/workspace',
  onBeforeBashCall: ({ command }) => {
    if (command.includes('rm -rf')) {
      return { command: `echo 'blocked command'` };
    }
    return undefined;
  },
  maxOutputLength: 10_000,
});
```

## Standardized Internal Metadata Contract

Use this shape across uploader, parse status route, and chat loader:

```ts
interface ParsedDocument {
  documentId: string;
  fileName: string;
  markdownUrl: string;
  jobId?: string;
  parsedAt: string;
}
```

Storage recommendation:
- markdown file: `parsed-docs/{documentId}/{baseName}.md`
- sidecar metadata: `parsed-docs/{documentId}/{baseName}.meta.json`

## Recommended Workflow Skeleton (Updated)

```ts
import { sleep, FatalError, RetryableError } from 'workflow';

export async function parsePdfWorkflow(
  pdfBlobUrl: string,
  fileName: string,
  documentId: string,
) {
  'use workflow';

  const jobId = await uploadAndStartParse(pdfBlobUrl, fileName);

  for (let i = 0; i < 60; i++) {
    await sleep(process.env.NODE_ENV === 'production' ? '10s' : '3s');

    const status = await checkParseStatus(jobId);

    if (status === 'COMPLETED') {
      const markdown = await fetchMarkdown(jobId);
      const markdownUrl = await saveMarkdown(markdown, fileName, documentId, jobId);
      return {
        documentId,
        fileName,
        jobId,
        markdownUrl,
        parsedAt: new Date().toISOString(),
      };
    }

    if (status === 'FAILED' || status === 'CANCELLED') {
      throw new FatalError(`LlamaParse job ${status}`);
    }
  }

  throw new FatalError('Parse timeout exceeded workflow polling window');
}

async function checkParseStatus(jobId: string) {
  'use step';

  const res = await fetch(
    `https://api.cloud.llamaindex.ai/api/v2/parse/${jobId}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.LLAMA_CLOUD_API_KEY}`,
      },
    },
  );

  if (res.status === 429) {
    throw new RetryableError('LlamaParse rate-limited', { retryAfter: '10s' });
  }

  if (res.status === 401 || res.status === 403) {
    throw new FatalError('Invalid LlamaCloud credentials');
  }

  if (!res.ok) throw new Error(`Status request failed: ${res.status}`);

  const data = await res.json();
  return data.job.status as 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
}
```

## Test Cases and Scenarios (Downstream Implementation Checklist)

### Workflow lifecycle

- Start workflow run and receive `runId`.
- Poll `/api/parse/[runId]` until `completed`.
- Validate final payload includes `documentId`, `fileName`, `markdownUrl`, optional `jobId`.

### Retry semantics

- `429` and `5xx` produce retries.
- auth/config errors (`401/403` or malformed request `4xx`) fail fast (`FatalError`).

### Idempotency

- same step retried does not duplicate external side effects.
- step id (`stepId`) is used or mapped to dedupe mechanism.

### AI chat integration

- `useChat` + transport + `sendMessage` flow works.
- tool calling remains functional with `convertToModelMessages`.

### LlamaParse

- multipart upload path works (`/parse/upload`).
- result retrieval works with `expand=markdown`.
- optional `/result?include_markdown=true` fallback path validated.

### Large-file behavior

- Blob multipart upload path handles large files.
- workflow polling window handles multi-minute parse jobs.

### Security

- bash-tool command interception blocks dangerous patterns.
- just-bash network allow-list prevents unauthorized outbound calls.

## Risk Register and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Duplicate external side effects on retry | double writes/charges | use `stepId` idempotency key pattern and/or app-level dedupe store |
| Poll interval too short -> high step spend | cost inflation | default to longer production interval (`10s`), tune per tier |
| LlamaParse model/version drift | parse variance | pin explicit `version` in production, regression samples |
| AI SDK surface drift | chat regression | lock versions, follow migration guides, add thin adapter layer |

## Decision Log

1. Canonical research moves to `docs/ai/research`.
2. Keep old research file in place as legacy until explicit cleanup pass.
3. Standardize on `run.status` + `run.returnValue` for Workflow run retrieval.
4. Standardize client chat on transport-based `useChat` + `sendMessage`.
5. Keep LlamaParse polling in workflow; reserve webhook completion for later optimization.
6. Keep `just-bash` as default execution sandbox; adopt `@vercel/sandbox` when full VM needs emerge.

## Actionable Build Backlog

### P0 (required before implementation)

1. Create canonical research location and link internal references to it.
2. Update parse status route to `run.status` / `run.returnValue`.
3. Update chat client to transport-based `useChat` usage.
4. Standardize `ParsedDocument` contract and sidecar metadata shape.
5. Pin dependency and parser versions in implementation plan.

### P1 (hardening)

1. Add idempotency key wiring and dedupe fallback strategy.
2. Add adaptive poll interval by environment/tier.
3. Add structured error taxonomy and observability labels.
4. Add parse option profiles by document class (fast vs agentic).

### P2 (optional enhancements)

1. Webhook-driven parse completion to reduce polling.
2. DurableAgent streaming updates (`@workflow/ai`) for rich progress UI.
3. Persistent sandbox model with `@vercel/sandbox` where cross-turn state is needed.

## Primary Sources

- [Vercel Workflow docs](https://vercel.com/docs/workflow)
- [Workflow DevKit docs](https://useworkflow.dev/docs/getting-started)
- [Workflow `getRun` reference](https://useworkflow.dev/docs/api-reference/workflow-api/get-run)
- [Workflow `withWorkflow` reference](https://useworkflow.dev/docs/api-reference/workflow-next/with-workflow)
- [Workflow errors/retries](https://useworkflow.dev/docs/foundations/errors-and-retries)
- [Workflow idempotency](https://useworkflow.dev/docs/foundations/idempotency)
- [Vercel function duration limits](https://vercel.com/docs/functions/configuring-functions/duration)
- [Vercel Labs `bash-tool`](https://github.com/vercel-labs/bash-tool)
- [Vercel Labs `just-bash`](https://github.com/vercel-labs/just-bash)
- [AI SDK `useChat`](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat)
- [AI SDK `convertToModelMessages`](https://ai-sdk.dev/docs/reference/ai-sdk-ui/convert-to-model-messages)
- [AI SDK `streamText`](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text)
- [LlamaParse API v2 guide](https://developers.llamaindex.ai/typescript/cloud/llamaparse/api-v2-guide/)
- [LlamaCloud parse results reference](https://developers.llamaindex.ai/cloud-api-reference/get-parse-results-api-v-2-alpha-1-parse-job-id-result-get)
- [Blob multipart 5TB changelog](https://vercel.com/changelog/5tb-file-transfers-with-vercel-blob-multipart-uploads)
