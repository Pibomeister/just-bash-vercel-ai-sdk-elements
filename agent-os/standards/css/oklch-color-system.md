# OKLch Color System

All color values use `oklch()` format. This follows the shadcn/ui default.

```css
:root {
  --primary: oklch(0.216 0.006 56.043);
  --destructive: oklch(0.577 0.245 27.325);
  --muted-foreground: oklch(0.553 0.013 58.071);
}
```

## Rules

- **Never use hex or hsl** — all custom property values must be `oklch(L C H)`
- Semantic variable names: `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`
- Each semantic color has a `-foreground` companion: `--primary` + `--primary-foreground`
- Dark mode overrides go in `.dark { }` selector with the same variable names
- Domain-specific colors use namespaced prefix: `--prompt-box-purple`, `--prompt-box-cyan`

## Color token structure

| Layer | Variables | Purpose |
|-------|----------|----------|
| Base | `--background`, `--foreground` | Page-level colors |
| Surface | `--card`, `--popover` (+ foregrounds) | Elevated surfaces |
| Semantic | `--primary`, `--secondary`, `--muted`, `--accent` | UI intent |
| Feedback | `--destructive` | Error/danger states |
| Interactive | `--border`, `--input`, `--ring` | Form/focus states |
| Sidebar | `--sidebar-*` | Sidebar-specific overrides |
| Domain | `--prompt-box-*` | Feature-specific colors |

## In Tailwind

Colors are bridged via `@theme inline` in `globals.css`:

```css
@theme inline {
  --color-primary: var(--primary);
  --color-destructive: var(--destructive);
}
```

Use as Tailwind classes: `bg-primary`, `text-destructive`, `border-input`
