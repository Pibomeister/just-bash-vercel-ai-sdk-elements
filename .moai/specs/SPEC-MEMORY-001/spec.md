---
id: SPEC-MEMORY-001
version: "1.0.0"
status: draft
created: 2026-02-21
updated: 2026-02-21
author: MoAI
priority: high
---

# HISTORY

| Version | Date       | Author | Changes         |
|---------|------------|--------|-----------------|
| 1.0.0   | 2026-02-21 | MoAI   | Initial draft   |

---

# SPEC-MEMORY-001: Chat Route Observational Memory Integration

## Overview

Integrate Mastra Observational Memory (OM) into the main chat route to give the AI assistant persistent, cross-session memory. The current route (`app/api/chat/route.ts`) is stateless — every conversation starts from scratch. This SPEC adds a three-tier compression-based memory system (raw messages → observations → reflections) backed by a database, without requiring a vector store or embedding model.

The integration uses a **hybrid approach**: AI SDK remains the execution engine (`streamText` / `ToolLoopAgent`) while Mastra operates as the persistence and retrieval layer. The pattern is: fetch memory → inject as system context → execute with AI SDK → persist turn to Mastra. The frontend's `useChat()` hook requires no changes.

---

## Module 1: Mastra OM Backend Setup

### 1.1 Package Installation

The system shall install the following production dependencies:
- `@mastra/core`
- `@mastra/memory`
- `@mastra/libsql`
- `@mastra/pg`
- `@mastra/client` (client SDK for memory CRUD operations)
- `@ai-sdk/google` (required by `google/gemini-2.5-flash` for Observer/Reflector)
- `nanoid` (for message ID generation)

Note: `@mastra/ai-sdk` is NOT required in this integration approach. AI SDK remains the execution engine; Mastra is used as a memory service only.

### 1.2 Centralized Mastra Instance

The system shall maintain a single Mastra instance instantiated at module scope in `lib/mastra.ts`.

- The instance shall NOT be created inside Next.js request handlers
- The instance shall be shared across all route handlers that require memory access

### 1.3 Observational Memory Configuration

The system shall configure Observational Memory with the following settings:

- Observer/Reflector model: `google/gemini-2.5-flash`
- Scope: `thread` (NOT `resource` — resource scope is experimental)
- Observation token threshold: 30,000 tokens (default)
- Reflection token threshold: 40,000 tokens (default)
- Async buffering: enabled (default)

When the raw message history exceeds the observation token threshold, the system shall activate the Observer agent asynchronously.

When observations exceed the reflection token threshold, the system shall activate the Reflector agent.

If background processing falls behind (`blockAfter: 1.2x` threshold), the system shall fall back to synchronous observation to prevent context overflow.

### 1.4 Storage Backend

While the `NODE_ENV` is `development`, the system shall use LibSQL storage (`@mastra/libsql`) with a local file at `./mastra.db`.

Where the application is deployed to production, the system shall use PostgreSQL storage (`@mastra/pg`) sourced from the `MASTRA_DATABASE_URL` environment variable.

The system shall initialize the storage instance at module scope and share it across all agents.

### 1.5 Next.js Configuration

The system shall add `"@mastra/*"` to `serverExternalPackages` in `next.config.ts` to prevent bundling Mastra modules into the Next.js server bundle.

---

## Module 2: Chat Route Integration

### 2.1 Request Schema

The system shall accept the following fields in the POST body for `/api/chat`:

- `messages`: `UIMessage[]` — current conversation messages (required, unchanged)
- `threadId`: `string` — unique conversation identifier (required for memory persistence)
- `resourceId`: `string` — user or tenant identifier (required for memory isolation)
- `instructions`: `string` — optional user instructions (existing, unchanged, max 2000 chars)

If `threadId` or `resourceId` is absent, the system shall fall back to a stateless `streamText` call to maintain backward compatibility.

### 2.2 Memory-Augmented Execution Cycle

When `threadId` and `resourceId` are provided, the system shall execute the following four-phase cycle:

**Phase 1 — Fetch memory:**
- Load working memory via `memory.getWorkingMemory({ threadId, resourceId })`
- Load recent messages via `memory.recall({ threadId, perPage: 50 })` or via `MastraClient`'s `thread.listMessages()`

**Phase 2 — Inject memory as system context:**
- Construct a `memoryContext` string that prepends:
  - `WORKING MEMORY:` block (stable user facts/preferences)
  - `RECENT MESSAGES:` block (last 20 messages from recall)
- Inject as a system or developer message before the user's current messages
- Track which memory version was used: `{ usedMemoryIds, memoryVersionSnapshot }`

**Phase 3 — Execute with AI SDK:**
- Continue using `streamText` with the existing model (`gpt-5.2`), tools, and provider options
- Pass the injected memory context as part of the system prompt
- Preserve `reasoningEffort: 'xhigh'` and `reasoningSummary: 'detailed'`

**Phase 4 — Persist turn to Mastra:**
- After streaming completes, in an `onFinish` callback, call `memory.saveMessageToMemory()` with both the user message and assistant response
- Each message shall include: `{ id, threadId, resourceId, role, content, createdAt, format: 2 }`
- Trigger OM observation update asynchronously (non-blocking)

The existing `streamText` call remains as the execution engine. No migration to Mastra's `Agent` class is required.

### 2.3 Tool Preservation

The system shall register all existing tools on the Mastra agent:
- `bash` (with citation wrapping via `wrapBashWithCitations`)
- `readFile`
- `writeFile`
- `searchDocuments` (when `LLAMA_CLOUD_PROJECT_ID` env var is set)

### 2.4 Provider Options Preservation

