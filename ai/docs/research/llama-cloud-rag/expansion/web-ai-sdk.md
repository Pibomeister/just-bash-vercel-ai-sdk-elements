# Web Research: AI SDK v6

## Executive Summary

AI SDK v6 has officially shipped with significant improvements to the tool loop orchestration and agent abstractions. The migration is straightforward with an automated codemod (`npx @ai-sdk/codemod v6`) that handles most breaking changes. Key improvements include the `ToolLoopAgent` class replacing `Experimental_Agent`, a new `stopWhen` parameter with `stepCountIs()` for flexible loop control, and the stabilization of `generateImage`. The default behavior now runs up to 20 steps (previously 1), enabling more autonomous agent behavior out of the box.

Third-party tool integration has matured with bash-tool (Vercel Labs) providing official filesystem tools built on the just-bash TypeScript interpreter, and the AI SDK Tools Registry enabling shadcn-style component discovery.

## Discovery Summary

Research focused on four critical areas:

1. **AI SDK v6 Migration Path**: Identified breaking changes and automated migration strategy
2. **Tool Loop Evolution**: Discovered new control flow mechanisms and default behavior changes
3. **Structured Output Best Practices**: Found optimal Zod schema patterns for reliability
4. **Third-Party Tool Ecosystem**: Mapped official Vercel Labs tools and community integrations

Key finding: The `stepCountIs(20)` default represents a philosophical shift toward autonomous multi-step reasoning rather than single-shot execution.

## Community Consensus

### Positive Feedback

- Migration described as "straightforward with minimal code changes"
- Automated codemod handles 90%+ of breaking changes
- Agent abstraction praised for reusability and composability
- Structured output with Zod is reliable and type-safe across all major providers
- bash-tool enables powerful filesystem-based context retrieval without custom implementation

### Known Limitations

- Default 20-step limit may be too aggressive for simple use cases (override with `stopWhen: stepCountIs(1)`)
- Azure provider breaking change requires explicit `azure.chat()` for legacy behavior
- Some experimental features still require `experimental_` prefix despite v6 stability claims
- Documentation for tool registry and skills pattern is sparse

### Migration Experience

Developers report smooth upgrades with primary friction points:
- Understanding new `stopWhen` semantics vs old `maxSteps`
- Updating Azure provider calls
- Finding replacement imports for renamed experimental features

## AI SDK v6 Changes

### Breaking Changes Summary

| Change | v5 Pattern | v6 Pattern | Impact |
|--------|-----------|-----------|--------|
| Agent Class | `Experimental_Agent` | `ToolLoopAgent` | High |
| Agent Parameter | `system` | `instructions` | High |
| Loop Control | `maxSteps: N` | `stopWhen: stepCountIs(N)` | Medium |
| Default Steps | 1 | 20 | High |
| Azure Provider | `azure()` | `azure.chat()` for old behavior | Medium |
| Image Generation | `experimental_generateImage` | `generateImage` | Low |

### Migration Command

```bash
npx @ai-sdk/codemod v6
```

This codemod automatically:
- Renames `Experimental_Agent` to `ToolLoopAgent`
- Converts `system` parameter to `instructions`
- Updates `maxSteps` to `stopWhen: stepCountIs(N)`
- Fixes Azure provider calls
- Removes `experimental_` prefix where stabilized

### Manual Migration Steps

After running codemod, verify:
1. Default step count change (1 → 20) matches your use case requirements
2. Azure provider calls use correct method (`azure.chat()` vs `azure()`)
3. Import statements updated for renamed exports
4. Type definitions updated for new parameter names

## Tool Loop Evolution

### Control Flow Changes

**v5 Pattern**:
```typescript
const result = await experimental_agent({
  system: 'You are a helpful assistant',
  maxSteps: 5,
  tools: { /* ... */ }
});
```

**v6 Pattern**:
```typescript
import { stepCountIs } from 'ai';

const agent = new ToolLoopAgent({
  instructions: 'You are a helpful assistant',
  stopWhen: stepCountIs(5),
  tools: { /* ... */ }
});

const result = await agent.run();
```

