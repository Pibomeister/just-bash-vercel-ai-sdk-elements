# Product Overview

## Project Name

ai-just-bash-rag

## Description

A Next.js application that provides a real-time streaming AI chat interface with sandboxed bash execution capabilities, a rich component library for AI interactions, and advanced content rendering. The project combines Vercel AI SDK with the just-bash virtual filesystem to deliver a safe, interactive environment for AI-driven command execution and retrieval-augmented generation workflows.

## Target Audience

Developers building AI-powered chat applications that require:

- Streaming conversational interfaces with tool-calling support
- Sandboxed command-line execution within a browser environment
- Rich content rendering including code highlighting, math, diagrams, and charts
- A comprehensive, production-ready component library for AI user interfaces

## Core Features

### 1. Real-Time Streaming AI Chat

Server-sent event streaming powered by Vercel AI SDK v6. Supports multi-turn conversations with tool calling, reasoning/thinking token display, and human-in-the-loop tool approval workflows.

### 2. Sandboxed Bash Execution

In-memory virtual filesystem via just-bash and bash-tool. Users and AI agents can execute shell commands safely without access to the host system. Terminal output is rendered with ANSI color support through a dedicated Terminal component.

### 3. PromptBox UI System

A full-featured prompt input system with voice recording, file attachments, model selection, tool toggles, environment variable injection, and attachment tray management. Designed as a compound component with composable sub-elements.

### 4. Rich Content Rendering

- Markdown streaming with streamdown
- Syntax-highlighted code blocks via Shiki
- Mermaid diagram rendering
- Mathematical expression support
- Interactive charts via Recharts
- Node-based flow visualizations via @xyflow/react

### 5. AI Component Library

Over 60 custom components in `components/ai-elements/` covering messages, conversations, agents, artifacts, code blocks, tool interactions, task queues, sandboxes, and more. Each component follows shadcn/ui conventions with CVA variants, data-slot attributes, and Radix UI accessibility primitives.

### 6. Thinking and Reasoning Display

Collapsible reasoning panels that show AI chain-of-thought and thinking tokens, giving users transparency into the model's decision process.

### 7. Subagent Orchestration

Support for orchestrator-worker agent patterns where a primary agent can delegate tasks to specialized subagents, with visual representation of agent hierarchies and task flows.

## Use Cases

- **AI Development Playground**: Prototype and test AI chat applications with streaming, tool use, and bash execution in a self-contained environment.
- **RAG Application Frontend**: Build retrieval-augmented generation interfaces that combine document retrieval with interactive shell commands.
- **Developer Tooling UI**: Create developer-facing tools that wrap command-line workflows in a conversational AI interface.
- **AI Component Showcase**: Use the extensive component library as a reference implementation or starting point for custom AI application UIs.
- **Educational Environments**: Provide safe sandboxed execution for teaching programming concepts through an AI tutor interface.

## Current Status

**Stage**: Foundation / Demo

The project has a fully assembled technology stack and component library. The current state includes:

- **Complete**: Core framework setup (Next.js 16, React 19, TypeScript strict mode)
- **Complete**: UI component library with 50+ shadcn/ui components and 60+ custom AI elements
- **Complete**: Styling system with Tailwind CSS 4, OKLch color variables, dark/light mode
- **Complete**: Form infrastructure with React Hook Form and Zod validation
- **Complete**: MoAI development framework integration
- **In Progress**: Demo pages (PromptBox demo available at `/prompt-box-demo`)
- **Not Started**: Production API routes
- **Not Started**: Production chat implementation wiring AI SDK to a backend provider
- **Not Started**: Test coverage (no test framework configured)
- **Not Started**: Deployment configuration

## Project Metadata

- **Version**: 0.1.0
- **License**: Private
- **Repository**: Single-branch (`main`) with initial commit
