# Vercel AI SDK — Implementation Research

## 1. Executive Summary (v5 vs v6 Status)

**AI SDK v6 is the current stable release.** The `ai` npm package `latest` tag points to `6.0.86` (as of 2026-02-15). The v5 line is still maintained under the `ai-v5` dist-tag at `5.0.133`, but is no longer the default install.

The v5-to-v6 migration is largely about **deprecations rather than removals**. The key functions `generateObject` and `streamObject` still work in v6 but are marked deprecated -- their replacements are `generateText` with `Output.object()` and `streamText` with `Output.object()` respectively. The critical breaking changes from v4-to-v5 (which this project already adopted) include `maxSteps` to `stopWhen`, `parameters` to `inputSchema`, and `args`/`result` to `input`/`output`.

**Recommended approach for this project:** Use the v6 APIs directly. Since the project already depends on `ai@^6.0.86`, all v6 features are available. For new code, prefer `generateText` + `Output.object()` over the deprecated `generateObject`. For tool-calling agents, use `generateText`/`streamText` with `stopWhen: stepCountIs(N)`.

## 2. Package Verification

| Package | Latest Version | Dist Tag | Project Version |
|---------|---------------|----------|-----------------|
| `ai` | `6.0.86` | `latest` | `^6.0.86` |
| `@ai-sdk/openai` | `3.0.29` | `latest` | `^3.0.29` |
| `@ai-sdk/react` | `3.0.88` | `latest` | `^3.0.88` |
| `bash-tool` | `1.3.14` | `latest` | `^1.3.14` |
| `just-bash` | `2.10.0` | `latest` | `^2.10.0` |
| `zod` | `4.3.6` | `latest` | `^4.3.6` |

**Dist-tag map for `ai`:**
- `latest` = `6.0.86`
- `ai-v5` = `5.0.133`
- `beta` = `6.0.0-beta.169`

All project dependencies are at or near the latest versions. No upgrades needed.

### Key Imports

```typescript
// Core functions
import { generateText, streamText, Output, stepCountIs, hasToolCall, tool } from 'ai';
import { convertToModelMessages, UIMessage, DefaultChatTransport } from 'ai';

// React hooks (NOT re-exported from 'ai')
import { useChat } from '@ai-sdk/react';

// OpenAI provider
import { openai } from '@ai-sdk/openai';

// Zod (v4 supported)
import { z } from 'zod';
```

## 3. `generateText` — Verified API (Tool Use)

### Signature

```typescript
import { generateText, tool, stepCountIs } from 'ai';
import { z } from 'zod';

const result = await generateText({
  model: openai('gpt-4o'),
  system: 'You are a helpful assistant.',
  prompt: 'What is the weather?',
  tools: {
    weather: tool({
      description: 'Get weather for a location',
      inputSchema: z.object({
        location: z.string().describe('City name'),
      }),
      execute: async ({ location }) => ({
        location,
        temperature: 72,
      }),
    }),
  },
  stopWhen: stepCountIs(5),
  output: Output.object({
    schema: z.object({ ... }),
  }),
  onStepFinish: async ({ toolResults }) => { ... },
});
```

### Response Shape

```typescript
const {
  text,
  output,
  reasoning,
  reasoningText,
  sources,
  toolCalls,
  toolResults,
  steps,
  finishReason,
  usage,
  response,
} = result;
```

### Tool Use with bash-tool

```typescript
import { createBashTool } from 'bash-tool';
import { generateText, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';

const toolkit = await createBashTool({
  files: { '/workspace/data.txt': 'Hello world' },
});

const result = await generateText({
  model: openai('gpt-4o'),
  tools: toolkit.tools,
  system: 'You are a bash assistant.',
  prompt: 'List all files in /workspace',
  stopWhen: stepCountIs(10),
});
```

### `stopWhen` Options

```typescript
import { stepCountIs, hasToolCall } from 'ai';

stopWhen: stepCountIs(5),
stopWhen: hasToolCall('finalAnswer'),
stopWhen: ({ steps }) => steps.length >= 3 && steps.at(-1)?.text?.includes('DONE'),
stopWhen: [stepCountIs(10), hasToolCall('done')],
```

**Important:** `stopWhen` conditions are only evaluated when the last step contains tool results.

## 4. `generateObject` — Verified API (Structured Output + Zod)

### Status: DEPRECATED in v6 (still functional)

### Legacy API (still works)

```typescript
import { generateObject } from 'ai';
const { object } = await generateObject({
  model: openai('gpt-4o'),
  schema: z.object({ title: z.string(), summary: z.string() }),
  prompt: 'Classify this document...',
});
```

### Recommended v6 Replacement

```typescript
import { generateText, Output } from 'ai';
const { output } = await generateText({
  model: openai('gpt-4o'),
  output: Output.object({ schema: z.object({ ... }) }),
  prompt: 'Classify this document...',
});
```

Key difference: `generateObject` returns `{ object }`, `generateText` with `Output.object()` returns `{ output }`.

### Zod v4 Compatibility

AI SDK v6 supports both Zod v3 and Zod v4. The project uses `zod@^4.3.6`. Standard `import { z } from 'zod'` works for both.