### Auto-Orchestration Behavior

The SDK automatically:
1. Appends tool responses to conversation history
2. Executes tool calls with provided implementations
3. Triggers new generations after tool execution
4. Continues until `stopWhen` condition met or natural completion

### stopWhen Patterns

```typescript
import { stepCountIs, noMoreToolCalls } from 'ai';

// Limit to 10 steps
stopWhen: stepCountIs(10)

// Stop when no more tool calls
stopWhen: noMoreToolCalls()

// Custom condition
stopWhen: (context) => context.messages.length > 20
```

### Default Behavior Change

**Critical**: The default changed from single-step (`stepCountIs(1)`) to multi-step (`stepCountIs(20)`).

Impact:
- Agents now run autonomously for up to 20 iterations
- Simple use cases may want explicit `stopWhen: stepCountIs(1)`
- Complex agentic workflows benefit from higher default
- Cost implications for API usage (20x potential increase)

## Tool Integration

### bash-tool (Vercel Labs)

Official tool package for filesystem operations:

```bash
npm install @vercel-labs/bash-tool
```

**Features**:
- Built on just-bash TypeScript interpreter
- Provides: bash execution, readFile, writeFile tools
- Simulated bash environment (no real system access)
- Persistent filesystem across tool calls within same session

**Usage**:
```typescript
import { createBashTool } from '@vercel-labs/bash-tool';

const { tools, sandbox } = await createBashTool({
  destination: '/workspace'
});

const result = await generateText({
  model: openai('gpt-4o'),
  tools,
  prompt: 'Read the contents of package.json'
});
```

**Limitations**:
- Cannot run node, python, or compiled binaries
- Simulated environment only (ls, cat, grep, find, sed, awk, jq, sqlite3)
- Default working directory: `/workspace`
- Tool descriptions auto-include working dir + file list (up to 8 files)

### AI SDK Tools Registry

Shadcn-style CLI for tool discovery:

```bash
# Search for tools
npx ai-tools search "database"

# Add tool to project
npx ai-tools add sql-query-tool
```

**Skills Pattern**:
- SKILL.md files define tool metadata and usage
- Optional accompanying scripts for execution
- Registry enables discoverability and sharing
- Community-driven tool ecosystem

### Tool Description Best Practices

From community experience:

1. **Include working directory** in tool descriptions for context
2. **List available files** (up to 8) for file operation tools
3. **Describe tool semantics** clearly for LLM understanding
4. **Provide examples** in description when behavior is non-obvious
5. **Keep descriptions under 200 tokens** for optimal prompt efficiency

## OpenAI Models

### Latest Models (February 2026)

**Reasoning Models**:
- **o3**: Most powerful reasoning model
- **o3-mini**: Balanced reasoning performance
- **o3-pro**: Premium reasoning for complex tasks
- **o4-mini**: Lightweight reasoning model

**General Purpose**:
- **GPT-4o**: Flagship multimodal model
- **GPT-4.1**: Coding-focused optimization
- **GPT-4.1 mini**: Efficient variant

### Deprecation Notice

**Retiring from ChatGPT on February 13, 2026**:
- GPT-4o
- GPT-4.1
- GPT-4.1 mini
- o4-mini

**Impact**: These models remain available via API but are removed from ChatGPT interface. No API deprecation announced yet, but plan migration to o3-series or GPT-4o successors.

### Model Selection Guide

| Use Case | Recommended Model | Rationale |
|----------|------------------|-----------|
| Multi-step reasoning | o3-mini | Best cost/performance for agentic workflows |
| Code generation | GPT-4.1 | Optimized for programming tasks |
| General chat | GPT-4o | Balanced multimodal capabilities |
| Budget-conscious | o3-mini or GPT-4.1 mini | Lower cost, good performance |
| Maximum accuracy | o3 or o3-pro | Highest reasoning capability |

## Best Practices

### generateObject with Zod

**Use `.describe()` for better AI context**:

