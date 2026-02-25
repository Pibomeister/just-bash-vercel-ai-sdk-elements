# Technology Stack

## Core Framework

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.1.6 | Full-stack React framework with App Router |
| React | 19.2.3 | UI library with Server Components support |
| React DOM | 19.2.3 | DOM rendering for React |
| TypeScript | ^5 | Static type checking in strict mode |

**Rationale**: Next.js 16 with App Router provides file-system routing, React Server Components, streaming SSR, and built-in optimization. React 19 brings improved server-client boundaries and concurrent features. TypeScript strict mode catches type errors at compile time.

## AI and LLM Integration

| Technology | Version | Purpose |
|---|---|---|
| ai (Vercel AI SDK) | 6.0.86 | Streaming AI responses, tool calling, multi-provider abstraction |
| @ai-sdk/openai | 3.0.29 | OpenAI provider adapter for Vercel AI SDK |
| just-bash | 2.9.8 | In-memory virtual filesystem for sandboxed bash execution |
| bash-tool | 1.3.14 | AI SDK tool wrapper for bash command execution |
| tokenlens | 1.3.1 | Token counting and context window management |

**Architecture**: The AI stack follows the Vercel AI SDK pattern where the server defines tools and model configuration, streams responses to the client via server-sent events, and the client renders messages with rich content. The just-bash package provides a sandboxed execution environment with a virtual filesystem, allowing the AI to run shell commands without host system access. tokenlens provides token counting for context window management.

## UI Component Library

| Technology | Version | Purpose |
|---|---|---|
| shadcn/ui (via shadcn CLI) | 3.8.4 | Component scaffolding and code generation |
| radix-ui | 1.4.3 | Accessible, unstyled UI primitives |
| class-variance-authority | 0.7.1 | Component variant management |
| clsx | 2.1.1 | Conditional CSS class construction |
| tailwind-merge | 3.4.0 | Tailwind class deduplication |
| lucide-react | 0.564.0 | Icon library |
| cmdk | 1.1.1 | Command palette component |
| vaul | 1.1.2 | Drawer component |
| sonner | 2.0.7 | Toast notification system |
| embla-carousel-react | 8.6.0 | Carousel component |
| input-otp | 1.4.2 | One-time password input |
| react-day-picker | 9.13.2 | Date picker component |
| react-resizable-panels | 4.x | Resizable panel layout |

**Configuration**: shadcn/ui is configured in `components.json` with the New York style variant, stone base color, and OKLch color format. Components are installed to `components/ui/` and use CSS variables defined in `app/globals.css`. The `cn()` utility in `lib/utils.ts` combines clsx with tailwind-merge for class composition.

## Styling System

| Technology | Version | Purpose |
|---|---|---|
| Tailwind CSS | ^4 | Utility-first CSS framework |
| @tailwindcss/postcss | ^4 | PostCSS integration for Tailwind |
| tw-animate-css | 1.4.0 | Animation utilities for Tailwind |
| next-themes | 0.4.6 | Dark/light mode with system preference detection |

**Color System**: The project uses OKLch color space for perceptually uniform colors. CSS custom properties are defined in `app/globals.css` with separate value sets for light and dark modes. The dark mode is toggled via the `.dark` CSS class applied by next-themes.

**Key CSS Custom Properties**: `--background`, `--foreground`, `--card`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--ring`, `--sidebar-*`, and `--chart-*` color channels.

## Rich Content Rendering

| Technology | Version | Purpose |
|---|---|---|
| streamdown | 2.2.0 | Streaming markdown renderer |
| @streamdown/code | 1.0.2 | Code block plugin for streamdown |
| @streamdown/math | 1.0.2 | Math expression plugin for streamdown |
| @streamdown/mermaid | 1.0.2 | Mermaid diagram plugin for streamdown |
| @streamdown/cjk | 1.0.2 | CJK text support plugin for streamdown |
| shiki | 3.22.0 | Syntax highlighting engine |
| recharts | 2.15.4 | Charting library for data visualization |
| @xyflow/react | 12.10.0 | Node-based flow/graph editor |
| ansi-to-react | 6.2.6 | ANSI escape code rendering in React |
| react-jsx-parser | 2.4.1 | Runtime JSX parsing for previews |

**Rationale**: streamdown provides incremental markdown rendering optimized for streaming AI output. Shiki delivers VS Code-quality syntax highlighting. The @streamdown plugins add support for code blocks, math expressions, Mermaid diagrams, and CJK text within the streaming pipeline.

## Forms and Validation

| Technology | Version | Purpose |
|---|---|---|
| react-hook-form | 7.71.1 | Performant form state management |
| zod | 4.3.6 | Schema-based validation |
| @hookform/resolvers | 5.2.2 | Integration bridge between RHF and Zod |

**Architecture**: Form components in `components/ui/form.tsx` wrap React Hook Form's Controller pattern with accessible label and error message bindings. Zod schemas define validation rules that are resolved through @hookform/resolvers.

## Animation

| Technology | Version | Purpose |
|---|---|---|
| motion | 12.34.0 | Animation library (formerly Framer Motion) |
| @rive-app/react-webgl2 | 4.27.0 | Rive animation runtime for WebGL2 |

## Utilities

| Technology | Version | Purpose |
|---|---|---|
| nanoid | 5.1.6 | Compact unique ID generation |
| date-fns | 4.1.0 | Date manipulation utilities |
| use-stick-to-bottom | 1.1.3 | Auto-scroll to bottom behavior for chat |
| media-chrome | 4.17.2 | Media player UI components |
| @radix-ui/react-use-controllable-state | 1.2.2 | Controlled/uncontrolled state pattern |

## Development Environment

### Requirements

- **Node.js**: Version 20 or later (required by Next.js 16)
- **Package Manager**: pnpm (lockfile present at `pnpm-lock.yaml`)

### Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Start Next.js development server with hot reload |
| `pnpm build` | Create optimized production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Run ESLint for code quality checks |

### Adding Components

New shadcn/ui components are added via the CLI:

```
npx shadcn@latest add <component-name>
```

This scaffolds the component into `components/ui/` with project-specific styling applied.

## TypeScript Configuration

- **Strict Mode**: Enabled (`"strict": true`)
- **Target**: ES2017
- **Module**: ESNext with bundler module resolution
- **JSX**: preserve (handled by Next.js)
- **Path Aliases**: `@/*` maps to `./*` (project root)
- **Incremental Compilation**: Enabled
- **Key Strict Checks**: noUnusedLocals, noUnusedParameters, noFallthroughCasesInSwitch, noUncheckedSideEffectImports

## Build and Deployment

- **Build System**: Next.js built-in compiler (SWC-based)
- **CSS Processing**: PostCSS with @tailwindcss/postcss plugin
- **Static Assets**: Served from `/public` directory
- **Configuration**: `next.config.ts` (minimal, no custom webpack or experimental flags)
- **Deployment Target**: Not yet configured (compatible with Vercel, Node.js server, or static export)

## MCP Server Configuration

Defined in `.mcp.json` at the project root:

- **context7**: Context7 MCP server for library documentation lookup, run via npx with `@anthropic-ai/context7-mcp@latest`
- **sequential-thinking**: Sequential thinking MCP server for structured problem solving, run via npx with `@anthropic-ai/sequential-thinking-mcp@latest`

## Test Framework

No test framework is currently configured. The project has zero test coverage. When a testing strategy is implemented, candidates include:

- Vitest for unit and integration tests (compatible with Vite/Next.js)
- Playwright or Cypress for end-to-end tests
- React Testing Library for component tests
