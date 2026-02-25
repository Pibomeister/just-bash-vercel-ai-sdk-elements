# Reference Implementations

## `app/prompt-box-demo/page.tsx`

Demonstrates PromptInput composition with:
- `PromptInputProvider` for global state
- `PromptBoxContextProvider` for extended features
- Attachment tray, voice recorder, paste handler
- Tool toggles (search, write, think)
- Custom send button via `PromptBoxSendButton`

Key pattern: `TooltipProvider` wraps `PromptInputProvider` wraps `PromptBoxContextProvider`.

## AI SDK v6 API

- `streamText()` returns result with `.toUIMessageStreamResponse()`
- `convertToModelMessages()` is async
- `useChat()` from `@ai-sdk/react` returns `{ messages, sendMessage, status, stop }`
- `DefaultChatTransport` from `ai` connects to API endpoint
- `stepCountIs(N)` replaces deprecated `maxSteps`

## bash-tool API

- `createBashTool({ files: Record<string, string> })` returns `Promise<BashToolkit>`
- `BashToolkit.tools` contains `{ bash, readFile, writeFile }`
- bash result: `{ stdout, stderr, exitCode }`
- readFile result: `string`
- writeFile result: `{ success: boolean }`
