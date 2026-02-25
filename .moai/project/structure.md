# Project Structure

## Directory Tree

```
ai-just-bash-rag/
├── app/                          # Next.js App Router (pages, layouts, styles)
│   ├── layout.tsx                # Root layout with Geist fonts and theme provider
│   ├── page.tsx                  # Home page (placeholder)
│   ├── globals.css               # CSS custom properties, animations, dark mode tokens
│   └── prompt-box-demo/
│       └── page.tsx              # PromptBox component demonstration page
│
├── components/
│   ├── ui/                       # shadcn/ui component library (50+ components)
│   └── ai-elements/              # Custom AI interface components (60+ components)
│
├── hooks/                        # Custom React hooks
│   └── use-mobile.ts             # Mobile breakpoint detection (768px)
│
├── lib/
│   └── utils.ts                  # cn() helper (clsx + tailwind-merge)
│
├── ai/
│   └── docs/
│       └── plans/                # Feature planning documents
│           ├── bash-agent-plan.md
│           └── chat-app-plan.md
│
├── agent-os/
│   └── standards/                # Architectural standards and conventions
│
├── public/                       # Static assets
│
├── .claude/                      # Claude Code configuration
│   ├── agents/                   # MoAI agent definitions
│   ├── commands/                 # Slash commands
│   ├── rules/                    # Project rules
│   └── skills/                   # MoAI skills
│
├── .moai/                        # MoAI development framework state
│   ├── config/                   # Framework configuration
│   ├── specs/                    # SPEC documents
│   ├── memory/                   # Persistent memory
│   ├── reports/                  # Generated reports
│   ├── logs/                     # Execution logs
│   └── project/                  # Project documentation (this directory)
│
├── CLAUDE.md                     # Claude Code instructions
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration (strict mode)
├── next.config.ts                # Next.js configuration
├── components.json               # shadcn/ui configuration
├── .mcp.json                     # MCP server configuration
└── pnpm-lock.yaml                # Lockfile
```

## Key File Locations

### Application Entry Points

- `/app/layout.tsx` -- Root layout. Applies Geist Sans and Geist Mono fonts, wraps children in theme provider for dark/light mode support.
- `/app/page.tsx` -- Home page. Currently a placeholder from Create Next App scaffolding.
- `/app/globals.css` -- Global styles. Defines OKLch CSS custom properties for the color system, animation keyframes, and dark mode variable overrides.

### Configuration Files

- `/package.json` -- Project metadata, scripts (`dev`, `build`, `start`, `lint`), and all runtime/dev dependencies.
- `/tsconfig.json` -- TypeScript in strict mode, ES2017 target, path aliases (`@/*` mapped to `./*`).
- `/next.config.ts` -- Minimal Next.js configuration.
- `/components.json` -- shadcn/ui settings: New York style, stone base color, OKLch color format, CSS variables enabled, path aliases for components, hooks, lib, and UI.
- `/.mcp.json` -- MCP server definitions for context7 and sequential-thinking.

### Utility Files

- `/lib/utils.ts` -- Exports the `cn()` function that combines `clsx` for conditional classes with `tailwind-merge` for deduplication.
- `/hooks/use-mobile.ts` -- Custom hook returning a boolean for viewport widths below 768px.

## Component Taxonomy

### `components/ui/` -- shadcn/ui Library

50+ components built on Radix UI primitives with Tailwind styling and CVA (class-variance-authority) variants. These are general-purpose UI building blocks following the shadcn/ui New York style. Key components include:

- **Layout**: accordion, card, collapsible, resizable, scroll-area, separator, sheet, sidebar, tabs
- **Forms**: button, checkbox, form, input, input-group, input-otp, label, radio-group, select, slider, switch, textarea, toggle, toggle-group
- **Feedback**: alert, badge, progress, skeleton, sonner (toasts), spinner
- **Overlay**: dialog, drawer, dropdown-menu, hover-card, popover, tooltip, context-menu, menubar, navigation-menu
- **Data**: chart, table, pagination
- **Media**: carousel, command (cmdk)

All components use `data-slot` attributes for styling hooks and follow the `ComponentProps<"element">` pattern for prop types.

### `components/ai-elements/` -- Custom AI Components

60+ components organized by functional domain, purpose-built for AI chat application interfaces:

- **Core Messaging**: message (with variants for user, assistant, system, tool), conversation (thread container), persona (AI identity display)
- **Reasoning**: plan (step-by-step display), reasoning (thinking token output), chain-of-thought (collapsible reasoning trace)
- **Content Artifacts**: artifact (rich content container), code-block (Shiki-powered syntax highlighting), image, sources, inline-citation, snippet, schema-display, file-tree, stack-trace, test-results
- **Interactive Controls**: prompt-input, prompt-box (compound component with voice, attachments, tools), tool (tool call display), controls, toolbar, confirmation (approval workflow), task, queue
- **Agent System**: agent (agent identity and status), checkpoint, commit, panel, context, connection, edge, node, sandbox, canvas, web-preview, jsx-preview, audio-player
- **Selectors**: model-selector, mic-selector, voice-selector, environment-variables, package-info, attachment-tray, file-card, image-dialog
- **Effects**: terminal (ANSI output), attachment, shimmer (loading animation), suggestion

## Module Organization Patterns

### File Naming

All files use kebab-case naming. Components export named exports (not default exports).

### Client vs Server Components

Components in `components/` are client components and include the `"use client"` directive. Pages and layouts in `app/` are React Server Components by default unless explicitly marked as client components.

### Path Aliases

The project defines these TypeScript path aliases in `tsconfig.json`:

- `@/*` maps to the project root (`./*`)
- Commonly used as `@/components`, `@/lib`, `@/hooks`
- The `@/ui` alias maps to `components/ui` (configured in `components.json`)

### Standards Documentation

The `agent-os/standards/` directory contains architectural convention documents covering:

- CVA variant patterns
- data-slot convention for styling hooks
- Radix UI wrapping patterns
- OKLch color system usage
- Dark mode implementation
- Form architecture with React Hook Form
- Compound component patterns
- Dual-mode context patterns
- Performance memoization strategies
- Provider-lift pattern
- Component code style
- Prop type conventions
