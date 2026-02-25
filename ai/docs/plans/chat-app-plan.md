# AI Chat App — Feature Spec & Architecture Plan

## Overview

A production-grade chat application built with the **Vercel AI SDK v5/v6**, **AI Elements component library**, and **Next.js 16 App Router**. The app supports:

1. **Streaming UI** — Real-time text + tool call streaming via `useChat` + `streamText`/`ToolLoopAgent`
2. **Thinking Tokens** — Collapsible reasoning display for models that emit thinking/reasoning (Claude, Gemini, DeepSeek)
3. **Human-in-the-Loop** — Tool approval workflows with accept/deny UI before execution
4. **Subagent Support** — Orchestrator-worker pattern with `ToolLoopAgent` + `createAgentUIStreamResponse`

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser (Client)                                                │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  app/page.tsx ("use client")                               │  │
│  │                                                            │  │
│  │  useChat({                                                 │  │
│  │    transport: DefaultChatTransport({ api: '/api/chat' })   │  │
│  │  })                                                        │  │
│  │  ↓                                                         │  │
│  │  messages → UIMessage[] with parts:                        │  │
│  │    ├─ TextUIPart         → MessageResponse (Streamdown)    │  │
│  │    ├─ ReasoningUIPart    → Reasoning (collapsible)         │  │
│  │    ├─ ToolUIPart         → Tool + Terminal/CodeBlock        │  │
│  │    │   ├─ state: input-streaming  → shimmer / partial args │  │
│  │    │   ├─ state: input-available  → full args display      │  │
│  │    │   ├─ state: approval-requested → Confirmation UI      │  │
│  │    │   ├─ state: output-available → Terminal/CodeBlock     │  │
│  │    │   └─ state: output-error     → error display          │  │
│  │    ├─ SourceUIPart       → Sources (collapsible list)      │  │
│  │    └─ FileUIPart         → image/file display              │  │
│  │                                                            │  │
│  │  PromptInput → sendMessage({ text })                       │  │
│  │  Confirmation → addToolApprovalResponse / addToolOutput    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                    │ POST /api/chat                               │
└────────────────────┼─────────────────────────────────────────────┘
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│  Server (API Routes)                                             │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  app/api/chat/route.ts                                     │  │
│  │                                                            │  │
│  │  Option A: streamText (simple)                             │  │
│  │  ─────────────────────────────                             │  │
│  │  streamText({                                              │  │
│  │    model: openai("gpt-4o"),                                │  │
│  │    messages: convertToModelMessages(messages),             │  │
│  │    tools: { ...bashTools, ...ragTools },                   │  │
│  │    maxSteps: 15,                                           │  │
│  │  }) → result.toUIMessageStreamResponse()                   │  │
│  │                                                            │  │
│  │  Option B: ToolLoopAgent (agentic)                         │  │
│  │  ───────────────────────────────────                       │  │
│  │  const agent = new ToolLoopAgent({                         │  │
│  │    model, instructions, tools,                             │  │
│  │    stopWhen: stepCountIs(20),                              │  │
│  │  })                                                        │  │
│  │  → createAgentUIStreamResponse({ agent, uiMessages })      │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Subagents (Orchestrator-Worker)                           │  │
│  │                                                            │  │
│  │  Main Agent                                                │  │
│  │    ├─ bash tool → just-bash (sandbox)                      │  │
│  │    ├─ readFile tool → sandbox FS read                      │  │
│  │    ├─ writeFile tool → sandbox FS write                    │  │
│  │    ├─ webSearch tool → external API (requires HITL)        │  │
│  │    └─ delegateToResearcher tool → spawns sub-agent         │  │
│  │         └─ ResearcherAgent (ToolLoopAgent)                 │  │
│  │              ├─ webSearch tool                              │  │
│  │              └─ fetchUrl tool                               │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 1. Streaming UI

### Server-Side Pattern

Two approaches depending on complexity level:

#### Simple: `streamText` (current just-bash setup)

