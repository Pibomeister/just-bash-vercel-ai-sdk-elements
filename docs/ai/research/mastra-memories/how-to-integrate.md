# Mastra's Observational Memory meets the Vercel AI SDK

**Mastra's Observational Memory (OM) is a text-based, append-only compression system that replaces raw conversation history with dense observation logs, achieving 94.87% on the LongMemEval benchmark — without a vector database.** Introduced in `@mastra/memory@1.1.0` (February 2026), OM uses two background agents — an Observer and a Reflector — to progressively compress conversations into a stable, prompt-cacheable context prefix that enables 4–10× cost reduction. Integrating it with an existing Next.js app using Vercel's AI SDK is straightforward because Mastra is built directly on top of the AI SDK's model layer. The bridge package `@mastra/ai-sdk` converts Mastra's streams into AI SDK–compatible formats, meaning your frontend continues using `useChat()` unchanged. This report covers the architecture, integration patterns, user-facing memory management, and production best practices.

## How Observational Memory actually works

OM manages the agent's context window through **three progressively compressed tiers**. Tier 1 is raw message history — the most recent, uncompressed conversation sitting at the end of the context window. When these messages exceed a configurable token threshold (default: **30,000 tokens**), the **Observer agent** activates, converting raw messages into Tier 2: dense, structured observation notes placed at the beginning of the context. The Observer produces dated, prioritized event logs using emoji-based priority levels (🔴 high, 🟡 medium, 🟢 low) and a three-date temporal anchoring model — observation date, referenced date, and relative date offset. When observations themselves exceed their threshold (default: **40,000 tokens**), the **Reflector agent** activates to produce Tier 3: a restructured, condensed version that combines related items, finds patterns, and drops superseded entries. Critically, this is reorganization, not summarization — the event-log structure persists.

The resulting context window layout is: `[System Prompt] → [Observations/Reflections] → [Recent Messages]`. Because the observation prefix is stable and append-only, it achieves consistent prompt cache hits across turns. Cache invalidation only occurs during reflection, which is infrequent. The compression ratio is **3–6× for text-only content and 5–40× for tool-call-heavy workloads**.

**Async buffering** (enabled by default) prevents the Observer from blocking conversations. Rather than waiting until the full threshold is hit, background Observer calls run at regular intervals (every ~6,000 tokens by default). Each call produces a chunk of observations stored in a buffer. When the threshold is reached, buffered chunks activate instantly. A safety threshold (`blockAfter: 1.2×`) forces synchronous observation as a fallback if the agent outpaces the background processing.

OM requires no vector database or embedding model — a major architectural simplification over RAG-based approaches. It supports **PostgreSQL** (`@mastra/pg`), **LibSQL** (`@mastra/libsql`), and **MongoDB** (`@mastra/mongodb`) as storage backends. The default Observer/Reflector model is `google/gemini-2.5-flash`, chosen for its 1M token context window that gives the Reflector headroom. Claude 4.5 models are explicitly not recommended for Observer/Reflector roles.

## Two integration paths for existing AI SDK apps

Since Mastra is built on top of the Vercel AI SDK (using its model providers like `openai()` and `anthropic()` directly), integration follows one of two patterns depending on how your existing app is structured.

### The full Mastra Agent approach (recommended)

This approach replaces your `streamText`/`generateText` calls with a Mastra `Agent` that has memory attached natively. Install the required packages:

```bash
npm install @mastra/core @mastra/memory @mastra/libsql @mastra/ai-sdk ai @ai-sdk/react @ai-sdk/openai
```

Define your agent with OM enabled:

```typescript
// src/mastra/agents/index.ts
import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';

const memory = new Memory({
  storage: new LibSQLStore({ url: 'file:./mastra.db' }),
  options: {
    observationalMemory: {
      model: 'google/gemini-2.5-flash',
      scope: 'thread',
      observation: { messageTokens: 30_000 },
      reflection: { observationTokens: 40_000 },
    },
  },
});

export const chatAgent = new Agent({
  name: 'chatAgent',
  instructions: 'You are a helpful assistant with long-term memory.',
  model: openai('gpt-4o'),
  memory,
});
```

