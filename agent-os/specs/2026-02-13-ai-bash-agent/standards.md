# Applicable Standards

## Component Patterns

- **Compound components**: Tool, Terminal, CodeBlock use provider + composable children pattern
- **Dual-mode context**: PromptInput works with or without PromptInputProvider
- **Performance memoization**: MessageResponse and Reasoning use React.memo with custom comparators

## Code Style

- kebab-case filenames, named exports
- `"use client"` directive for components using hooks
- `ComponentProps<"element">` for extending HTML element props
- `cn()` from `lib/utils` for class merging (clsx + tailwind-merge)

## Dark Mode

- CSS custom properties in OKLch color space
- `.dark` class on root element activates dark theme
- Components use `dark:` Tailwind variants