```typescript
import { streamText, UIMessage, convertToModelMessages } from "ai";
import { openai } from "@ai-sdk/openai";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    messages: await convertToModelMessages(messages),
    tools: { ...bashTools },
    maxSteps: 15,
  });

  return result.toUIMessageStreamResponse();
}
```

#### Agentic: `ToolLoopAgent` + `createAgentUIStreamResponse`

```typescript
import { ToolLoopAgent, createAgentUIStreamResponse, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";

const agent = new ToolLoopAgent({
  model: openai("gpt-4o"),
  instructions: "You are a code analysis agent...",
  tools: { ...bashTools, ...ragTools },
  stopWhen: stepCountIs(20),
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
    sendSources: true,
  });
}
```

### Client-Side Pattern

```typescript
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

const { messages, sendMessage, status, stop } = useChat({
  transport: new DefaultChatTransport({ api: "/api/chat" }),
});
```

### UIMessage Parts Rendering

The AI SDK v5 uses a `parts` array on each message. Each part has a `type`:

| Part Type | Description | Component |
|-----------|-------------|-----------|
| `text` | Text content | `MessageResponse` (Streamdown) |
| `reasoning` | Thinking tokens | `Reasoning` + `ReasoningTrigger` + `ReasoningContent` |
| `tool-{name}` | Tool invocation (typed) | `Tool` + `ToolHeader` + `ToolContent` |
| `source` | Citation source | `Sources` + `Source` |
| `file` | File/image attachment | `Attachment` / inline `<img>` |

### Stream Status States

The `status` from `useChat` can be:
- `"ready"` — idle, awaiting input
- `"submitted"` — request sent, waiting for first chunk
- `"streaming"` — actively receiving chunks
- `"error"` — stream errored

These map to `PromptInputSubmit` status prop and `Loader` visibility.

---

## 2. Thinking Tokens (Reasoning)

### Server: Enable reasoning per provider

#### Anthropic (Claude)
```typescript
streamText({
  model: anthropic("claude-sonnet-4-20250514"),
  providerOptions: {
    anthropic: {
      thinking: { type: "enabled", budgetTokens: 15000 },
    },
  },
  headers: {
    "anthropic-beta": "interleaved-thinking-2025-05-14",
  },
});
```

#### Google (Gemini)
```typescript
streamText({
  model: google("gemini-2.5-flash"),
  providerOptions: {
    google: {
      thinkingConfig: {
        includeThoughts: true,
        thinkingBudget: 8192,
      },
    },
  },
});
```

#### OpenAI (o-series models)
For `o1`, `o3`, etc., reasoning is built-in and returned automatically.

### Client: Rendering reasoning parts

```tsx
{message.parts.map((part, i) => {
  switch (part.type) {
    case "reasoning":
      return (
        <Reasoning
          key={`${message.id}-${i}`}
          isStreaming={
            status === "streaming" &&
            i === message.parts.length - 1 &&
            message.id === messages.at(-1)?.id
          }
        >
          <ReasoningTrigger />
          <ReasoningContent>{part.text}</ReasoningContent>
        </Reasoning>
      );
    case "text":
      return (
        <MessageResponse key={`${message.id}-${i}`}>
          {part.text}
        </MessageResponse>
      );
  }
})}
```

### Reasoning Part Type

```typescript
type ReasoningUIPart = {
  type: "reasoning";
  text: string;
  state?: "streaming" | "done";
  providerMetadata?: Record<string, any>;
};
```

### Existing Component

Our `components/ai-elements/reasoning.tsx` already handles:
- Auto-open when streaming starts
- Auto-close after 1s when streaming ends
- Duration tracking
- Shimmer effect during streaming
- Streamdown markdown rendering with cjk/code/math/mermaid plugins

---

## 3. Human-in-the-Loop (HITL)

### Pattern: Tool Approval Workflow

The AI SDK supports tools that require human approval before execution. The flow:

1. **Server**: Define tool WITHOUT `execute` function (marks it for client-side handling)
2. **Client**: Tool appears with `state: "approval-requested"` in message parts
3. **Client**: User clicks Approve/Deny
4. **Client**: `addToolApprovalResponse({ id, approved })` sends decision back
5. **Server**: Processes approved tool, returns result

