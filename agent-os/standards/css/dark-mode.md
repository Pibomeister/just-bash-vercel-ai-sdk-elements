# Dark Mode

Dark mode uses the `.dark` class on `<html>`, toggled by `next-themes`. Media query serves as fallback.

```css
@custom-variant dark (&:is(.dark *), @media (prefers-color-scheme: dark));
```

## How it works

1. `next-themes` adds/removes `.dark` class on `<html>` — **primary mechanism**
2. `prefers-color-scheme: dark` media query — **fallback** before JS loads
3. CSS custom properties in `.dark { }` override `:root` values

## Rules

- Define light theme values in `:root { }`
- Define dark overrides in `.dark { }` using the **same variable names**
- In Tailwind classes, use `dark:` prefix: `dark:bg-input/30`, `dark:hover:bg-input/50`
- Never hardcode colors — always reference semantic variables
- Test both themes when adding new color variables

## Adding a new color

```css
:root {
  --my-feature-color: oklch(0.6 0.2 300);
}
.dark {
  --my-feature-color: oklch(0.75 0.15 300);
}
```

Then bridge to Tailwind in `@theme inline`:
```css
--color-my-feature-color: var(--my-feature-color);
```