The system shall pass OpenAI Responses API options to the main agent model:
- `reasoningEffort: 'xhigh'`
- `reasoningSummary: 'detailed'`

The system shall send reasoning tokens to the client (`sendReasoning: true`).

### 2.5 Message Format Conversion

When retrieving messages from Mastra for client hydration, the system shall convert Mastra's internal message format to AI SDK `UIMessage[]` using `memory.recall().toAISdkV5Messages()` or equivalent conversion helper.

The `format: 2` field in Mastra messages is an internal versioning flag and shall not be exposed to the client.

### 2.6 History Hydration Endpoint

The system shall implement a GET handler for `/api/chat` that:
- Accepts `threadId` and `resourceId` as query parameters
- Returns the full `UIMessage[]` history for that thread via `memory.recall()`
- Returns an empty array if the thread does not exist

The GET handler shall NOT use `perPage: false` internally for agent context loading — this is reserved for the UI hydration endpoint only.

---

## Module 3: Thread Management API

### 3.1 Thread Creation

The system shall provide a `POST /api/threads` endpoint that:
- Accepts `resourceId` in the request body
- Creates a new thread via Mastra's memory API
- Returns `{ threadId, createdAt }` in the response

When a thread is created, the system shall set the `resourceId` as the immutable owner using Mastra's reserved context key (`MASTRA_RESOURCE_ID_KEY`) set server-side to prevent client spoofing.

### 3.2 Thread Listing

The system shall provide a `GET /api/threads` endpoint that:
- Accepts `resourceId` as a query parameter
- Returns a list of threads ordered by `updatedAt` descending
- Returns `{ threads: Array<{ threadId, title, createdAt, updatedAt, messageCount }> }`

### 3.3 Thread Deletion

The system shall provide a `DELETE /api/threads/:threadId` endpoint that:
- Accepts `resourceId` as a query parameter for ownership validation
- Deletes the thread and all associated messages
- Returns `{ success: true }` on success

If the `resourceId` does not match the thread's owner, the system shall return HTTP 403.

If the thread does not exist, the system shall return HTTP 404.

---

## Module 4: Memory Management API

### 4.1 Memory Listing

The system shall provide a `GET /api/memories` endpoint that:
- Accepts `threadId`, `resourceId`, `cursor`, `limit` (default: 50), `kind`, and `q` (text search) as query parameters
- Returns paginated observations and working memory for the thread
- Uses cursor-based pagination with shape `{ createdAt: string; id: string }`
- Returns `{ items: Observation[], nextCursor?: Cursor, totalApprox?: number }`

### 4.2 Memory Edit (Versioned)

The system shall provide a `PATCH /api/memories/:id` endpoint that:
- Accepts updated `text` in the request body
- Creates a new memory version (sets `version = previousVersion + 1`)
- Soft-deprecates the previous version (sets `status = 'archived'`)
- Returns the new version object

### 4.3 Memory Deletion

The system shall provide a `DELETE /api/memories/:id` endpoint that:
- Performs a soft delete (sets `status = 'deleted'`, does NOT remove the database row)
- Excludes soft-deleted items from all future `GET /api/memories` responses

### 4.4 Memory Policy

The system shall provide a `POST /api/memory-policy` endpoint that accepts:
- `useMemory`: `boolean` — whether to load memory into agent context
- `updateMemory`: `boolean` — whether to trigger OM observation updates
- `temporaryChat`: `boolean` — whether the current session should skip memory entirely

While `temporaryChat` is `true`, the system shall NOT load existing memories or write new observations for that session.

---

## Module 5: Frontend Integration

### 5.1 Thread ID Management

The system shall generate a `threadId` as a UUID on the client side.

The system shall persist `threadId` in `localStorage` under the key `mastra_thread_id` to survive page refreshes.

The system shall generate a stable `resourceId` and persist it in `localStorage` under `mastra_resource_id` as a placeholder (anonymous user) until an authentication system is added.

### 5.2 Message History Hydration

When the chat page mounts, the system shall:
- Read `threadId` and `resourceId` from `localStorage`
- Fetch message history from `GET /api/chat?threadId=...&resourceId=...`
- Hydrate the `useChat` state with the returned messages via `setMessages()`

### 5.3 Memory Inspector Component

The system shall provide a `MemoryInspector` Sheet component (right-side drawer) that:
- Shows "Observations" and "Reflections" tabs
- Displays each observation with: text, kind badge (`fact`, `decision`, `preference`, etc.), timestamp, and source type
- Provides a refresh button to reload memory state from the API
- Shows a "Pending" indicator while background OM processing is in-flight
- Is accessible via a Memory button in the chat header

The Memory Inspector shall be read-only in the MVP — editing and deletion actions are surfaced via the Memory Management API but not exposed in the UI in this SPEC.

### 5.4 Inline Memory Badge

When an assistant message is received, the system shall display an inline "Memory updated" badge if the response metadata includes `memoryUpdated: true`.

The badge shall link to the Memory Inspector Sheet on click.

---

## Non-Functional Requirements

### Performance

The system shall keep async OM observation jobs non-blocking — chat responses shall not wait for observation writes to complete before streaming to the client.

The system shall not call `perPage: false` on `memory.recall()` in agent context loading paths.

### Security

The system shall never trust client-supplied `resourceId` for ownership validation — always set `resourceId` server-side using `MASTRA_RESOURCE_ID_KEY`.

The system shall validate `threadId` format (UUID) on all memory endpoints.

The system shall never log or expose raw observation content in HTTP error responses.

### Observability

The system shall expose a `GET /api/memory-status` endpoint returning the current OM status (token usage, active tier, pending observations count) for debugging purposes.
