# Vercel Workflow Development Kit (WDK) - Technical Reference

## Executive Summary

Vercel Workflow Development Kit (WDK) is a durable execution framework for Next.js applications, currently in public beta. While it offers an elegant API design with TypeScript-native directives, significant production reliability issues and architectural constraints make it unsuitable for production use as of February 2025. This document provides verified technical details and critical warnings for teams evaluating WDK.

**Status**: Public beta (October 2025), no GA timeline announced
**Package**: `workflow` on npm
**Current project status**: NOT installed
**Recommendation**: Use Inngest for production workflows

---

## Package Verification

### NPM Package
- **Package name**: `workflow`
- **Version in research**: `^4.0.1-beta.26`
- **Installation status**: NOT currently installed in this project
- **Public availability**: Yes (npm public registry)
- **Stability**: Beta (breaking changes possible)

### Installation
```bash
npm install workflow
# or
pnpm add workflow
```

### Next.js Integration
```typescript
// next.config.ts
import { withWorkflow } from 'workflow/next';

export default withWorkflow(nextConfig);
```

**Critical requirement**: Must deploy to `iad1` region during beta.

---

## API Surface

### Workflow Definition

```typescript
export async function myWorkflow(arg1: string, arg2: string) {
  'use workflow';  // Directive marks this as orchestrator

  const result = await myStep(arg1);
  await sleep('5s');  // Durable sleep with string duration
  const finalResult = await anotherStep(result, arg2);

  return finalResult;
}
```

**Key characteristics**:
- `'use workflow'` directive at top of function
- Can be regular async function or generator
- Must maintain determinism (no `Math.random()`, `new Date()`)
- All parameters and return values must be JSON-serializable

### Step Definition

```typescript
async function myStep(input: string) {
  'use step';  // Directive marks durable work unit

  // Full Node.js runtime available here
  const response = await fetch('https://api.example.com/data');
  const data = await response.json();

  return processData(data, input);
}

// Configure retry behavior
myStep.maxRetries = 3;  // Default is 3 (4 total attempts)
```

**Critical limitations**:
- `'use step'` ONLY works on **top-level exported functions**
- **Does NOT work** on arrow functions: `const myStep = async () => { 'use step'; }`
- **Does NOT work** on functions defined inside other functions
- This breaks AI SDK tool patterns where `execute` is an arrow function

### Workflow Triggering

```typescript
import { start } from 'workflow/api';

// Start a workflow
const run = await start(myWorkflow, [arg1, arg2]);

console.log(run.id);      // Unique run identifier
console.log(run.status);  // "running" | "completed" | "failed"
```

### Status Checking

```typescript
import { getRun } from 'workflow/api';

const run = getRun(runId);
const result = await run.result();  // Waits for completion
```

### Error Handling

```typescript
import { FatalError, RetryableError, sleep } from 'workflow';

async function apiStep() {
  'use step';

  try {
    return await fetch('https://api.example.com/data');
  } catch (error) {
    if (error.status === 429) {
      // Rate limited - will retry
      throw new RetryableError('Rate limited', { retryAfter: '30s' });
    }

    if (error.status === 401) {
      // Authentication failed - don't retry
      throw new FatalError('Unauthorized - check API key');
    }

    // Default: will retry with exponential backoff
    throw error;
  }
}
```

### Metadata Access

```typescript
import { getStepMetadata } from 'workflow';

async function myStep() {
  'use step';

  const metadata = getStepMetadata();
  console.log(metadata.attempt);     // Current retry attempt (0-based)
  console.log(metadata.maxRetries);  // Configured max retries

  // Conditional logic based on retry count
  if (metadata.attempt > 2) {
    throw new FatalError('Too many retries');
  }
}
```

---

## Key Constraints

### 1. Regional Deployment
**Requirement**: Apps using WDK MUST deploy to `iad1` (Washington D.C.) region.

```bash
# vercel.json or project settings
{
  "regions": ["iad1"]
}
```

**Impact**:
- High latency for users in Europe, Asia, Australia
- No multi-region support during beta
- No timeline for global availability

### 2. JSON Serialization
All step parameters and return values must be JSON-serializable.

**Supported**:
- Primitives: string, number, boolean, null
- Arrays and plain objects
- JSON-serializable class instances

**NOT supported**:
- Functions
- Symbol properties
- Circular references
- Binary data (use Vercel Blob URLs instead)

### 3. Step Definition Constraints
`'use step'` directive ONLY works on:
- Top-level exported functions
- Named function declarations

**Does NOT work**:
```typescript
// ❌ Arrow function
const myStep = async () => { 'use step'; };

// ❌ Function inside another function
function workflow() {
  'use workflow';

  async function myStep() { 'use step'; }  // Won't work
}

// ❌ Object method
const obj = {
  async myStep() { 'use step'; }  // Won't work
};

// ❌ Class method
class MyClass {
  async myStep() { 'use step'; }  // Won't work
}
```

**Works**:
```typescript
// ✅ Top-level named function
async function myStep() { 'use step'; }

// ✅ Top-level exported function
export async function myStep() { 'use step'; }
```

### 4. Timeouts
- **Default step timeout**: 5 minutes
- **Maximum step timeout**: 800 seconds (13.3 minutes) on Pro plan
- **Free plan limit**: Unknown (not documented)

### 5. Determinism Requirements
Workflow orchestrators must be deterministic for replay:

**Avoid**:
```typescript
export async function myWorkflow() {
  'use workflow';

  // ❌ Non-deterministic
  const random = Math.random();
  const now = new Date();
  const uuid = crypto.randomUUID();
}
```

