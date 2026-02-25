# bash-tool & just-bash: Verified API Reference

## Executive Summary

This document provides verified API documentation for `bash-tool` (v1.3.14) and `just-bash` (v2.10.0) based on installed type declarations and package registry analysis. Key findings:

- `createBashTool()` returns `BashToolkit` with `{ bash, tools, sandbox }` structure
- just-bash is a **simulated** TypeScript bash interpreter that cannot run real binaries
- Default working directory is `"./workspace"` (not `/workspace`)
- Supports 25+ bash commands including jq, sqlite3, ripgrep, but NOT curl/python/node by default
- Three tools exposed: `bash` (execute), `readFile`, `writeFile`
- Filesystem persists across `exec()` calls within same `Bash` instance

## Package Verification

**bash-tool v1.3.14**
- Package: `bash-tool`
- Type declarations: `node_modules/bash-tool/dist/types.d.ts`
- Export: `createBashTool`, `experimental_createSkillTool`, `bashTools`, utility functions

**just-bash v2.10.0**
- Package: `just-bash`
- Command registry: 25+ simulated commands
- Architecture: TypeScript-based bash interpreter (no real process execution)

## API Surface (Verified Types)

### createBashTool Function

```typescript
import { createBashTool } from 'bash-tool';

function createBashTool(
  options?: CreateBashToolOptions
): Promise<BashToolkit>;
```

### CreateBashToolOptions Interface

```typescript
interface CreateBashToolOptions {
  // Working directory for sandbox (default: "./workspace")
  destination?: string;

  // Pre-populate files in sandbox
  files?: Record<string, string>;

  // Upload directory from disk
  uploadDirectory?: {
    source: string;
    include?: string;  // Glob pattern
  };

  // Custom sandbox implementation
  sandbox?: Sandbox | VercelSandbox | JustBashLike;

  // Additional instructions appended to tool descriptions
  extraInstructions?: string;

  // Custom tool prompt configuration
  promptOptions?: {
    toolPrompt?: string;
  };

  // Pre-execution hook
  onBeforeBashCall?: (input: { command: string }) => {
    command: string;
  } | undefined;

  // Post-execution hook
  onAfterBashCall?: (input: {
    command: string;
    result: CommandResult;
  }) => {
    result: CommandResult;
  } | undefined;

  // Maximum command output length (default: 30000)
  maxOutputLength?: number;

  // Maximum files in sandbox (default: 1000)
  maxFiles?: number;
}
```

### BashToolkit Return Type

```typescript
interface BashToolkit {
  // Individual bash execution tool
  bash: ReturnType<typeof createBashExecuteTool>;

  // All three tools for AI SDK
  tools: {
    bash: ReturnType<typeof createBashExecuteTool>;
    readFile: ReturnType<typeof createReadFileTool>;
    writeFile: ReturnType<typeof createWriteFileTool>;
  };

  // Underlying sandbox instance
  sandbox: Sandbox;
}
```

### Sandbox Interface

```typescript
interface Sandbox {
  executeCommand(command: string): Promise<CommandResult>;
  readFile(path: string): Promise<string>;
  writeFiles(
    files: Array<{ path: string; content: string | Buffer }>
  ): Promise<void>;
}

interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}
```

## just-bash Supported Commands

### Full Command Registry (25+ commands)

**File Operations**
- `cat` - Concatenate and print files
- `ls` - List directory contents
- `mkdir` - Create directories
- `touch` - Create empty files
- `mv` - Move/rename files
- `cp` - Copy files
- `rm` - Remove files

**Text Processing**
- `echo` - Print text
- `printf` - Formatted output
- `grep` - Search text patterns
- `sed` - Stream editor
- `awk` - Text processing language
- `sort` - Sort lines
- `cut` - Extract fields
- `tr` - Translate characters
- `wc` - Word/line/byte count
- `head` - First N lines
- `tail` - Last N lines
- `diff` - Compare files

**Structured Data**
- `jq` - JSON processor
- `yq` - YAML processor
- `xan` - CSV processor
- `sqlite3` - SQLite database

