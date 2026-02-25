# AI Bash Agent — Implementation Plan

## Context

Next.js 16 app with 51+ AI element components and all packages installed (`bash-tool`, `just-bash`, `ai` v6, `@ai-sdk/openai`, `@ai-sdk/react`). Goal: chat-based AI agent with sandboxed bash execution, streaming responses, and tool visualization.

## Task 1: Save Spec Documentation

Spec files in `agent-os/specs/2026-02-13-ai-bash-agent/`.

## Task 2: API Route (`app/api/chat/route.ts`)

- `streamText` with `stopWhen: stepCountIs(15)` for multi-step tool use
- Module-level singleton sandbox via lazy `getToolkit()`
- Seeded files: README.md, package.json, src/index.ts, src/utils.ts, src/types.ts, data/sample.json
- `toUIMessageStreamResponse()` for `useChat` + `DefaultChatTransport` compatibility

## Task 3: Chat Page (`app/page.tsx`)

- `useChat` from `@ai-sdk/react` with `DefaultChatTransport` from `ai`
- Message parts renderer handling: `text`, `reasoning`, `dynamic-tool`, `source-url`
- Tool-specific rendering: bash (Terminal), readFile (CodeBlock), writeFile (Badge)
- `ConversationEmptyState` with suggestion pills
- `PromptInput` with status-aware submit button

## Components Reused (no modifications)

Conversation, Message, MessageResponse, Reasoning, Tool, Terminal, CodeBlock, Source, Suggestions, PromptInput, Badge, TooltipProvider.

## Verification

1. `pnpm dev` → open localhost:3000
2. Empty state with suggestions
3. Bash tool shows Terminal output
4. readFile shows CodeBlock with syntax highlighting
5. writeFile shows success Badge
6. Auto-scroll during streaming
7. Submit button shows status transitions
