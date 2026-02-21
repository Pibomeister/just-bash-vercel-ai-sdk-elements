# SPEC-MEMORY-001 Implementation Plan

## Overview

This plan covers the full implementation of Mastra Observational Memory integration across 5 modules. Each module is independently deliverable. Modules 1 and 2 are the critical path — all other modules depend on them.

---

## Technology Stack

### New Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@mastra/core` | `^0.10.x` | Mastra core framework + Memory class |
| `@mastra/memory` | `^1.1.x` | Observational Memory implementation |
| `@mastra/libsql` | `^0.10.x` | LibSQL/SQLite storage backend |
| `@mastra/pg` | `^0.10.x` | PostgreSQL storage backend |
| `@mastra/client` | `^0.10.x` | Client SDK: `createMemoryThread`, `thread.listMessages`, `saveMessageToMemory`, `getWorkingMemory` |
| `@ai-sdk/google` | `^1.x` | Google AI provider for Gemini 2.5 Flash (Observer/Reflector) |
| `nanoid` | `^5.x` | Stable UUID generation for message IDs |

Note: `@mastra/ai-sdk` is NOT included. AI SDK remains the execution engine; Mastra operates as the memory backend only.

### Existing Dependencies (unchanged)

- `ai` (AI SDK v6), `@ai-sdk/react`, `@ai-sdk/openai` — chat streaming, useChat hook
- `bash-tool`, `just-bash` — sandbox execution
- `zod` — schema validation
- `next`, `react`, `tailwindcss`, `shadcn/ui` — framework and UI

---

## File Map

### New Files

```
lib/
  mastra.ts                          # Mastra Memory instance + OM configuration
  mastra-client.ts                   # Singleton MastraClient wrapper (thread/message CRUD)
  memory-storage.ts                  # Storage factory (LibSQL dev / PostgreSQL prod)

app/api/
  chat/route.ts                      # MODIFIED — adds threadId/resourceId support
  threads/route.ts                   # POST (create), GET (list)
  threads/[threadId]/route.ts        # DELETE
  memories/route.ts                  # GET (list)
  memories/[id]/route.ts             # PATCH, DELETE
  memory-policy/route.ts             # POST
  memory-status/route.ts             # GET (debug)

components/ai-elements/
  memory-inspector.tsx               # Memory Sheet component
  memory-badge.tsx                   # Inline "Memory updated" badge

hooks/
  use-thread.ts                      # threadId/resourceId localStorage management
```

### Modified Files

```
app/api/chat/route.ts                # Adds threadId/resourceId, agent.stream()
app/page.tsx                         # Hydration on mount, Memory Inspector button
next.config.ts                       # serverExternalPackages: ["@mastra/*"]
.env.local (example)                 # MASTRA_DATABASE_URL, GOOGLE_API_KEY
```

---

## Module 1: Mastra OM Backend Setup

### Task 1.1 — Install packages

```bash
pnpm add @mastra/core @mastra/memory @mastra/libsql @mastra/pg @mastra/ai-sdk @ai-sdk/google
```

### Task 1.2 — Create `lib/memory-storage.ts`

Storage factory that selects LibSQL in development and PostgreSQL in production. Instantiated once at module scope.

```typescript
// Returns: MastraStorage instance
export const memoryStorage = createMemoryStorage()
```

### Task 1.3 — Create `lib/mastra.ts`

Central file containing:
- `Memory` instance with OM config (Gemini 2.5 Flash observer, thread scope, 30K/40K thresholds)
- `chatAgent` with all tools (bash, readFile, writeFile, searchDocuments) registered
- `mastra` Mastra instance for route access

Critical: Instantiated at module scope. Never inside request handlers.

### Task 1.4 — Update `next.config.ts`

Add `serverExternalPackages: ['@mastra/core', '@mastra/memory', '@mastra/libsql', '@mastra/pg', '@mastra/ai-sdk']`.

---

## Module 2: Chat Route Integration

### Integration Pattern Reference

The core integration uses Mastra as an external memory service. AI SDK (`streamText`) remains the execution engine unchanged. The four-phase cycle per request:

```typescript
// Phase 1: Fetch memory
const mastraClient = new MastraClient({ baseUrl: process.env.MASTRA_BASE_URL })
const wm = await mastraClient.getWorkingMemory({ agentId, threadId, resourceId })
const thread = mastraClient.getMemoryThread({ threadId, agentId })
const { messages: priorMessages } = await thread.listMessages({ perPage: 50, page: 0 })

// Phase 2: Build memory context string
const memoryContext = [
  wm?.workingMemory ? `WORKING MEMORY:\n${wm.workingMemory}` : null,
  priorMessages?.length
    ? `RECENT MESSAGES:\n${priorMessages.slice(-20).map(m => `- [${m.role}] ${m.content}`).join('\n')}`
    : null,
].filter(Boolean).join('\n\n')

// Phase 3: Execute with streamText (unchanged execution engine)
const result = streamText({
  model: openai('gpt-5.2'),
  system: `${systemPrompt}\n${memoryContext ? `## Memory Context\n${memoryContext}` : ''}`,
  messages: modelMessages,
  tools: { ...tools, ...searchTools },
  stopWhen: stepCountIs(30),
  providerOptions: { openai: { reasoningEffort: 'xhigh', reasoningSummary: 'detailed' } },
  async onFinish({ text }) {
    // Phase 4: Persist turn to Mastra (non-blocking)
    const now = new Date()
    await mastraClient.saveMessageToMemory({
      agentId,
      messages: [
        { id: nanoid(), threadId, resourceId, role: 'user', content: lastUserMessage, createdAt: now, format: 2 },
        { id: nanoid(), threadId, resourceId, role: 'assistant', content: text, createdAt: new Date(), format: 2 },
      ],
    })
  },
})
```

Key reference: `format: 2` is Mastra's internal message format version (required for `saveMessageToMemory`). Use `toAISdkV5Messages()` from Mastra's `Memory.recall()` result when converting stored messages back to AI SDK format.

### Task 2.1 — Add threadId/resourceId to POST body validation

Add Zod parsing for `threadId` (UUID optional) and `resourceId` (string optional).

### Task 2.2 — Implement fetch → inject → persist cycle

Two code paths inside the POST handler:
- **With threadId + resourceId**: Execute the 4-phase memory cycle above; use `streamText` with memory context injected
- **Without**: Fall back to existing `streamText` call unchanged (backward compatible)

### Task 2.3 — Create `lib/mastra-client.ts`

Singleton MastraClient instance at module scope. Exports typed wrappers around:
- `createMemoryThread`
- `thread.listMessages`
- `saveMessageToMemory`
- `getWorkingMemory`, `updateWorkingMemory`

### Task 2.4 — Implement GET /api/chat

```typescript
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const threadId = searchParams.get('threadId')
  const resourceId = searchParams.get('resourceId')
  // memory.recall() → toAISdkV5Messages() → JSON response
}
```

### Task 2.5 — Write tests for chat route

Unit tests covering:
- POST without threadId falls back to stateless streamText
- POST with threadId/resourceId executes 4-phase memory cycle
- GET returns hydrated messages in UIMessage[] format
- GET with missing params returns empty array
- `saveMessageToMemory` called with correct format: 2 shape

---

## Module 3: Thread Management API

### Task 3.1 — POST /api/threads

Creates a thread via Mastra's memory API. Sets resourceId server-side. Returns `{ threadId, createdAt }`.

### Task 3.2 — GET /api/threads

Lists threads for a resourceId, ordered by `updatedAt` desc. Returns thread metadata (id, title, createdAt, updatedAt, messageCount).

### Task 3.3 — DELETE /api/threads/:threadId

Validates ownership, deletes thread + messages. Returns 403 if resourceId mismatch, 404 if not found.

### Task 3.4 — Write tests for thread routes

Unit tests for all three handlers including 403/404 error cases.

---

## Module 4: Memory Management API

### Task 4.1 — GET /api/memories

Cursor-paginated observations. Filters: `threadId`, `kind`, `q` (text search). Returns `{ items, nextCursor?, totalApprox? }`.

### Task 4.2 — PATCH /api/memories/:id

Versioned edit: creates new version record, archives old one. Returns new version object.

### Task 4.3 — DELETE /api/memories/:id

Soft delete. Memory items remain in DB with `status: 'deleted'` but are excluded from future responses.

### Task 4.4 — POST /api/memory-policy

Accepts `{ useMemory, updateMemory, temporaryChat }`. Persists policy flags to session or localStorage (MVP: localStorage; future: server-side per user).

### Task 4.5 — GET /api/memory-status

Debug endpoint: returns current OM tier, token counts, pending observation count.

### Task 4.6 — Write tests for memory routes

Unit tests for pagination, versioning behavior, soft-delete exclusion, and 403/404 cases.

---

## Module 5: Frontend Integration

### Task 5.1 — Create `hooks/use-thread.ts`

Custom hook that:
- Reads/writes `threadId` and `resourceId` from localStorage
- Generates UUID on first load if absent
- Returns `{ threadId, resourceId, resetThread }`