**Search & Discovery**
- `find` - Find files by criteria
- `rg` (ripgrep) - Fast text search

**Compression**
- `tar` - Archive files
- `gzip` - Compress files

**Conversion**
- `html-to-markdown` - Convert HTML to Markdown

### Commands NOT Available by Default

- `curl` / `wget` - Network requests (needs explicit config or custom implementation)
- `python` / `node` / `npm` - Cannot execute real interpreters
- Arbitrary binaries - just-bash is simulated, not a real shell

### Command Limitations

just-bash is a **TypeScript-based simulator** that:
- Cannot spawn real processes
- Cannot make network requests without custom handlers
- Cannot run compiled binaries
- Provides bash-like syntax for file/text operations only

## AI SDK v6 Integration

### Basic Usage Pattern

```typescript
import { generateText, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createBashTool } from 'bash-tool';
import { stepCountIs } from 'ai';

// Create bash toolkit
const { tools, sandbox } = await createBashTool({
  files: {
    'data.json': '{"users": [{"name": "Alice", "age": 30}]}',
    'notes.txt': 'Important information here',
  },
  destination: '/workspace',
  maxOutputLength: 50000,
});

// Use with generateText
const result = await generateText({
  model: openai('gpt-4o'),
  tools,
  stopWhen: stepCountIs(10),  // v6 API (not maxSteps)
  prompt: 'Find all users over 25 in data.json',
});

// Access final text
console.log(result.text);

// Inspect tool calls
for (const step of result.steps) {
  if (step.toolCalls) {
    for (const call of step.toolCalls) {
      console.log('Tool:', call.toolName);
      console.log('Args:', call.args);
    }
  }
}
```

### Streaming Usage

```typescript
import { streamText } from 'ai';

const result = streamText({
  model: openai('gpt-4o'),
  tools,
  stopWhen: stepCountIs(15),
  prompt: 'Analyze the JSON and create a summary report',
});

// Stream text chunks
for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

### Tool Part Structure (AI SDK v6)

Tool invocations in AI SDK v6 use flat structure:

```typescript
{
  type: "dynamic-tool",
  toolName: "bash",  // or "readFile", "writeFile"
  state: "result",   // "call" | "result" | "partial-call"
  input: {
    command: "cat data.json | jq '.users[]'"
  },
  output: {
    stdout: "...",
    stderr: "",
    exitCode: 0
  }
}
```

**NOT** the v5 nested structure:
```typescript
// WRONG (v5 API)
{
  type: "tool-invocation",
  toolInvocation: {
    toolName: "bash",
    // ...
  }
}
```

### Pre-populating Files

```typescript
// Option 1: Inline files
const { tools } = await createBashTool({
  files: {
    'config.yaml': 'key: value',
    'script.sh': '#!/bin/bash\necho "Hello"',
  },
});

// Option 2: Upload from disk
const { tools } = await createBashTool({
  uploadDirectory: {
    source: './data',
    include: '**/*.json',  // Glob pattern
  },
});

// Option 3: Mixed approach
const { tools } = await createBashTool({
  files: { 'README.md': '# Project' },
  uploadDirectory: { source: './src' },
});
```

### Custom Sandbox

```typescript
import { Bash } from 'just-bash';

// Create custom just-bash instance
const bash = new Bash({
  // Custom configuration
});