### Server: Tools requiring confirmation

```typescript
// Tools that need approval: omit execute
const dangerousTools = {
  deleteFile: tool({
    description: "Delete a file from the filesystem",
    inputSchema: z.object({ path: z.string() }),
    // NO execute — handled on client
  }),
};

// Tools that auto-execute: include execute
const safeTools = {
  bash: bashTool,  // auto-executes
  readFile: readFileTool,  // auto-executes
};
```

### Server: processToolCalls helper

```typescript
import { UIMessage, UIMessageStreamWriter } from "ai";

export async function processToolCalls({ writer, messages }, executeFunctions) {
  const lastMessage = messages[messages.length - 1];
  for (const part of lastMessage.parts) {
    if (part.state === "output-available") {
      if (part.output === APPROVAL.YES) {
        const result = await executeFunctions[toolName](part.input);
        writer.write({
          type: "tool-output-available",
          toolCallId: part.toolCallId,
          output: result,
        });
      }
    }
  }
}
```

### Client: Approval UI with Confirmation component

```tsx
import { Confirmation, ConfirmationActions, ConfirmationAction,
         ConfirmationRequest, ConfirmationTitle } from "@/components/ai-elements/confirmation";

// In message parts rendering:
case "tool-deleteFile":
  return (
    <Confirmation approval={part.approval} state={part.state}>
      <ConfirmationTitle>
        Delete file: {part.input.path}?
      </ConfirmationTitle>
      <ConfirmationRequest>
        <ConfirmationActions>
          <ConfirmationAction
            variant="destructive"
            onClick={() => addToolApprovalResponse({
              id: part.approval.id,
              approved: true,
            })}
          >
            Delete
          </ConfirmationAction>
          <ConfirmationAction
            variant="outline"
            onClick={() => addToolApprovalResponse({
              id: part.approval.id,
              approved: false,
            })}
          >
            Cancel
          </ConfirmationAction>
        </ConfirmationActions>
      </ConfirmationRequest>
    </Confirmation>
  );
```

### Client: Alternative pattern with `addToolOutput`

For tools that need client-side execution (not just approval):

```typescript
const { addToolOutput, sendMessage } = useChat();

// User approves → execute locally → send result back
await addToolOutput({
  toolCallId,
  tool: toolName,
  output: APPROVAL.YES,
});
sendMessage(); // re-trigger server processing
```

### Existing Component

Our `components/ai-elements/confirmation.tsx` provides:
- `Confirmation` — Context wrapper (only renders for approval states)
- `ConfirmationRequest` — Shows only during `approval-requested`
- `ConfirmationAccepted` — Shows when approved
- `ConfirmationRejected` — Shows when denied
- `ConfirmationActions` / `ConfirmationAction` — Approve/Deny buttons

---

## 4. Subagent Support

### Pattern: Orchestrator-Worker with ToolLoopAgent

The AI SDK supports multi-agent architectures through:

1. **ToolLoopAgent as main orchestrator** — loops through LLM + tools until done
2. **Tool-as-agent** — a tool that internally spawns another ToolLoopAgent
3. **Parallel workers** — Promise.all for concurrent sub-tasks

### Architecture: Tool that delegates to a sub-agent

```typescript
import { ToolLoopAgent, tool } from "ai";

// Sub-agent: specialized researcher
const researcherAgent = new ToolLoopAgent({
  model: openai("gpt-4o-mini"),
  instructions: "You are a research assistant. Search and summarize.",
  tools: { webSearch: webSearchTool, fetchUrl: fetchUrlTool },
  stopWhen: stepCountIs(5),
});

// Main agent: orchestrator
const mainAgent = new ToolLoopAgent({
  model: openai("gpt-4o"),
  instructions: "You are a code analysis agent with bash access...",
  tools: {
    ...bashTools,
    delegateResearch: tool({
      description: "Delegate a research task to a specialized sub-agent",
      inputSchema: z.object({
        query: z.string().describe("The research question"),
      }),
      execute: async ({ query }) => {
        const result = await researcherAgent.generate({ prompt: query });
        return { summary: result.text, steps: result.steps.length };
      },
    }),
  },
});
```