Register it with Mastra and create your API route:

```typescript
// app/api/chat/route.ts
import { mastra } from '@/src/mastra';
import { toAISdkFormat } from '@mastra/ai-sdk';
import { convertMessages } from '@mastra/core/agent';
import { createUIMessageStreamResponse } from 'ai';
import { NextResponse } from 'next/server';

const agent = mastra.getAgent('chatAgent');

export async function POST(req: Request) {
  const { messages } = await req.json();
  const stream = await agent.stream(messages, {
    memory: {
      thread: 'user-thread-123', // conversation ID
      resource: 'user-123', // user/tenant ID
    },
  });
  return createUIMessageStreamResponse({
    stream: toAISdkFormat(stream, { from: 'agent' }),
  });
}

export async function GET() {
  const mem = await agent.getMemory();
  const response = await mem?.query({
    threadId: 'user-thread-123',
    resourceId: 'user-123',
  });
  const uiMessages = convertMessages(response?.uiMessages ?? []).to('AIV5.UI');
  return NextResponse.json(uiMessages);
}
```

Your frontend uses standard `useChat()` with no Mastra-specific code:

```typescript
// app/chat/page.tsx
"use client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect } from "react";

export default function Chat() {
  const { messages, setMessages, sendMessage, status, input, setInput } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  useEffect(() => {
    fetch("/api/chat").then(r => r.json()).then(setMessages);
  }, [setMessages]);

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>
          {m.parts?.map((part, i) =>
            part.type === "text" ? <p key={i}>{part.text}</p> : null
          )}
        </div>
      ))}
      <form onSubmit={e => { e.preventDefault(); sendMessage({ text: input }); setInput(""); }}>
        <input value={input} onChange={e => setInput(e.target.value)} />
      </form>
    </div>
  );
}
```

Add `serverExternalPackages: ["@mastra/*"]` to your `next.config.ts` to avoid bundling issues.

### The `withMastra()` wrapper for existing AI SDK code

If you already have `streamText`/`generateText` calls and don't want to refactor to Mastra's Agent class, `withMastra()` wraps any AI SDK model with memory capabilities:

```typescript
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { withMastra } from '@mastra/ai-sdk';
import { LibSQLStore } from '@mastra/libsql';

const storage = new LibSQLStore({ id: 'my-app', url: 'file:./data.db' });
await storage.init();
const memoryStorage = await storage.getStore('memory');

const model = withMastra(openai('gpt-4o'), {
  memory: {
    storage: memoryStorage!,
    threadId: 'user-thread-123',
    resourceId: 'user-123',
    lastMessages: 10,
  },
});

const { text } = await generateText({
  model,
  prompt: 'What did we talk about earlier?',
});
```

Under the hood, `withMastra()` uses the AI SDK's `wrapLanguageModel` middleware pattern — it intercepts calls via `transformParams` to load historical messages before the LLM call and persists new messages afterward. Input and output processors can also be attached for guard rails, logging, or PII detection.

## Giving users visibility into their memories

Mastra provides a rich API surface for memory management that maps directly to user-facing features. The `Memory` class exposes methods for full CRUD operations on threads and messages, and when using Mastra's server (`mastra dev` or server adapters), REST endpoints are automatically registered.

**Key programmatic methods** for building memory UIs:

```typescript
const memory = await agent.getMemory();

// List all conversations for a user
const threads = await memory.getThreadsByResourceId({
  resourceId: 'user-123',
  orderBy: 'updatedAt',
  sortDirection: 'DESC',
});

// Get messages in a thread (paginated)
const { messages } = await memory.recall({
  threadId: 'thread-456',
  perPage: 50,
  page: 0,
  orderBy: { field: 'createdAt', direction: 'ASC' },
});

// Delete specific messages
await memory.deleteMessages('thread-456', ['msg-1', 'msg-2']);

// Read/update working memory (user preferences, profile data)
await memory.updateWorkingMemory({
  threadId: 'thread-456',
  resourceId: 'user-123',
  workingMemory:
    '# User Profile\n- **Name**: Alice\n- **Preference**: Dark mode',
});
```