```typescript
import { z } from 'zod';

const schema = z.object({
  partyName: z.string().describe('Full legal name of the contracting party'),
  contractDate: z.string().describe('ISO date when contract was signed'),
  paymentAmount: z.number().describe('Total payment amount in USD')
});

const result = await generateObject({
  model: openai('gpt-4o'),
  schema,
  prompt: 'Extract contract details'
});
```

**Prefer `.nullable()` over `.optional()`**:

```typescript
// More reliable LLM results
z.object({
  middleName: z.string().nullable() // LLM can explicitly return null
});

// Less reliable
z.object({
  middleName: z.string().optional() // LLM may omit field entirely
});
```

**Supported Schema Types**:
- Zod (recommended for TypeScript)
- Valibot (alternative schema library)
- JSON Schema (for language-agnostic definitions)

**Output Modes**:
- `'object'`: Single object extraction
- `'array'`: Array of objects
- `'enum'`: Enum value selection
- `'no-schema'`: Unstructured JSON

### Agent Reusability Pattern

```typescript
// Define reusable agent
const legalDocumentAgent = new ToolLoopAgent({
  instructions: 'Extract legal contract information',
  tools: { llamaParse, extractClauses, validateParties },
  stopWhen: stepCountIs(10)
});

// Use across multiple documents
const doc1Result = await legalDocumentAgent.run({ document: doc1 });
const doc2Result = await legalDocumentAgent.run({ document: doc2 });
```

### Tool Loop Cost Optimization

```typescript
// For simple queries, limit steps
const simpleAgent = new ToolLoopAgent({
  instructions: 'Answer the user question',
  stopWhen: stepCountIs(1), // Override default 20
  tools: { search }
});

// For complex workflows, monitor step count
const complexAgent = new ToolLoopAgent({
  instructions: 'Research and synthesize findings',
  stopWhen: stepCountIs(30), // Allow more steps
  tools: { webSearch, llamaParse, summarize },
  onStep: (context) => {
    console.log(`Step ${context.stepCount}: ${context.lastMessage.role}`);
  }
});
```

## Warnings

### Default Step Count Change

**High Impact**: The default changed from 1 to 20 steps.

Risks:
- 20x increase in API calls for unchanged code
- Unexpected autonomous behavior in production
- Cost implications for high-volume applications

Mitigation:
- Explicitly set `stopWhen: stepCountIs(1)` for simple use cases
- Monitor step counts in production logs
- Use `onStep` callback for observability

### Azure Provider Breaking Change

**Migration Required**: Azure provider now uses Responses API by default.

Old behavior:
```typescript
import { azure } from '@ai-sdk/azure';

const model = azure('gpt-4o'); // Uses new Responses API
```

Legacy behavior:
```typescript
import { azure } from '@ai-sdk/azure';

const model = azure.chat('gpt-4o'); // Uses old Chat Completions API
```

### bash-tool Limitations

**Not Real Bash**: bash-tool is a simulated TypeScript interpreter.

Cannot execute:
- Node.js scripts
- Python scripts
- Compiled binaries
- System commands outside simulated environment

Use cases:
- Safe file reading/writing in isolated environment
- Text processing with grep, sed, awk
- SQLite queries
- JSON manipulation with jq

Not suitable for:
- Running build scripts
- Executing tests
- System administration tasks
- Production deployments

## Sources

- [AI SDK 6 Launch Announcement](https://vercel.com/blog/ai-sdk-6)
- [AI SDK 6 Migration Guide](https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0)
- [AI SDK npm Package](https://www.npmjs.com/package/ai)
- [generateText Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text)
- [generateObject Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-object)
- [Agent Loop Control](https://ai-sdk.dev/docs/agents/loop-control)
- [bash-tool GitHub Repository](https://github.com/vercel-labs/bash-tool)
- [just-bash GitHub Repository](https://github.com/vercel-labs/just-bash)
- [OpenAI Provider Documentation](https://ai-sdk.dev/providers/ai-sdk-providers/openai)
- [OpenAI Models Reference](https://platform.openai.com/docs/models)
- [AI SDK Tools Registry](https://ai-sdk.dev/tools-registry)