// Use with bash-tool
const { tools } = await createBashTool({
  sandbox: bash,
  destination: '/custom/path',
});
```

## Corrections to Original Research

### 1. Return Value Structure

**WRONG (original assumption):**
```typescript
const { tools } = await createBashTool();
// Missing: bash, sandbox properties
```

**CORRECT (verified from types):**
```typescript
const { bash, tools, sandbox } = await createBashTool();
// bash: individual tool reference
// tools: { bash, readFile, writeFile }
// sandbox: underlying Sandbox instance
```

### 2. Default Destination

**WRONG:** Default is `/workspace`

**CORRECT:** Default is `"./workspace"` (relative path)

### 3. Tool Description Customization

**WRONG:** Separate tool description properties

**CORRECT:** Single `extraInstructions` option appended to all tool descriptions

### 4. maxSteps Property

**WRONG:** `BashToolkit` has `maxSteps` property

**CORRECT:** `maxSteps` is on `generateText()` options (now `stopWhen: stepCountIs(N)` in v6)

### 5. Network Capabilities

**WRONG:** just-bash supports curl/wget

**CORRECT:** No network commands by default; requires custom sandbox implementation

## Edge Cases & Limitations

### 1. Large Output Truncation

Commands producing output exceeding `maxOutputLength` (default: 30000 chars) will be truncated:

```typescript
const { tools } = await createBashTool({
  maxOutputLength: 100000,  // Increase for large datasets
});
```

### 2. File Count Limits

Sandbox enforces `maxFiles` limit (default: 1000):

```typescript
const { tools } = await createBashTool({
  maxFiles: 5000,  // Adjust for large projects
});
```

### 3. Binary Execution Attempts

AI may attempt to run unsupported commands:

```bash
# This will FAIL in just-bash
python script.py
node app.js
curl https://api.example.com
```

Mitigation:
```typescript
const { tools } = await createBashTool({
  extraInstructions: `
    IMPORTANT: Cannot execute python, node, curl, or other binaries.
    Only use: cat, grep, jq, sqlite3, awk, sed, find, rg.
  `,
});
```

### 4. Filesystem Persistence

Filesystem persists **only** within the same `Bash` instance:

```typescript
const { tools: tools1 } = await createBashTool({ files: { 'a.txt': 'data' } });
const { tools: tools2 } = await createBashTool();

// tools2 DOES NOT have a.txt (separate sandbox)
```

### 5. Tool Description Auto-Generation

Tool descriptions automatically include:
- Current working directory
- List of files (up to 8 files shown)

This can consume tokens if many files exist. Use `extraInstructions` carefully.

## Advanced Configuration

### Execution Hooks

```typescript
const { tools } = await createBashTool({
  onBeforeBashCall: ({ command }) => {
    console.log('Executing:', command);
    // Optionally modify command
    if (command.includes('rm -rf /')) {
      return { command: 'echo "Dangerous command blocked"' };
    }
    return { command };
  },

  onAfterBashCall: ({ command, result }) => {
    console.log('Result:', result.stdout);
    // Optionally modify result
    if (result.stderr.includes('permission denied')) {
      return {
        result: {
          ...result,
          stderr: 'Custom error message',
        },
      };
    }
    return { result };
  },
});
```

### Custom Tool Prompts

```typescript
const { tools } = await createBashTool({
  promptOptions: {
    toolPrompt: `
      You are a data analyst. Use bash commands to:
      - Extract insights from JSON/CSV files
      - Generate summary reports
      - Search for patterns in text files
    `,
  },
});
```

### Combining with @vercel/blob

```typescript
import { put, list } from '@vercel/blob';
import { createBashTool } from 'bash-tool';

// Upload research documents to blob storage
const { url } = await put('research/data.json', JSON.stringify(data), {
  access: 'public',
});

// Download and analyze in bash sandbox
const response = await fetch(url);
const content = await response.text();

const { tools } = await createBashTool({
  files: {
    'data.json': content,
  },
});

const result = await generateText({
  model: openai('gpt-4o'),
  tools,
  prompt: 'Analyze the research data',
});
```

## Sources

### Primary Sources (Type Declarations)
- `node_modules/bash-tool/dist/types.d.ts` (v1.3.14)
- `node_modules/just-bash/dist/index.d.ts` (v2.10.0)

### Package Registry
- https://www.npmjs.com/package/bash-tool
- https://www.npmjs.com/package/just-bash

### Official Documentation
- https://justbash.dev/ (just-bash docs)
- https://sdk.vercel.ai/docs/ai-sdk-core (AI SDK v6 migration guide)

### Community Resources
- https://github.com/vercel-labs/bash-tool (source code)
- https://github.com/vercel-labs/just-bash (interpreter source)
