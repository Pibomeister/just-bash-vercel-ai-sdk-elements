# just-bash-vercel-ai-sdk-elements

**The complete production blueprint for efficient AI agents.**

Avengers-level stack:

- **LlamaParse + LlamaIndex** -> agentic RAG with perfect citations
- **Mastra Observational Memory** -> human-like long-term memory (Observer + Reflector, 5-40x compression, zero context rot)
- **Vercel just-bash** -> secure sandboxed filesystem + tools
- **Deterministic sidecar.json enrichment** -> every document gets a Bash-optimized cheat sheet (TOC, entities, navigation helpers, Mexican legal regex library, hash verification)
- **Vercel ai-elements + streaming UI** -> custom tool-call rendering, thinking tokens, shadcn-compatible, full light/dark theming

**Why it matters**
Traditional RAG = dump everything -> token explosion.
This stack = intelligent retrieval + memory compression + instant Bash navigation.
Exactly how top coding agents stay fast and coherent.

Live demo (coming soon) • [1-click Vercel deploy](https://vercel.com/new/clone?repository-url=https://github.com/Pibomeister/just-bash-vercel-ai-sdk-elements) • MIT

## Table of Contents

- [Core Features](#core-features)
- [Tech Stack](#tech-stack)
- [App Surfaces](#app-surfaces)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [Quality and Testing](#quality-and-testing)
- [How the Main Flows Work](#how-the-main-flows-work)
- [Roadmap Ideas](#roadmap-ideas)

## Core Features

### 1) AI Bash Agent Chat
- Streaming chat UX with AI SDK v6.
- Tool-driven assistant that can use:
  - `bash` for shell exploration and text processing,
  - `readFile` for rich file preview,
  - `writeFile` for file creation/editing in sandbox.
- File tree rendering for command output and one-click file preview.
- Attachments, voice input, follow-up suggestions, and reasoning display.

### 2) Persistent Memory Support
- Thread and resource-aware memory context injection.
- Previous turns and working memory are loaded and injected into system context.
- History hydration endpoint for restoring prior conversations.
- Graceful timeout fallback for memory fetches to avoid blocking stream start.

### 3) Document Ingestion and Retrieval
- Upload and parse pipeline for user-provided files.
- Searchable document representations with metadata and sidecar navigation.
- Citations plumbing from both shell-based lookup and semantic search.
- Retrieval-aware answer rendering with source chips and inline citations.

### Smart Document Enrichment
For every uploaded file we generate a companion `sidecar.json` (deterministic, zero LLM cost):

- Auto-detected title and document type
- Full table of contents plus navigation commands
- Extracted entities
- Pre-built regex library (Mexican legal patterns included)
- Source hash for integrity
- Stats (lines, words, language)

The Bash agent can instantly use these to `grep`, navigate, or reason over massive documents without re-parsing.

### 4) RAG Playground
- Dedicated page for tuning retrieval behavior in isolation.
- Runtime controls for:
  - `alpha` (dense vs sparse blend),
  - `topK` (retrieval depth),
  - `rerankTopN` (final reranked set),
  - model selection.
- Search-focused system prompt with citation-indexed result references.

### 5) AI Elements UI Library
- Large collection of reusable AI-first components in `components/ai-elements/`.
- Includes chat primitives, prompt-box controls, tool output renderers, citations, document viewers, file tree, terminal output, and more.
- Built on shadcn/ui, Radix primitives, and Tailwind CSS 4.

### 6) Developer Ergonomics
- Strict TypeScript configuration.
- ESLint + Biome + Vitest + Husky pre-commit hooks.
- App Router architecture with focused API route modules.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19, Tailwind CSS 4, shadcn/ui, Radix UI
- **AI:** AI SDK (`ai`, `@ai-sdk/react`, provider packages)
- **Models/Providers:** OpenAI, Google provider packages
- **Memory/Data:** Mastra packages (`@mastra/core`, `@mastra/memory`, `@mastra/libsql`, `@mastra/pg`)
- **Retrieval:** LlamaCloud integration (`@llamaindex/llama-cloud`)
- **Validation:** Zod + React Hook Form
- **Testing:** Vitest + Testing Library + jsdom
- **Tooling:** PNPM, ESLint, Biome, Husky

## App Surfaces

- `/` - Main AI Bash Agent chat experience.
- `/rag-playground` - Retrieval tuning and semantic search experimentation UI.
- `/prompt-box-demo` - Prompt box and interaction demo surface.

## API Endpoints

The app exposes a rich set of API routes under `app/api/`. Key endpoints include:

- `POST /api/chat` - Main assistant streaming endpoint with tools and optional memory context.
- `GET /api/chat?threadId=...&resourceId=...` - Conversation hydration for existing thread.
- `POST /api/rag-playground` - Search-focused streaming endpoint with retrieval controls.
- `POST /api/upload` - File upload entry point.
- `POST /api/transcribe` - Transcription flow endpoint.
- `GET/POST /api/documents` and `GET /api/documents/[documentId]` - Document metadata and document operations.
- `GET /api/documents/[documentId]/file` - File-level document access.
- `GET /api/parse/[runId]` - Parse job status/results.
- `GET /api/memories`, `GET /api/memories/[id]` - Memory inspection endpoints.
- `GET /api/memory-status`, `GET /api/memory-policy` - Memory diagnostics/configuration endpoints.
- `POST /api/threads` and `GET /api/threads/[threadId]` - Thread lifecycle APIs.
- `POST /api/read-file` - Rich file preview helper route.
- `POST /api/suggestions` - Suggestion generation endpoint.

## Project Structure

```txt
app/
  api/                  # Route handlers (chat, documents, memory, retrieval)
  rag-playground/       # RAG tuning UI
  prompt-box-demo/      # Prompt box demo surface
components/
  ai-elements/          # Reusable AI-oriented UI primitives
  ui/                   # shadcn/ui components
hooks/                  # App-level React hooks
lib/                    # Core domain logic (sandbox, retrieval, parsing, memory)
workflows/              # Background/document workflows
test/                   # Unit tests
docs/                   # Research notes and docs
```

## Local Development

### Prerequisites
- Node.js 20+ (recommended)
- PNPM 9+

### Install

```bash
pnpm install
```

### Run

```bash
pnpm dev
```

Open `http://localhost:3000`.

### Production Build

```bash
pnpm build
pnpm start
```

## Environment Variables

Create a `.env.local` file as needed. Common variables used in this codebase include:

- `OPENAI_API_KEY` - Required for OpenAI model calls.
- `LLAMA_CLOUD_API_KEY` - Required for document parsing and the LlamaCloud indexing pipeline. Treat as secret; never expose to the client bundle.
- `LLAMA_CLOUD_PROJECT_ID` - Enables semantic search tooling in chat flows and scopes the indexing pipeline.
- `LLAMA_CLOUD_PIPELINE_NAME` - Optional override for the indexing pipeline name (default: `legal-documents`).
- Additional provider or storage secrets depending on enabled integrations (for example blob/document infrastructure).

Secrets must only be read from `process.env` in server-side code (API routes under `app/api/**`, server workflows, and `lib/**` modules loaded by the server). Never prefix secret names with `NEXT_PUBLIC_` and never reference them from `"use client"` components — both inline the value into the browser bundle. Use least-privileged secrets and avoid committing any `.env*` files (already excluded via `.gitignore`).

## Quality and Testing

```bash
pnpm lint
pnpm typecheck
pnpm biome:check
pnpm test
pnpm test:coverage
pnpm validate
```

Husky hooks are configured via `prepare`.

## How the Main Flows Work

### Chat flow (`/`)
1. User submits message (optional attachments/instructions).
2. Request streams through `/api/chat`.
3. Route composes system prompt + tool prompt + optional memory context.
4. Model can call tools (`bash`, `readFile`, `writeFile`, optional `searchDocuments`).
5. UI renders streaming parts, tool output, and citations.
6. Completed turns are persisted for memory-enabled sessions.

### Retrieval flow (`/rag-playground`)
1. User adjusts retrieval controls (`alpha`, `topK`, `rerankTopN`, model).
2. Request streams through `/api/rag-playground`.
3. Model invokes `searchDocuments` tool.
4. Results are surfaced with score-aware citation indices.

## Roadmap Ideas

- Add e2e tests for primary chat and retrieval scenarios.
- Add auth and role-based access controls for multi-user deployment.
- Expose ingestion status and indexing diagnostics in dedicated dashboards.
- Add deployment docs and production infrastructure templates.
