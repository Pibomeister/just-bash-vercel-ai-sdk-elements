# SPEC-MEMORY-001 Acceptance Criteria

## Quality Gates

- All new code passes Biome linting and formatting (`pnpm lint`)
- Minimum 85% test coverage for Modules 1-4 (backend)
- TypeScript strict mode — zero `any` types in new code
- No `perPage: false` in agent context loading paths
- No Claude 4.5 models used as Observer/Reflector
- `MASTRA_RESOURCE_ID_KEY` used server-side for all ownership assignments
- `serverExternalPackages` includes all `@mastra/*` packages in `next.config.ts`

---

## Module 1: Mastra OM Backend Setup

### Scenario 1.1 — Centralized instance at module scope

**Given** the Next.js server starts
**When** two concurrent requests hit `/api/chat`
**Then** both requests share the same Mastra and storage instance (no duplicate initializations, no connection pool errors)

### Scenario 1.2 — Storage selection by environment

**Given** `NODE_ENV=development`
**When** `lib/memory-storage.ts` is imported
**Then** a LibSQL instance connected to `./mastra.db` is returned

**Given** `NODE_ENV=production` and `MASTRA_DATABASE_URL` is set
**When** `lib/memory-storage.ts` is imported
**Then** a PostgreSQL instance connected to `MASTRA_DATABASE_URL` is returned

### Scenario 1.3 — Next.js config

**Given** the production Next.js build runs (`pnpm build`)
**When** the build completes
**Then** no bundling errors for `@mastra/*` packages appear in the build output

---

## Module 2: Chat Route Integration

### Scenario 2.1 — Backward-compatible stateless fallback

**Given** a POST request to `/api/chat` without `threadId`
**When** the handler processes the request
**Then** the response streams via the existing `streamText` path
**And** no memory read or write operations occur
**And** the response format is identical to pre-SPEC behavior

### Scenario 2.2 — Memory-enabled chat stream

**Given** a POST request to `/api/chat` with valid `threadId` and `resourceId`
**When** the handler processes the request
**Then** working memory and recent messages are fetched from Mastra before calling `streamText`
**And** the memory context is injected as a section in the system prompt
**And** `streamText` is called with the existing model (`gpt-5.2`) and all existing tools
**And** the response streams to the client with reasoning tokens
**And** after the response completes, `saveMessageToMemory` is called with `format: 2` for both user and assistant messages

### Scenario 2.3 — History hydration

**Given** a GET request to `/api/chat?threadId=<id>&resourceId=<id>` for an existing thread
**When** the handler processes the request
**Then** a `UIMessage[]` array matching the stored conversation history is returned as JSON

**Given** a GET request to `/api/chat?threadId=<unknown>&resourceId=<id>`
**When** the thread does not exist
**Then** an empty array `[]` is returned with HTTP 200

### Scenario 2.4 — All tools preserved

**Given** a POST request to `/api/chat` with threadId and a user message asking to run a bash command
**When** `streamText` executes
**Then** the `bash` tool is available and executed (tools are unchanged from pre-SPEC)
**And** the citation wrapping (`__bashCitations`) is present in tool results
**And** the `searchDocuments` tool is available when `LLAMA_CLOUD_PROJECT_ID` is set

### Scenario 2.6 — Message persistence format

**Given** a completed chat turn with threadId
**When** `saveMessageToMemory` is called in the `onFinish` callback
**Then** both user and assistant messages are saved with `format: 2`
**And** each message has a unique `id` generated via `nanoid()`
**And** the call is non-blocking (does not delay the stream response to the client)

### Scenario 2.5 — Provider options pass-through

**Given** a POST request to `/api/chat` with threadId
**When** the agent calls the main model (gpt-5.2)
**Then** `reasoningEffort: 'xhigh'` and `reasoningSummary: 'detailed'` are applied
**And** reasoning tokens appear in the streamed response parts

---

## Module 3: Thread Management API

### Scenario 3.1 — Thread creation

**Given** a POST request to `/api/threads` with `resourceId: "user-abc"`
**When** the handler processes the request
**Then** a new thread is created in the database
**And** the response contains `{ threadId: string, createdAt: string }`
**And** the `threadId` is a valid UUID

### Scenario 3.2 — Thread listing

**Given** a user with `resourceId: "user-abc"` has 3 threads
**When** GET `/api/threads?resourceId=user-abc` is called
**Then** the response contains exactly 3 thread objects ordered by `updatedAt` descending
**And** each item has `{ threadId, createdAt, updatedAt, messageCount }`

### Scenario 3.3 — Thread deletion with ownership validation

**Given** thread `thread-123` is owned by `resourceId: "user-abc"`
**When** DELETE `/api/threads/thread-123?resourceId=user-xyz` is called with a different resourceId
**Then** the response status is 403

