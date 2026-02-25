# Shaping Notes

## Scope

Build a working chat page with sandboxed bash execution. No auth, no persistence, no multi-user support. Demo-quality.

## Key Decisions

- **`streamText` over `ToolLoopAgent`**: Simpler, sufficient for multi-step tool use with `stopWhen`
- **Module-level singleton sandbox**: Lazy-initialized, persists across requests within same server process
- **`DefaultChatTransport` over `DirectChatTransport`**: Keeps server/client separation, standard HTTP streaming
- **Dark theme by default**: `className="dark"` on root div
- **AI SDK v6 part types**: `dynamic-tool` (not v5's `tool-invocation`), `source-url` (not `source`)

## Context

- AI SDK v6 renamed `maxSteps` → `stopWhen: stepCountIs(N)`
- Tool parts in default `UIMessage` (no generics) arrive as `DynamicToolUIPart` with `type: "dynamic-tool"`
- `ReasoningUIPart` uses `text` property and `state: "streaming" | "done"` (not `reasoning`/`isStreaming`)
- `PromptInput.onSubmit` returns `Promise` → component clears textarea on success
- `useChat` is in `@ai-sdk/react` (not re-exported from `ai`)
