# Quadruple Code Review - Agent Memory

## Project Architecture
- Next.js 16 App Router + React 19 + TypeScript strict + Tailwind CSS 4
- AI SDK v6 (`ai@6.0.86`, `@ai-sdk/react@3.0.88`, `@ai-sdk/openai@3.0.29`)
- `bash-tool@1.3.14` / `just-bash@2.9.8` for simulated bash sandbox
- shadcn/ui (New York style, stone base, OKLch colors)

## Key File Locations
- API route: `app/api/chat/route.ts`
- Chat page: `app/page.tsx`
- Prompt input system: `components/ai-elements/prompt-input.tsx` (1387 lines - needs refactoring)
- Prompt box sub-components: `components/ai-elements/prompt-box/`

## Reviewer Reliability Patterns
- **Codex**: Strong on correctness, edge cases, security. Catches state isolation and submit flow issues well.
- **Gemini**: Better on architecture, maintainability, code organization. Sometimes flags false positives on API shape (e.g., claimed `sendMessage` doesn't exist in useChat v6 -- it does). Also claimed `gpt-5.2-thinking` is invalid -- partially correct but model accepts `(string & {})`.
- **Superpowers (via codereview)**: Good at requirements alignment and state management concerns. Similar depth to Codex.
- **Issues flagged by 3+/4 reviewers**: Very high confidence, always validated as real issues.

## False Positives to Watch For
- Gemini v6 API: `sendMessage` IS valid in `@ai-sdk/react@3.0.88` (not `append`)
- Gemini model IDs: Type union includes `(string & {})` so arbitrary strings pass TypeScript. Runtime validity must be checked separately.

## Recurring Patterns in This Codebase
- Shared singleton state in API routes is a common anti-pattern with `just-bash` (P0 in first review)
- PromptInput dual-mode (provider vs local) creates subtle correctness risks around form.reset() timing
- Voice recorder UI is purely visual - no MediaRecorder implementation exists
- Tool popover UI options do not match backend capabilities
- Shiki BundledLanguage: No "text"/"plaintext" - "shellscript" is the project's chosen fallback
- IDOR risk: No auth layer exists. All APIs trust client-provided resourceId/threadId
- Prompt injection via memory context: Historical messages injected verbatim into system prompt
- onFinish fire-and-forget: saveMessages not awaited, can be dropped in serverless
- Hydration useEffect: Stale closure + React Strict Mode double-fire risk in page.tsx
- MemoryBadge unreachable: metadata.memoryUpdated never set by any producer

## Gemini CLI Status
- Gemini CLI (`gemini --approval-mode plan -p`) has failed in 2 consecutive sessions (exit code 1, no output)
- Consider switching to Gemini via mcp__pal__codereview (Superpowers) which uses Gemini 2.5 Pro successfully

## AI SDK v6 API Shape (Verified)
- `convertToModelMessages()` is async - must await
- `stopWhen: stepCountIs(N)` replaces `maxSteps`
- Tool parts: `type: "dynamic-tool"` with flat `toolName`, `state`, `input`, `output`
- Reasoning: `type: "reasoning"` with `text` and `state: "streaming" | "done"`
- Sources: `type: "source-url"` with flat `url`, `title`
- `useChat` from `@ai-sdk/react`, `DefaultChatTransport` from `ai`
- `useChat` returns `sendMessage` (NOT `append` -- that was v5)

## OpenAI Model IDs (from @ai-sdk/openai@3.0.29)
- Valid gpt-5.x: `gpt-5`, `gpt-5-mini`, `gpt-5-nano`, `gpt-5.1`, `gpt-5.2`, `gpt-5.2-pro`
- NO `gpt-5.2-thinking` in type union (but `(string & {})` allows it)
- Reasoning models: `o1`, `o3-mini`, `o3`, `o4-mini`