**Automatic REST endpoints** (available when running Mastra's server) include `GET /api/memory/threads` for listing threads, `GET /api/memory/threads/:threadId/messages` for paginated message retrieval, `DELETE /api/memory/threads/:threadId` for thread deletion, and `POST /api/memory/threads/:threadId/clone` for thread cloning. The **Client SDK** (`@mastra/client-js`) wraps these endpoints with typed methods like `getMemoryThreads()`, `thread.listMessages()`, `thread.delete()`, and `thread.deleteMessages()`.

For Observational Memory specifically, Mastra Studio provides real-time visualization of OM status: token usage, active model, current observations, and reflection markers inline in the chat timeline. To build custom UIs, query the thread's messages and observations through `memory.recall()` and display the structured observation logs (which include priority emojis and timestamps) alongside the conversation.

A practical pattern for a "Memory Inspector" component involves creating a dedicated API route that calls `memory.recall()` with `perPage: false` to fetch the complete thread state, then rendering observations as collapsible sections with their priority levels and dates. Working memory (if enabled alongside OM) can be displayed and edited through the `getWorkingMemory` and `updateWorkingMemory` endpoints.

## Critical dos and don'ts

**Thread and resource ID management** is the most consequential decision. The `resourceId` represents a user or tenant, while `threadId` is a globally unique conversation identifier. Each thread has an **immutable owner** set at creation — Mastra returns 403 errors when users attempt to access threads they don't own. Never let client-supplied `resourceId` values bypass server-side validation. Use Mastra's reserved context keys (`MASTRA_RESOURCE_ID_KEY`, `MASTRA_THREAD_ID_KEY`) set in auth middleware, which override client-provided values to prevent spoofing:

```typescript
import { MASTRA_RESOURCE_ID_KEY } from '@mastra/core/request-context';
// In your auth middleware:
requestContext.set(MASTRA_RESOURCE_ID_KEY, authenticatedUser.id);
```

**Do not use Claude 4.5 models** as the Observer or Reflector — they don't work well in these roles. Stick with `google/gemini-2.5-flash` (default) or tested alternatives like `deepseek/deepseek-reasoner`. **Do not start with resource-scoped OM** — it's experimental and processes unobserved messages across all threads simultaneously, which can be slow for users with many existing conversations. Start with thread scope and migrate carefully.

**Always configure `TokenLimiter`** as the last processor in any chain if you're combining OM with other memory processors. Placing it earlier means subsequent processors can re-inflate the token count. **Do not use `perPage: false`** in `memory.recall()` for agent context loading — reserve it for UI display only, as it fetches all messages regardless of configured limits.

**Avoid sharing database connections carelessly.** Use a single, centralized storage instance shared across all agents rather than creating per-agent connections, which leads to connection pool exhaustion in production. For Next.js specifically, instantiate your Mastra instance at module scope (not inside request handlers) to avoid reinitializing on every request.

A subtle anti-pattern is **over-relying on both OM and semantic recall simultaneously**. OM is designed to replace RAG for most long-conversation use cases. Enabling both adds infrastructure complexity (vector DB + embedding model) with diminishing returns. OM alone scores 84.23% with GPT-4o versus semantic recall's 80.05% — and without any vector infrastructure.

## Production architecture and deployment patterns

The recommended architecture for a Next.js + AI SDK + Mastra Memory stack follows a clear separation of concerns. The **frontend layer** uses standard `useChat()` from `@ai-sdk/react`, communicating with Next.js API routes. The **API layer** (Next.js route handlers) creates Mastra agent streams and converts them via `toAISdkFormat()`. The **memory layer** (Mastra `Memory` class) handles all persistence, compression, and retrieval. The **storage layer** uses PostgreSQL for production (via `@mastra/pg`) or LibSQL for simpler deployments.

**Multi-tenant isolation** follows Mastra's two-level hierarchy. Set `resourceId` to your authenticated user/tenant ID in middleware, never trust client-provided values, and use `requestContextSchema` (Zod validation) on agents to enforce required auth context. For enterprise scenarios, Mastra supports dynamic memory selection per tenant:

```typescript
const agent = new Agent({
  memory: ({ requestContext }) => {
    const tier = requestContext.get('user-tier');
    return tier === 'enterprise' ? premiumMemory : standardMemory;
  },
});
```

**For deployment**, Mastra supports Vercel natively via `@mastra/deployer-vercel` with configurable `maxDuration`, memory limits, and region selection. After `mastra build`, the self-contained `.mastra/output/` directory deploys cleanly. Set `NODE_OPTIONS="--max-old-space-size=4096"` for large builds. PostgreSQL should be provisioned in the same region as your Vercel deployment to minimize latency on memory operations.

**Testing memory-augmented agents** requires a layered strategy. Unit test memory operations (create thread, recall, delete) against a local LibSQL instance. Integration test the full agent loop by verifying that observations are created after the token threshold is exceeded — feed enough messages to trigger the Observer, then check that the observation block appears in subsequent `recall()` results. For OM specifically, test the async buffering behavior by simulating rapid message sequences and confirming observations activate correctly. Use Mastra's built-in `eval` framework for benchmarking memory quality against your specific use cases.

## Conclusion

Mastra's Observational Memory represents a genuine architectural shift from retrieval-based memory (RAG) to compression-based memory. Its three-tier system — raw messages, observations, reflections — delivers state-of-the-art recall accuracy while eliminating vector database dependencies and enabling prompt caching. The integration surface with the Vercel AI SDK is clean: Mastra sits on top of AI SDK's model layer, the `@mastra/ai-sdk` bridge handles format conversion, and the frontend remains pure AI SDK React hooks. The most important implementation decisions are choosing thread-scoped OM to start (not resource scope), using Mastra's reserved context keys for tenant isolation, selecting `google/gemini-2.5-flash` as the Observer/Reflector model, and centralizing your storage instance. For teams already on the AI SDK, the `withMastra()` wrapper offers the lowest-friction adoption path, while the full Mastra Agent approach unlocks the complete memory lifecycle including automatic thread management and the REST API surface for user-facing memory features.

# Mastra's Observational Memory meets the Vercel AI SDK

**Mastra's Observational Memory (OM) is a text-based, append-only compression system that replaces raw conversation history with dense observation logs, achieving 94.87% on the LongMemEval benchmark — without a vector database.** Introduced in `@mastra/memory@1.1.0` (February 2026), OM uses two background agents — an Observer and a Reflector — to progressively compress conversations into a stable, prompt-cacheable context prefix that enables 4–10× cost reduction. Integrating it with an existing Next.js app using Vercel's AI SDK is straightforward because Mastra is built directly on top of the AI SDK's model layer. The bridge package `@mastra/ai-sdk` converts Mastra's streams into AI SDK–compatible formats, meaning your frontend continues using `useChat()` unchanged. This report covers the architecture, integration patterns, user-facing memory management, and production best practices.

## How Observational Memory actually works

OM manages the agent's context window through **three progressively compressed tiers**. Tier 1 is raw message history — the most recent, uncompressed conversation sitting at the end of the context window. When these messages exceed a configurable token threshold (default: **30,000 tokens**), the **Observer agent** activates, converting raw messages into Tier 2: dense, structured observation notes placed at the beginning of the context. The Observer produces dated, prioritized event logs using emoji-based priority levels (🔴 high, 🟡 medium, 🟢 low) and a three-date temporal anchoring model — observation date, referenced date, and relative date offset. When observations themselves exceed their threshold (default: **40,000 tokens**), the **Reflector agent** activates to produce Tier 3: a restructured, condensed version that combines related items, finds patterns, and drops superseded entries. Critically, this is reorganization, not summarization — the event-log structure persists.

The resulting context window layout is: `[System Prompt] → [Observations/Reflections] → [Recent Messages]`. Because the observation prefix is stable and append-only, it achieves consistent prompt cache hits across turns. Cache invalidation only occurs during reflection, which is infrequent. The compression ratio is **3–6× for text-only content and 5–40× for tool-call-heavy workloads**.

**Async buffering** (enabled by default) prevents the Observer from blocking conversations. Rather than waiting until the full threshold is hit, background Observer calls run at regular intervals (every ~6,000 tokens by default). Each call produces a chunk of observations stored in a buffer. When the threshold is reached, buffered chunks activate instantly. A safety threshold (`blockAfter: 1.2×`) forces synchronous observation as a fallback if the agent outpaces the background processing.

OM requires no vector database or embedding model — a major architectural simplification over RAG-based approaches. It supports **PostgreSQL** (`@mastra/pg`), **LibSQL** (`@mastra/libsql`), and **MongoDB** (`@mastra/mongodb`) as storage backends. The default Observer/Reflector model is `google/gemini-2.5-flash`, chosen for its 1M token context window that gives the Reflector headroom. Claude 4.5 models are explicitly not recommended for Observer/Reflector roles.

## Two integration paths for existing AI SDK apps

Since Mastra is built on top of the Vercel AI SDK (using its model providers like `openai()` and `anthropic()` directly), integration follows one of two patterns depending on how your existing app is structured.

### The full Mastra Agent approach (recommended)

This approach replaces your `streamText`/`generateText` calls with a Mastra `Agent` that has memory attached natively. Install the required packages:

```bash
npm install @mastra/core @mastra/memory @mastra/libsql @mastra/ai-sdk ai @ai-sdk/react @ai-sdk/openai
```

Define your agent with OM enabled:

```typescript
// src/mastra/agents/index.ts
import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';

const memory = new Memory({
  storage: new LibSQLStore({ url: 'file:./mastra.db' }),
  options: {
    observationalMemory: {
      model: 'google/gemini-2.5-flash',
      scope: 'thread',
      observation: { messageTokens: 30_000 },
      reflection: { observationTokens: 40_000 },
    },
  },
});

export const chatAgent = new Agent({
  name: 'chatAgent',
  instructions: 'You are a helpful assistant with long-term memory.',
  model: openai('gpt-4o'),
  memory,
});
```

Register it with Mastra and create your API route:

```typescript
// app/api/chat/route.ts
import { mastra } from '@/src/mastra';
import { toAISdkFormat } from '@mastra/ai-sdk';
import { convertMessages } from '@mastra/core/agent';
import { createUIMessageStreamResponse } from 'ai';
import { NextResponse } from 'next/server';

const agent = mastra.getAgent('chatAgent');

export async function POST(req: Request) {
  const { messages } = await req.json();
  const stream = await agent.stream(messages, {
    memory: {
      thread: 'user-thread-123', // conversation ID
      resource: 'user-123', // user/tenant ID
    },
  });
  return createUIMessageStreamResponse({
    stream: toAISdkFormat(stream, { from: 'agent' }),
  });
}

export async function GET() {
  const mem = await agent.getMemory();
  const response = await mem?.query({
    threadId: 'user-thread-123',
    resourceId: 'user-123',
  });
  const uiMessages = convertMessages(response?.uiMessages ?? []).to('AIV5.UI');
  return NextResponse.json(uiMessages);
}
```

Your frontend uses standard `useChat()` with no Mastra-specific code:

```typescript
// app/chat/page.tsx
"use client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect } from "react";

export default function Chat() {
  const { messages, setMessages, sendMessage, status, input, setInput } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  useEffect(() => {
    fetch("/api/chat").then(r => r.json()).then(setMessages);
  }, [setMessages]);

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>
          {m.parts?.map((part, i) =>
            part.type === "text" ? <p key={i}>{part.text}</p> : null
          )}
        </div>
      ))}
      <form onSubmit={e => { e.preventDefault(); sendMessage({ text: input }); setInput(""); }}>
        <input value={input} onChange={e => setInput(e.target.value)} />
      </form>
    </div>
  );
}
```

Add `serverExternalPackages: ["@mastra/*"]` to your `next.config.ts` to avoid bundling issues.

### The `withMastra()` wrapper for existing AI SDK code

If you already have `streamText`/`generateText` calls and don't want to refactor to Mastra's Agent class, `withMastra()` wraps any AI SDK model with memory capabilities:

```typescript
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { withMastra } from '@mastra/ai-sdk';
import { LibSQLStore } from '@mastra/libsql';

const storage = new LibSQLStore({ id: 'my-app', url: 'file:./data.db' });
await storage.init();
const memoryStorage = await storage.getStore('memory');

const model = withMastra(openai('gpt-4o'), {
  memory: {
    storage: memoryStorage!,
    threadId: 'user-thread-123',
    resourceId: 'user-123',
    lastMessages: 10,
  },
});

const { text } = await generateText({
  model,
  prompt: 'What did we talk about earlier?',
});
```

Under the hood, `withMastra()` uses the AI SDK's `wrapLanguageModel` middleware pattern — it intercepts calls via `transformParams` to load historical messages before the LLM call and persists new messages afterward. Input and output processors can also be attached for guard rails, logging, or PII detection.

## Giving users visibility into their memories

Mastra provides a rich API surface for memory management that maps directly to user-facing features. The `Memory` class exposes methods for full CRUD operations on threads and messages, and when using Mastra's server (`mastra dev` or server adapters), REST endpoints are automatically registered.

**Key programmatic methods** for building memory UIs:

```typescript
const memory = await agent.getMemory();

// List all conversations for a user
const threads = await memory.getThreadsByResourceId({
  resourceId: 'user-123',
  orderBy: 'updatedAt',
  sortDirection: 'DESC',
});

// Get messages in a thread (paginated)
const { messages } = await memory.recall({
  threadId: 'thread-456',
  perPage: 50,
  page: 0,
  orderBy: { field: 'createdAt', direction: 'ASC' },
});

// Delete specific messages
await memory.deleteMessages('thread-456', ['msg-1', 'msg-2']);

// Read/update working memory (user preferences, profile data)
await memory.updateWorkingMemory({
  threadId: 'thread-456',
  resourceId: 'user-123',
  workingMemory:
    '# User Profile\n- **Name**: Alice\n- **Preference**: Dark mode',
});
```

**Automatic REST endpoints** (available when running Mastra's server) include `GET /api/memory/threads` for listing threads, `GET /api/memory/threads/:threadId/messages` for paginated message retrieval, `DELETE /api/memory/threads/:threadId` for thread deletion, and `POST /api/memory/threads/:threadId/clone` for thread cloning. The **Client SDK** (`@mastra/client-js`) wraps these endpoints with typed methods like `getMemoryThreads()`, `thread.listMessages()`, `thread.delete()`, and `thread.deleteMessages()`.

For Observational Memory specifically, Mastra Studio provides real-time visualization of OM status: token usage, active model, current observations, and reflection markers inline in the chat timeline. To build custom UIs, query the thread's messages and observations through `memory.recall()` and display the structured observation logs (which include priority emojis and timestamps) alongside the conversation.

A practical pattern for a "Memory Inspector" component involves creating a dedicated API route that calls `memory.recall()` with `perPage: false` to fetch the complete thread state, then rendering observations as collapsible sections with their priority levels and dates. Working memory (if enabled alongside OM) can be displayed and edited through the `getWorkingMemory` and `updateWorkingMemory` endpoints.

## Critical dos and don'ts

**Thread and resource ID management** is the most consequential decision. The `resourceId` represents a user or tenant, while `threadId` is a globally unique conversation identifier. Each thread has an **immutable owner** set at creation — Mastra returns 403 errors when users attempt to access threads they don't own. Never let client-supplied `resourceId` values bypass server-side validation. Use Mastra's reserved context keys (`MASTRA_RESOURCE_ID_KEY`, `MASTRA_THREAD_ID_KEY`) set in auth middleware, which override client-provided values to prevent spoofing:

```typescript
import { MASTRA_RESOURCE_ID_KEY } from '@mastra/core/request-context';
// In your auth middleware:
requestContext.set(MASTRA_RESOURCE_ID_KEY, authenticatedUser.id);
```

**Do not use Claude 4.5 models** as the Observer or Reflector — they don't work well in these roles. Stick with `google/gemini-2.5-flash` (default) or tested alternatives like `deepseek/deepseek-reasoner`. **Do not start with resource-scoped OM** — it's experimental and processes unobserved messages across all threads simultaneously, which can be slow for users with many existing conversations. Start with thread scope and migrate carefully.

**Always configure `TokenLimiter`** as the last processor in any chain if you're combining OM with other memory processors. Placing it earlier means subsequent processors can re-inflate the token count. **Do not use `perPage: false`** in `memory.recall()` for agent context loading — reserve it for UI display only, as it fetches all messages regardless of configured limits.

**Avoid sharing database connections carelessly.** Use a single, centralized storage instance shared across all agents rather than creating per-agent connections, which leads to connection pool exhaustion in production. For Next.js specifically, instantiate your Mastra instance at module scope (not inside request handlers) to avoid reinitializing on every request.

A subtle anti-pattern is **over-relying on both OM and semantic recall simultaneously**. OM is designed to replace RAG for most long-conversation use cases. Enabling both adds infrastructure complexity (vector DB + embedding model) with diminishing returns. OM alone scores 84.23% with GPT-4o versus semantic recall's 80.05% — and without any vector infrastructure.

## Production architecture and deployment patterns

The recommended architecture for a Next.js + AI SDK + Mastra Memory stack follows a clear separation of concerns. The **frontend layer** uses standard `useChat()` from `@ai-sdk/react`, communicating with Next.js API routes. The **API layer** (Next.js route handlers) creates Mastra agent streams and converts them via `toAISdkFormat()`. The **memory layer** (Mastra `Memory` class) handles all persistence, compression, and retrieval. The **storage layer** uses PostgreSQL for production (via `@mastra/pg`) or LibSQL for simpler deployments.

**Multi-tenant isolation** follows Mastra's two-level hierarchy. Set `resourceId` to your authenticated user/tenant ID in middleware, never trust client-provided values, and use `requestContextSchema` (Zod validation) on agents to enforce required auth context. For enterprise scenarios, Mastra supports dynamic memory selection per tenant:

```typescript
const agent = new Agent({
  memory: ({ requestContext }) => {
    const tier = requestContext.get('user-tier');
    return tier === 'enterprise' ? premiumMemory : standardMemory;
  },
});
```

**For deployment**, Mastra supports Vercel natively via `@mastra/deployer-vercel` with configurable `maxDuration`, memory limits, and region selection. After `mastra build`, the self-contained `.mastra/output/` directory deploys cleanly. Set `NODE_OPTIONS="--max-old-space-size=4096"` for large builds. PostgreSQL should be provisioned in the same region as your Vercel deployment to minimize latency on memory operations.

**Testing memory-augmented agents** requires a layered strategy. Unit test memory operations (create thread, recall, delete) against a local LibSQL instance. Integration test the full agent loop by verifying that observations are created after the token threshold is exceeded — feed enough messages to trigger the Observer, then check that the observation block appears in subsequent `recall()` results. For OM specifically, test the async buffering behavior by simulating rapid message sequences and confirming observations activate correctly. Use Mastra's built-in `eval` framework for benchmarking memory quality against your specific use cases.

## Conclusion

Mastra's Observational Memory represents a genuine architectural shift from retrieval-based memory (RAG) to compression-based memory. Its three-tier system — raw messages, observations, reflections — delivers state-of-the-art recall accuracy while eliminating vector database dependencies and enabling prompt caching. The integration surface with the Vercel AI SDK is clean: Mastra sits on top of AI SDK's model layer, the `@mastra/ai-sdk` bridge handles format conversion, and the frontend remains pure AI SDK React hooks. The most important implementation decisions are choosing thread-scoped OM to start (not resource scope), using Mastra's reserved context keys for tenant isolation, selecting `google/gemini-2.5-flash` as the Observer/Reflector model, and centralizing your storage instance. For teams already on the AI SDK, the `withMastra()` wrapper offers the lowest-friction adoption path, while the full Mastra Agent approach unlocks the complete memory lifecycle including automatic thread management and the REST API surface for user-facing memory features.