### API Route with agent

```typescript
export async function POST(req: Request) {
  const { messages } = await req.json();

  return createAgentUIStreamResponse({
    agent: mainAgent,
    uiMessages: messages,
    sendSources: true,
    onStepFinish: async ({ stepType, text, toolCalls }) => {
      // Log steps for debugging/analytics
      console.log(`Step: ${stepType}`, { toolCalls: toolCalls?.length });
    },
  });
}
```

### Orchestrator-Worker Pattern

```typescript
async function implementFeature(featureRequest: string) {
  // Orchestrator: Plan
  const { object: plan } = await generateObject({
    model: openai("gpt-4o"),
    schema: planSchema,
    prompt: `Plan implementation for: ${featureRequest}`,
  });

  // Workers: Execute in parallel
  const results = await Promise.all(
    plan.tasks.map(task =>
      workerAgent.generate({ prompt: task.description })
    )
  );

  return { plan, results };
}
```

### Streaming sub-agent results to UI

Sub-agents running inside a tool don't automatically stream to the UI. Options:

1. **Blocking**: Sub-agent runs to completion, result returned as tool output (simplest)
2. **Custom streaming**: Use `UIMessageStreamWriter` to manually pipe sub-agent events
3. **Step callbacks**: Use `onStepFinish` on the main agent to track sub-agent progress

---

## 5. Existing Components Inventory

### Already built (in `components/ai-elements/`)

| Component | File | Covers |
|-----------|------|--------|
| `Conversation` | conversation.tsx | Auto-scroll container, empty state |
| `Message` + `MessageResponse` | message.tsx | Message rendering with Streamdown |
| `MessageBranch` system | message.tsx | Branch switching (regenerate alternatives) |
| `Reasoning` | reasoning.tsx | Thinking tokens display, auto-open/close |
| `Tool` | tool.tsx | Tool invocation display, status badges |
| `Terminal` | terminal.tsx | ANSI terminal output for bash |
| `CodeBlock` | code-block.tsx | Syntax-highlighted code display (Shiki) |
| `PromptInput` | prompt-input.tsx | Full input system with file attachments |
| `Confirmation` | confirmation.tsx | HITL approval UI |
| `Sources` | sources.tsx | Citation sources display |
| `Suggestion` | suggestion.tsx | Quick-action pill buttons |
| `Sandbox` | sandbox.tsx | Tabbed sandbox display |
| `Agent` | agent.tsx | Agent info display (name, tools, instructions) |
| `Attachments` | attachments.tsx | File/media attachment system |
| `Shimmer` | shimmer.tsx | Streaming shimmer animation |
| `ChainOfThought` | chain-of-thought.tsx | Step-by-step reasoning |
| `ModelSelector` | model-selector.tsx | LLM model selection dropdown |
| `Plan` | plan.tsx | Multi-step plan display |

### Missing (need to add)

| Component | Purpose | Priority |
|-----------|---------|----------|
| `Loader` | Dot/spinner animation while waiting for first chunk | High |
| Agent status/progress | Show sub-agent activity inline | Medium |

---

## 6. UI Layout

### Main Chat Layout

```
┌─────────────────────────────────────────────────┐
│  Header                                          │
│  ├─ App title / model selector                   │
│  └─ Settings / theme toggle                      │
├─────────────────────────────────────────────────┤
│                                                  │
│  Conversation (auto-scroll)                      │
│  ├─ ConversationEmptyState                       │
│  │   └─ Suggestions (quick-start prompts)        │
│  ├─ Message (user)                               │
│  │   └─ MessageContent (bubble)                  │
│  ├─ Message (assistant)                          │
│  │   ├─ Reasoning (collapsible thinking)         │
│  │   ├─ Tool: bash (Terminal output)             │
│  │   ├─ Tool: webSearch (Sources list)           │
│  │   ├─ Confirmation (HITL approval)             │
│  │   └─ MessageResponse (Streamdown markdown)    │
│  │   └─ MessageToolbar (copy/rate/regenerate)    │
│  └─ Loader (while submitted, pre-stream)         │
│                                                  │
│  ConversationScrollButton                        │
├─────────────────────────────────────────────────┤
│  Suggestions (when empty or after response)      │
├─────────────────────────────────────────────────┤
│  PromptInput                                     │
│  ├─ PromptInputHeader (attachments preview)      │
│  ├─ PromptInputBody                              │
│  │   └─ PromptInputTextarea                      │
│  └─ PromptInputFooter                            │
│      ├─ PromptInputTools (attach, search, mic)   │
│      └─ PromptInputSubmit (send/stop)            │
└─────────────────────────────────────────────────┘
```