**Given** thread `thread-123` is owned by `resourceId: "user-abc"`
**When** DELETE `/api/threads/thread-123?resourceId=user-abc` is called
**Then** the thread and all its messages are deleted
**And** the response is `{ success: true }` with HTTP 200

**Given** no thread exists with id `thread-nonexistent`
**When** DELETE `/api/threads/thread-nonexistent?resourceId=user-abc` is called
**Then** the response status is 404

---

## Module 4: Memory Management API

### Scenario 4.1 — Memory listing with pagination

**Given** a thread with 120 observations
**When** GET `/api/memories?threadId=<id>&resourceId=<id>&limit=50` is called
**Then** the response contains `{ items: [50 observations], nextCursor: { createdAt, id }, totalApprox: 120 }`

**When** GET `/api/memories?threadId=<id>&resourceId=<id>&limit=50&cursor=<nextCursor>` is called
**Then** the response contains the next page of observations

### Scenario 4.2 — Memory listing excludes deleted items

**Given** a thread has 10 observations, 2 of which have `status: 'deleted'`
**When** GET `/api/memories?threadId=<id>&resourceId=<id>` is called
**Then** the response contains 8 items (deleted items excluded)

### Scenario 4.3 — Versioned memory edit

**Given** an observation `obs-1` with version 1 and text "User prefers dark mode"
**When** PATCH `/api/memories/obs-1` is called with `{ text: "User strongly prefers dark mode" }`
**Then** a new observation is created with version 2 and the new text
**And** the original observation `obs-1` has its status set to `'archived'`
**And** the response contains the new version object

### Scenario 4.4 — Memory soft delete

**Given** an observation `obs-2` with `status: 'active'`
**When** DELETE `/api/memories/obs-2` is called
**Then** `obs-2` has `status: 'deleted'` in the database
**And** `obs-2` does NOT appear in subsequent GET `/api/memories` responses

### Scenario 4.5 — Temporary chat mode

**Given** a POST to `/api/memory-policy` with `{ temporaryChat: true }`
**When** a subsequent POST to `/api/chat` with threadId is made
**Then** no memory is loaded into the agent context
**And** no new observations are triggered after the response

---

## Module 5: Frontend Integration

### Scenario 5.1 — Thread ID persistence

**Given** the chat page is loaded for the first time
**When** `use-thread.ts` initializes
**Then** a UUID `threadId` is generated and stored in `localStorage.mastra_thread_id`

**Given** the user refreshes the page
**When** `use-thread.ts` initializes again
**Then** the same `threadId` is read from `localStorage` (not regenerated)

### Scenario 5.2 — Message hydration on mount

**Given** an existing thread with 5 messages
**When** the chat page mounts
**Then** `GET /api/chat?threadId=...&resourceId=...` is called
**And** the returned messages are passed to `setMessages()`
**And** the user sees their previous conversation history

**Given** a fresh thread with no messages
**When** the chat page mounts
**Then** the empty state is displayed (no error)

### Scenario 5.3 — Memory Inspector content

**Given** a thread with observations
**When** the user opens the Memory Inspector Sheet
**Then** the "Observations" tab shows all active observations with text, kind badge, and timestamp
**And** the "Reflections" tab shows consolidated reflections if any exist

**Given** observations are being generated (OM is processing in the background)
**When** the Memory Inspector is open
**Then** a "Pending" indicator is shown

### Scenario 5.4 — Inline memory badge

**Given** an assistant message has `metadata.memoryUpdated = true`
**When** the message renders in the chat transcript
**Then** a "Memory updated" badge appears below the message content
**And** clicking the badge opens the Memory Inspector Sheet

---

## Edge Cases

### Memory under concurrent requests

**Given** two simultaneous POST `/api/chat` requests for the same `threadId`
**When** both complete successfully
**Then** both message sets are persisted without data loss (Mastra handles thread-level locking)

### OM observation failure handling

**Given** the Gemini API returns an error during observation
**When** the error occurs
**Then** the user's chat response is NOT affected (error is swallowed asynchronously)
**And** the raw messages remain in storage and can be processed in a future observation cycle

### Missing environment variable

**Given** `GOOGLE_GENERATIVE_AI_API_KEY` is not set
**When** the Observer agent is triggered
**Then** the application logs an error and the chat continues without observation updates (graceful degradation)

---

## Performance Criteria

- POST `/api/chat` (first response chunk) latency: no regression from pre-SPEC baseline (memory loading adds < 100ms)
- Memory Inspector initial load: < 500ms for threads with up to 200 observations
- Thread listing: < 200ms for up to 50 threads