**Use instead**:
```typescript
export async function myWorkflow(seed: number) {
  'use workflow';

  // ✅ Pass non-deterministic values as parameters
  const result = await stepThatNeedsRandom(seed);
}

async function stepThatNeedsRandom(seed: number) {
  'use step';

  // ✅ Non-determinism inside steps is fine
  const random = Math.random();
  const now = new Date();
  return { random, now };
}
```

### 6. Vercel Blob Integration
```typescript
async function uploadStep(data: Buffer) {
  'use step';

  // ❌ Server upload limited to 4.5 MB
  const blob = await put('data.bin', data, { access: 'public' });

  // ✅ Use multipart for larger files
  const blob = await put('large.bin', data, {
    access: 'public',
    multipart: true  // Required for files > 4.5 MB
  });

  return blob.url;
}
```

---

## Corrections to Original Research

### 1. LlamaParse API Confusion
The original research mentions `output_options.markdown.remove_header_from_markdown`. This is NOT a Vercel WDK configuration but appears to be a LlamaParse API parameter. WDK has no such configuration option.

### 2. AI SDK Tool Pattern Incompatibility
The `'use step'` limitation on arrow functions is **critical** for AI SDK integration:

```typescript
// AI SDK tool pattern (common)
const myTool = tool({
  parameters: z.object({ input: z.string() }),
  execute: async ({ input }) => {  // ❌ Arrow function
    'use step';  // This will NOT work
    return processInput(input);
  }
});
```

**Workaround required**:
```typescript
// Define step separately as top-level function
async function processInputStep(input: string) {
  'use step';
  return processInput(input);
}

const myTool = tool({
  parameters: z.object({ input: z.string() }),
  execute: async ({ input }) => {
    // Call the step function
    return await processInputStep(input);
  }
});
```

### 3. Step Retry Behavior
- **Default retries**: 3 (for a total of 4 attempts: initial + 3 retries)
- **Not infinite**: Steps will fail permanently after max retries
- **Configurable**: Set `myStep.maxRetries = 5` for different behavior

---

## Production Issues

### Critical Reliability Problems

Based on verified web research and community reports:

#### 1. Workflows Stuck in "Pending" State
- Multiple GitHub issues report workflows never transitioning from "pending" to "running"
- Affects production deployments intermittently
- No clear resolution or root cause from Vercel
- **Impact**: Workflows silently fail without error notification

#### 2. Unreliable Observability Dashboard
- Dashboard shows phantom runs that never executed
- Run status inconsistent with actual execution state
- Missing logs for completed steps
- **Impact**: Cannot trust monitoring for production workflows

#### 3. Custom Environments Broken
- Staging and preview environments don't execute steps
- Works in production but not in preview deployments
- Makes testing workflow changes nearly impossible
- **Impact**: Cannot safely test workflow changes before production

#### 4. Regional Constraint
- Backend only in `iad1` region
- High latency for global applications
- No multi-region support timeline
- **Impact**: Poor user experience outside North America

#### 5. Beta Instability
- Still in public beta (launched October 2025)
- No GA date announced
- API breaking changes possible
- **Impact**: Risk of migration work in future updates

---

## Alternative Approaches

### Recommended: Inngest

**Why Inngest**:
- **Production-ready**: GA status with proven reliability
- **Infrastructure-agnostic**: Runs on Vercel, AWS, Kubernetes, self-hosted
- **No regional lock-in**: Global deployment support
- **Clear pricing**: Documented step/execution costs
- **Better DX**: Explicit step IDs enable safe refactoring
- **Enterprise features**: Multi-tenant, custom environments, advanced observability

**Code comparison**:
```typescript
// Inngest
import { inngest } from './inngest';

export const myWorkflow = inngest.createFunction(
  { id: 'my-workflow' },
  { event: 'workflow.trigger' },
  async ({ event, step }) => {
    const result = await step.run('process-data', async () => {
      return processData(event.data.input);
    });

    await step.sleep('5s');

    return await step.run('finalize', async () => {
      return finalizeResult(result);
    });
  }
);
```

**Key differences**:
- Explicit step IDs (safer refactoring)
- No `'use step'` directive limitations
- Works with arrow functions
- Production-grade observability

### Other Alternatives

#### Trigger.dev
- Similar feature set to Inngest
- Strong community support
- Good Next.js integration
- Clear pricing model

#### Temporal
- Self-hosted solution
- Most mature durable execution framework
- Higher operational complexity
- Best for complex orchestration needs

#### Custom Solution
- Use message queues (SQS, RabbitMQ) + job processors
- More control, more implementation work
- Suitable if workflow needs are simple

---

## Sources

### Official Documentation
- Vercel WDK documentation: https://vercel.com/docs/workflow
- Vercel blog announcement: https://vercel.com/blog/vercel-workflow-development-kit
- npm package: https://www.npmjs.com/package/workflow

### Community Research
- GitHub issues on vercel/vercel repository
- Developer discussions on dev.to
- Reddit r/nextjs workflow reliability threads
- Stack Overflow questions on WDK production issues

### Companion Research
- Project research file: `ai/docs/research/2025-02-13-vercel-workflow-wdk.md`

---

## Conclusion

Vercel Workflow Development Kit offers an elegant API design with TypeScript-native directives and tight Next.js integration. However, critical production reliability issues, regional constraints, arrow function limitations, and beta status make it unsuitable for production use as of February 2025.

**Recommendation**: Use Inngest for production workflows requiring durable execution. Inngest offers production-grade reliability, infrastructure flexibility, and no regional lock-in while maintaining a similar developer experience.

**When to consider WDK**: Only for experimental projects or waiting until GA release with demonstrated production stability.