### Message Parts Renderer (Core Component)

The heart of the chat UI is a switch over `part.type`:

```tsx
{message.parts.map((part, i) => {
  const key = `${message.id}-${i}`;
  switch (part.type) {
    case "text":
      return <MessageResponse key={key}>{part.text}</MessageResponse>;

    case "reasoning":
      return (
        <Reasoning key={key} isStreaming={isLastPartStreaming(message, i)}>
          <ReasoningTrigger />
          <ReasoningContent>{part.text}</ReasoningContent>
        </Reasoning>
      );

    case "source":
      return <Source key={key} href={part.source.url} title={part.source.title} />;

    // Typed tool parts: tool-bash, tool-readFile, tool-writeFile, etc.
    case "tool-bash":
      return (
        <Tool key={key}>
          <ToolHeader type={part.type} state={part.state} title="Bash" />
          <ToolContent>
            <ToolInput input={part.input} />
            {part.state === "output-available" && (
              <Terminal output={part.output.stdout || part.output.stderr} />
            )}
          </ToolContent>
        </Tool>
      );

    case "tool-deleteFile":
      return (
        <Confirmation key={key} approval={part.approval} state={part.state}>
          <ConfirmationTitle>Delete {part.input.path}?</ConfirmationTitle>
          <ConfirmationRequest>
            <ConfirmationActions>
              <ConfirmationAction onClick={() => approve(part)}>Yes</ConfirmationAction>
              <ConfirmationAction onClick={() => deny(part)}>No</ConfirmationAction>
            </ConfirmationActions>
          </ConfirmationRequest>
        </Confirmation>
      );

    default:
      // Generic tool fallback
      if (part.type.startsWith("tool-")) {
        return (
          <Tool key={key}>
            <ToolHeader type={part.type} state={part.state} />
            <ToolContent>
              <ToolInput input={part.input} />
              <ToolOutput output={part.output} errorText={part.errorText} />
            </ToolContent>
          </Tool>
        );
      }
      return null;
  }
})}
```

---

## 7. API Contracts

### POST /api/chat

**Request:**
```json
{
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "parts": [{ "type": "text", "text": "List files in the project" }]
    }
  ]
}
```

**Response:** UI Message Stream (SSE)

Events include:
- `text` — text content chunks
- `reasoning` — thinking token chunks
- `tool-call` — tool invocation with streaming input
- `tool-output-available` — tool result
- `source` — citation source
- `finish` — stream complete with usage stats

### Chat Status Flow

```
ready → submitted → streaming → ready
                              → error → ready (on retry)
```

---

## 8. Implementation Steps

### Phase 1: Core Chat (Streaming + Tools)
1. Create `app/api/chat/route.ts` with `streamText` + bash tools
2. Build `app/page.tsx` with `useChat` + message parts renderer
3. Wire up `Conversation`, `Message`, `MessageResponse`, `PromptInput`
4. Add `Terminal` rendering for `tool-bash` parts
5. Add `CodeBlock` rendering for `tool-readFile` parts
6. Create `Loader` component for `submitted` state
7. Add `Suggestions` for empty state

### Phase 2: Thinking Tokens
8. Add provider-specific reasoning config (Anthropic/Google/OpenAI)
9. Wire `Reasoning` component to `reasoning` parts
10. Add model selector to switch between providers

### Phase 3: Human-in-the-Loop
11. Define tools without `execute` (client-handled)
12. Wire `Confirmation` component to approval-requested parts
13. Implement `addToolApprovalResponse` / `addToolOutput` flow
14. Add `processToolCalls` server helper for re-execution