## 5. `streamText` — Verified API

### Basic Streaming

```typescript
const result = streamText({
  model: 'openai/gpt-4o',
  system: 'You are a helpful assistant.',
  prompt: 'Explain quantum computing',
});
for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

### Next.js API Route Pattern

```typescript
import { streamText, convertToModelMessages, UIMessage } from 'ai';
export const maxDuration = 30;
export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const result = streamText({
    model: 'openai/gpt-4o',
    messages: await convertToModelMessages(messages),
  });
  return result.toUIMessageStreamResponse();
}
```

**Critical:** `convertToModelMessages()` is async in v6.

### Streaming Structured Output (replaces streamObject)

```typescript
const { partialOutputStream } = streamText({
  model: 'openai/gpt-4o',
  output: Output.object({ schema: z.object({ ... }) }),
  prompt: '...',
});
for await (const partialObject of partialOutputStream) {
  console.log(partialObject);
}
```

**Note:** `streamObject` used `partialObjectStream`. Replacement uses `partialOutputStream`.

## 6. `@ai-sdk/openai` Provider

### Models

```typescript
openai('gpt-4o');
openai('gpt-4o-mini');
openai('gpt-5');
openai('gpt-5-mini');
openai('gpt-5-nano');
openai('o1'); openai('o3'); openai('o3-mini'); openai('o4-mini');
```

### Features
- Structured outputs: `strictJsonSchema` defaults to `true` in v6
- Function calling / tools: Fully supported
- Web search: `openai.tools.webSearch()` built-in
- Reasoning models: text generation only (no structured output)

## 7. Tool Integration Patterns

### Tool Definition

```typescript
import { tool } from 'ai';
export const weatherTool = tool({
  description: 'Get weather for a location',
  inputSchema: z.object({ location: z.string() }),
  outputSchema: z.object({ temperature: z.number() }),
  execute: async ({ location }) => ({ temperature: 72 }),
});
```

### Composing Multiple Tool Sources

```typescript
const { tools: bashTools } = await createBashTool({ files: {} });
const result = await generateText({
  model: openai('gpt-4o'),
  tools: { ...bashTools, ...customTools },
  stopWhen: stepCountIs(10),
  prompt: '...',
});
```

### ToolLoopAgent (New in v6)

```typescript
import { ToolLoopAgent } from 'ai';
const agent = new ToolLoopAgent({
  model: openai('gpt-4o'),
  instructions: 'You are a research assistant.',
  tools: { search: searchTool },
  stopWhen: stepCountIs(10),
});
const { text } = await agent.generate({ prompt: 'Research...' });
```

## 8. v5 to v6 Migration Guide

### Already Applied (v4 to v5)
| Old (v4) | New (v5+) |
|----------|-----------|
| `maxSteps: 5` | `stopWhen: stepCountIs(5)` |
| `parameters: z.object({})` | `inputSchema: z.object({})` |
| `part.args` | `part.input` |
| `part.result` | `part.output` |
| `import { useChat } from 'ai'` | `import { useChat } from '@ai-sdk/react'` |
| sync `convertToModelMessages` | async (must `await`) |
| `"tool-invocation"` part type | `"dynamic-tool"` part type |

### New in v6
| v5 | v6 |
|-----|-----|
| `generateObject` | Deprecated — use `generateText` + `Output.object()` |
| `streamObject` | Deprecated — use `streamText` + `Output.object()` |
| `partialObjectStream` | `partialOutputStream` |
| `{ object }` | `{ output }` |
| `strictJsonSchema: false` | `strictJsonSchema: true` (default) |
| N/A | `ToolLoopAgent` class |

### Migration Codemod
```bash
npx @ai-sdk/codemod v6
```

## 9. Edge Cases and Gotchas

1. **`convertToModelMessages()` is async** — forgetting `await` passes a Promise to model
2. **`addToolOutput` deadlock** — In `useChat`'s `onToolCall`, do NOT `await addToolOutput()`. Fire and forget.
3. **`stopWhen` only evaluates after tool results** — text-only responses stop naturally
4. **`strictJsonSchema: true` default in v6** — some Zod schemas may be rejected
5. **`generateObject` still works** — deprecated but functional, no urgency to migrate existing code
6. **Zod v4 compatibility** — works fine with `import { z } from 'zod'`
7. **`streamText` is not async** — `streamText()` returns synchronously, result has async iterables
8. **`maxDuration` in Next.js routes** — Export `export const maxDuration = 30;` to prevent timeout

## 10. Sources

### Official Documentation
- AI SDK GitHub: https://github.com/vercel/ai
- AI SDK docs: https://ai-sdk.dev
- Migration Guide v5→v6: https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0
- generateText reference: https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text
- streamText reference: https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text
- OpenAI provider: https://ai-sdk.dev/providers/ai-sdk-providers/openai

### npm Registry (verified 2026-02-15)
- `ai@6.0.86` (latest)
- `@ai-sdk/openai@3.0.29` (latest)
- `@ai-sdk/react@3.0.88` (latest)
