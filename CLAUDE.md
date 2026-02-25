# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

- `pnpm dev` — Start Next.js dev server
- `pnpm build` — Production build
- `pnpm start` — Start production server
- `pnpm lint` — Run ESLint
- `npx shadcn@latest add <component>` — Add a new shadcn/ui component

No test framework is currently configured.

## Architecture

**Next.js 16 App Router** with React 19, TypeScript (strict mode), and Tailwind CSS 4.

### Key directories

- `app/` — Next.js App Router pages and layouts (React Server Components by default)
- `components/ui/` — shadcn/ui component library (New York style, stone base color, OKLch color system)
- `hooks/` — Custom React hooks (e.g., `use-mobile.ts` for 768px breakpoint detection)
- `lib/utils.ts` — `cn()` helper combining `clsx` + `tailwind-merge` for class merging

### UI & Styling

- **shadcn/ui** components built on Radix UI primitives with Tailwind styling and CVA variants
- **Theming** via CSS custom properties in `app/globals.css` with dark mode support (`next-themes`, `.dark` class)
- Components use `data-slot` attributes for styling hooks
- Import path aliases: `@/components`, `@/lib`, `@/hooks`, `@/ui` (→ `components/ui`)

### Forms

- **React Hook Form** with Zod validation via `@hookform/resolvers`
- Form components (`components/ui/form.tsx`) wrap RHF's Controller with accessible label/error bindings

### Conventions

- kebab-case filenames, named exports
- TypeScript `ComponentProps<"element">` pattern for component prop types
- Client components must use `"use client"` directive; default is server components