### Phase 4: Subagent Support
15. Create `ToolLoopAgent` instances for main + sub-agents
16. Create delegation tool (spawns sub-agent)
17. Switch API route to `createAgentUIStreamResponse`
18. Add agent status display in UI (optional)

### Phase 5: Polish
19. Add `MessageToolbar` with copy/rate/regenerate
20. Add `MessageBranch` for alternative responses
21. Add `Sources` rendering for citation parts
22. Add dark mode theming
23. Add `ConversationDownload` for export

---

## 9. Package Dependencies

### Already installed
| Package | Version | Purpose |
|---------|---------|---------|
| `ai` | ^6.0.86 | Vercel AI SDK core |
| `@ai-sdk/openai` | ^3.0.29 | OpenAI provider |
| `just-bash` | ^2.9.8 | Virtual bash interpreter |
| `bash-tool` | ^1.3.14 | AI SDK tool wrapper |
| `streamdown` | ^2.2.0 | Streaming markdown renderer |
| `use-stick-to-bottom` | ^1.1.3 | Auto-scroll for Conversation |
| `motion` | ^12.34.0 | Animations |
| `sonner` | ^2.0.7 | Toast notifications |

### May need for full feature set
| Package | Purpose |
|---------|---------|
| `@ai-sdk/anthropic` | Claude provider (reasoning/thinking) |
| `@ai-sdk/google` | Gemini provider (thinking config) |
| `@ai-sdk/react` | React hooks (useChat, etc.) — may already be in `ai` |

---

## 10. Key AI SDK v5 API Surface

### Core Functions
- `streamText()` — Stream text with tools, returns `StreamTextResult`
- `generateText()` — Non-streaming text generation
- `generateObject()` — Structured output generation (for orchestrator)
- `convertToModelMessages()` — UIMessage[] → ModelMessage[] (async)
- `tool()` — Define a tool with schema + optional execute

### Agent Classes
- `ToolLoopAgent` — Built-in agent with LLM + tools + loop
- `stepCountIs(n)` — Stop condition: max N steps
- `createAgentUIStreamResponse()` — Stream agent output as HTTP Response

### React Hooks (`@ai-sdk/react`)
- `useChat()` — Main chat hook: messages, sendMessage, status, stop
- `addToolApprovalResponse()` — Send tool approval decision
- `addToolOutput()` — Send tool output from client
- `sendMessage()` — Send a new user message

### Transport
- `DefaultChatTransport` — Configure API endpoint, headers, body, credentials

### UIMessage Types
- `UIMessage` — Message with `parts: UIPart[]`
- `TextUIPart` — `{ type: "text", text: string }`
- `ReasoningUIPart` — `{ type: "reasoning", text: string, state?: "streaming" | "done" }`
- `ToolUIPart` — Typed per tool: `{ type: "tool-{name}", state, input, output, approval }`
- `SourceUIPart` — `{ type: "source", source: { url, title } }`

### Tool Part States
```
input-streaming → input-available → approval-requested → output-available
                                  → (auto-execute)     → output-available
                                                        → output-error
                                                        → output-denied
```

---

## 11. Design Inspiration (from screenshot & cult-ui)

The screenshot shows a chat UI with:
- **Agent Reasoning Process** — collapsible section showing search steps
- **Tool execution badges** — "tool-websearch · Completed" with green checkmark
- **Quick action buttons** — pill-shaped suggestions at bottom
- **Clean card layout** — minimal borders, subtle shadows

From cult-ui:
- **Typewriter effect** — for message streaming (we use Streamdown instead)
- **Sortable list** — for agent task management / plan display
- **AI settings sliders** — temperature, top-p, max tokens controls
- **Dark theme** — neutral-800/900 backgrounds with accent colors

### Our approach
- Use our existing AI Elements which closely match the official Vercel AI Elements
- The `Reasoning` component maps to "Agent Reasoning Process"
- The `Tool` + `getStatusBadge` maps to tool execution badges
- The `Suggestion` component maps to quick action buttons
- The `PromptInput` with `ModelSelector` provides model switching
