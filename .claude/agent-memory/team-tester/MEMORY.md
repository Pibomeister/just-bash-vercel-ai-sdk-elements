# Team Tester Memory

## Project Test Setup
- Framework: Vitest v4 with `globals: true` (describe/it/expect/vi available without imports)
- Config: `/vitest.config.ts` with node environment (jsdom for hooks tests)
- Setup file: `/test/setup.ts` calls `vi.restoreAllMocks()` in afterEach
- Coverage: v8 provider, 85% thresholds for lines/functions/branches/statements
- Coverage includes: `lib/**`, `hooks/**`, `app/api/**`, `workflows/**`
- Run tests: `pnpm vitest run <path>` or `pnpm test`

## Code Style for Tests
- Biome config: single quotes, semicolons as needed (no trailing semis), tabs for indentation
- Follow same formatting as source files
- Test files live alongside source: `lib/foo.test.ts` next to `lib/foo.ts`

## Hook Testing Patterns
- `environmentMatchGlobs` in vitest.config.ts may not activate reliably in Vitest 4. Always add `// @vitest-environment jsdom` comment at top of hook/component test files.
- Context hooks (e.g., `useDocuments`): wrap in provider via `renderHook({ wrapper })`
- `window.matchMedia` mock: use `Object.defineProperty(window, 'matchMedia', ...)`
- Always `await waitFor(...)` to let async effects settle before test ends (avoids act warnings)
- Mock `globalThis.fetch` for API-calling hooks
- Test fixtures available: `test/helpers/fixtures.ts` (e.g., `createDocumentMetadata()`)

## Mocking node:fs/promises
- `vi.mock('node:fs/promises')` must come before imports (Vitest hoists)
- Import then cast: `import * as fs from 'node:fs/promises'`; `vi.mocked(fs.readFile).mockResolvedValue(...)`
- `readdir` return needs cast: `as unknown as Awaited<ReturnType<typeof fs.readdir>>`
- `readFile` overloads (string vs Buffer) need `as unknown as Buffer` casts for mock chaining
- When verifying JSON written via mocked writeFile, prefer `expect.stringContaining()` over
  parsing mock calls -- avoids issues with call ordering and overload type ambiguities

## API Route Testing Patterns
- Mock module: `vi.mock('@/lib/document-storage')` before imports (hoisted)
- Import mocked fn: `import { listDocuments } from '@/lib/document-storage'`
- Next.js 16 params: `{ params: Promise.resolve({ documentId: 'x' }) }`
- Helper: `function withParams(id: string) { return { params: Promise.resolve({ documentId: id }) } }`
- Binary responses: verify headers + `new Uint8Array(await res.arrayBuffer())`

## Mock Call Count Pitfall (vi.mock + restoreAllMocks)
- `vi.restoreAllMocks()` in afterEach does NOT clear call counts for auto-mocked modules (`vi.mock()`)
- Call counts accumulate across tests in the same file
- Fix: use `vi.mocked(fn).mockClear()` at the start of tests that assert `toHaveBeenCalledOnce()`
- Best fix: add `vi.clearAllMocks()` at the top of `beforeEach` when using `vi.mock()` + inspecting `.mock.calls`
- Alternative: avoid exact call count assertions when other tests in the same describe exercise the same mock

## Mocking Constructable Classes (vi.fn with `new`)
- Arrow functions CANNOT be used as constructors (`new`). Vitest warns: "did not use 'function' or 'class'"
- Use `vi.fn(function() { return { ... } })` with a regular function expression
- For shared mock state across tests, hoist a `const mockMethod = vi.fn()` above `vi.mock()` -- Vitest hoists `vi.mock` calls so the const must be declared first
- Dynamic imports inside `'use step'`/`'use workflow'` functions are intercepted by `vi.mock()` hoisting normally

## Lessons Learned
- `buildTree()` in parse-file-tree.ts always creates nested folder structure from path segments -- prepending a prefix like "src" to flat filenames creates a "src" folder node, not flat entries with "src/" prefix in path
- `ls -l` output parsing extracts flat names only (no trailing `/`), so directory entries from `drwx...` permissions are treated as `file` type by the tree builder since it has no directory indicator
