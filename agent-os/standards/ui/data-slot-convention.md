# data-slot Attribute Convention

Every UI component renders a `data-slot` attribute on its root element.

```tsx
<div data-slot="card" className={cn("...", className)} {...props} />
<div data-slot="card-header" className={cn("...", className)} {...props} />
```

## Why

- **Parent styling hooks**: Parents target children by slot without coupling to internal classes
  ```tsx
  // Card header uses it to style child actions:
  // has-data-[slot=card-action]:grid-cols-[1fr_auto]
  ```
- **Stable API**: Tailwind classes change freely; `data-slot` names are the stable contract

## Naming rules

- **kebab-case**, matching the component name: `Card` → `"card"`, `CardHeader` → `"card-header"`
- Compound names join parent + role: `"form-item"`, `"form-label"`, `"select-trigger"`
- Wrapper components that delegate to Radix still get their own slot: `"dialog"`, `"dialog-content"`

## Targeting slots in CSS/Tailwind

```tsx
// Direct child targeting
"*:data-[slot=select-value]:line-clamp-1"

// Conditional layout based on child presence
"has-data-[slot=card-action]:grid-cols-[1fr_auto]"
```

## Rule

- Every UI component (`components/ui/`) MUST have `data-slot` on its root element
- AI elements (`components/ai-elements/`) do NOT use `data-slot`