### Task 5.2 — Hydrate messages on mount

In `app/page.tsx`:
- Call `useThread()` to get `threadId`/`resourceId`
- `useEffect`: fetch `GET /api/chat?threadId=...&resourceId=...` → `setMessages()`
- Pass `threadId` and `resourceId` in the `body` option of `useChat` or in each `sendMessage` call

### Task 5.3 — Create `components/ai-elements/memory-inspector.tsx`

`Sheet` component (right-side drawer) with:
- `Tabs`: "Observations" | "Reflections"
- Observation list: text, kind badge, timestamp, source type icon
- "Refresh" button to reload from `GET /api/memories`
- "Pending" spinner shown when OM is processing

### Task 5.4 — Create `components/ai-elements/memory-badge.tsx`

Small `Badge` + `Tooltip` component. Renders after assistant messages when `message.metadata?.memoryUpdated === true`. Clicking opens the Memory Inspector Sheet.

### Task 5.5 — Wire Memory Inspector into chat header

Add a memory icon button to the chat toolbar in `app/page.tsx` that toggles the `MemoryInspector` Sheet.

---

## Task Decomposition and Dependencies

```
[1.1 Install] → [1.2 Storage] → [1.3 Mastra instance] → [1.4 next.config]
                                           ↓
                              [2.1 Route schema] → [2.2 agent.stream path] → [2.3 tools migration]
                                           ↓                                        ↓
                              [2.4 GET handler]                             [2.5 Route tests]
                                           ↓
                   [3.1 POST threads] → [3.2 GET threads] → [3.3 DELETE threads] → [3.4 Thread tests]
                   [4.1 GET memories] → [4.2 PATCH] → [4.3 DELETE] → [4.4 Policy] → [4.5 Status] → [4.6 Memory tests]
                                           ↓
                              [5.1 use-thread hook] → [5.2 Hydration] → [5.3 Inspector] → [5.4 Badge] → [5.5 Header]
```

---

## Risk Analysis

| Risk | Severity | Mitigation |
|------|----------|-----------|
| `gpt-5.2` provider options incompatible with Mastra Agent execution | N/A | Risk eliminated — AI SDK `streamText` remains the execution engine; Mastra is memory-only |
| OM observation job rate-limiting Gemini API in production | Medium | Monitor token usage; configure `blockAfter` to prevent rate limit spikes; implement exponential backoff |
| LibSQL file lock contention in Next.js dev server (hot reload) | Medium | Use Vercel KV or in-memory flag to skip re-initialization on hot reload; or use single-file LibSQL with WAL mode |
| Thread ID spoofing (client-supplied resourceId) | High | Always use `MASTRA_RESOURCE_ID_KEY` server-side; validate threadId format before any DB call |
| Memory accumulation without cleanup | Low | Observation soft-deletes and reflection compression handle this natively; add retention note to Memory settings UI in future SPEC |
| Mastra server vs embedded Memory confusion | Medium | This SPEC uses Mastra `Memory` class embedded in Next.js directly (not a remote Mastra server); `MastraClient` points to our own API routes, not an external Mastra server |

---

## Environment Variables Required

```bash
# Development (auto-selected by memory-storage.ts)
# No extra vars needed for LibSQL (uses ./mastra.db)

# Production
MASTRA_DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Observer/Reflector model
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key

# Existing
OPENAI_API_KEY=...
LLAMA_CLOUD_PROJECT_ID=...  # optional, for searchDocuments
```

---

## Testing Strategy

Per project hybrid methodology:
- **Module 1-4 (backend)**: DDD approach — characterization tests against existing route behavior, then integration tests for new memory paths
- **Module 5 (frontend)**: TDD approach — write component tests for `MemoryInspector` and `MemoryBadge` before implementation

Minimum coverage target: 85% for new code

Key integration test scenario: Feed enough messages to exceed the 30K token threshold and verify that `memory.recall()` returns observation entries in subsequent requests.

---

## Estimated SPEC ID for sub-tasks

No sub-SPECs required. All modules deliver under SPEC-MEMORY-001.

---

## Reference Documentation

| Resource | URL |
|----------|-----|
| AI SDK Agents: Memory | https://ai-sdk.dev/docs/agents/memory |
| Mastra: Message History | https://mastra.ai/docs/memory/message-history |
| Mastra: Observational Memory | https://mastra.ai/docs/memory/observational-memory |
| Mastra Client SDK: Memory | https://mastra.ai/reference/client-js/memory |
| Mastra: Memory.recall() | https://mastra.ai/reference/memory/recall |
