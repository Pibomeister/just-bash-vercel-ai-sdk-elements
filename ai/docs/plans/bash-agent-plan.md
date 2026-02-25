# AI Bash Agent — Feature Spec

## Overview

A chat-based AI agent powered by OpenAI GPT that can execute bash commands in a sandboxed virtual filesystem. Built on Vercel's `just-bash` (in-memory bash interpreter) and `bash-tool` (AI SDK tool wrapper), integrated into a Next.js 16 app with streaming responses.

## Architecture

```
┌──────────────────────────────────────────────────┐
│  Browser (Client)                                │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │  app/page.tsx (Chat UI)                  │    │
│  │  ├─ useChat() hook from AI SDK           │    │
│  │  ├─ Message rendering                    │    │
│  │  │   ├─ Text → MessageResponse           │    │
│  │  │   └─ Tool calls → ToolResult renderer │    │
│  │  │       ├─ bash → Terminal component    │    │
│  │  │       ├─ readFile → CodeBlock         │    │
│  │  │       └─ writeFile → Badge            │    │
│  │  └─ PromptInput (chat input bar)         │    │
│  └──────────────────────────────────────────┘    │
│                    │ POST /api/chat               │
└────────────────────┼─────────────────────────────┘
                     ▼
┌──────────────────────────────────────────────────┐
│  Server (API Route)                              │
│                                                  │
│  app/api/chat/route.ts                           │
│  ├─ createBashTool() → { bash, readFile,         │
│  │                        writeFile }            │
│  ├─ [future: RAG tools spread here]              │
│  └─ streamText({                                 │
│       model: openai("gpt-4o"),                   │
│       tools: { ...bashTools, ...ragTools },      │
│       maxSteps: 15                               │
│     })                                           │
│                    │                             │
│                    ▼                             │
│  ┌──────────────────────────────────────────┐   │
│  │  just-bash (Virtual Bash Environment)    │   │
│  │  ├─ In-memory filesystem                 │   │
│  │  ├─ Supports: pipes, redirects, loops    │   │
│  │  ├─ Built-in: cat, grep, ls, echo, etc.  │   │
│  │  └─ No real OS access (sandboxed)        │   │
│  └──────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

## API Contracts

### POST /api/chat

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "List all files in the project" }
  ]
}
```

**Response:** AI SDK Data Stream (streaming)

The response uses AI SDK's `toDataStreamResponse()` format which streams:
- Text chunks (assistant message content)
- Tool call invocations (bash commands, file operations)
- Tool results (stdout, stderr, file contents)

### Tools Available to the Agent

| Tool | Input | Output | Description |
|------|-------|--------|-------------|
| `bash` | `{ command: string }` | `{ stdout, stderr, exitCode }` | Execute bash command |
| `readFile` | `{ path: string }` | `{ content: string }` | Read file from sandbox |
| `writeFile` | `{ path, content }` | `{ success: boolean }` | Write file to sandbox |

## Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `just-bash` | latest | In-memory virtual bash interpreter |
| `bash-tool` | latest | AI SDK-compatible tool wrapper |
| `@ai-sdk/openai` | latest | OpenAI provider for AI SDK |
| `ai` | ^6.0.86 | Vercel AI SDK (already installed) |

## Existing Components Reused

- `Terminal` — ANSI-aware terminal output display
- `Tool`, `ToolHeader`, `ToolContent`, `ToolInput`, `ToolOutput` — Tool invocation display
- `Message`, `MessageContent`, `MessageResponse` — Chat message rendering with Streamdown
- `PromptInput`, `PromptInputTextarea`, `PromptInputSubmit`, `PromptInputFooter` — Chat input
- `ScrollArea` — Scrollable message container
- `Button`, `Card` — UI primitives

## Seeded Virtual Filesystem

The sandbox starts with example files so the agent has something to explore:

```
/home/user/
├── README.md          # Project description
├── package.json       # Node.js manifest
├── src/
│   ├── index.ts       # Entry point
│   ├── utils.ts       # Utility functions
│   └── types.ts       # TypeScript types
└── data/
    └── sample.json    # Sample data file
```

## Future: RAG Integration

The tools pattern is composable. To add RAG:

1. Create a retrieval tool (e.g., using vector DB or embeddings)
2. Spread it into the tools object alongside bash tools
3. Update the system prompt to inform the agent about retrieval capabilities
4. No UI changes needed — tool results already render generically

```typescript
// Future addition in app/api/chat/route.ts
const ragTools = { retrieve: createRetrievalTool({...}) };
streamText({ tools: { ...bashTools, ...ragTools } });
```
