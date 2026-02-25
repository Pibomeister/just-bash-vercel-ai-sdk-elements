# manager-ddd Memory

## Project: ai-just-bash-rag

### Key Architecture
- Next.js 16 App Router, React 19, TypeScript strict, Vitest 4
- Zod v4 (^4.3.6) — NOT v3. Mastra packages require careful peer dependency handling.
- Test helpers: `createJsonRequest` in `test/helpers/mock-request.ts`
- Mock pattern: vi.mock at top of test file (before imports) for hoisting
- Pre-existing failing test: `app/api/chat/route.test.ts:74` — checks `tools: { bash: {} }` but wrapBashWithCitations wraps bash with execute. Do NOT fix this; it pre-dates the DDD work.

### Mastra Integration (v1.5.0)
- `Memory` from `@mastra/memory` — NOT `@mastra/core`
- `LibSQLStore` from `@mastra/libsql` — requires `{ id: string, url: string }` config
- `PostgresStore` from `@mastra/pg` — requires `{ id: string, connectionString: string }`
- `MastraDBMessage.content` requires `{ format: 2, parts: [...] }` shape
- `memory.recall()` returns `{ messages: MastraDBMessage[] }` (not array directly)
- `memory.saveMessages({ messages })` — takes array of MastraDBMessage
- `memory.listThreads({ filter: { resourceId }, perPage, page })` — for thread listing
- HMR guard pattern: `const g = globalThis as typeof globalThis & { __field?: T }` for Next.js dev
- `google('gemini-2.5-flash')` from `@ai-sdk/google` for Observer/Reflector model
- `serverExternalPackages` in next.config.ts must include all `@mastra/*` packages

### DDD Cycle Applied
- ANALYZE: Read existing route.ts (336 lines) + route.test.ts (13 tests)
- PRESERVE: Pre-existing 440 tests → all must remain passing
- IMPROVE: Added memory path without touching stateless fallback byte-for-byte
- Result: 481 passing tests, 0 new failures, lint clean, typecheck clean
