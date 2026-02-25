# Compound Component Pattern

AI element components use compound composition: a parent container with named sub-components.

```tsx
// Good: Compound (composable, each piece independently styled/omitted)
<Message from="assistant">
  <MessageContent>...</MessageContent>
  <MessageActions>...</MessageActions>
</Message>

// Bad: Monolithic (rigid, hard to customize layout)
<Message from="assistant" content={...} actions={...} />
```

## Rules

- Each sub-component is a **named export** with its own typed props
- Name sub-components as `Parent` + `Role`: `ArtifactHeader`, `ArtifactTitle`, `ArtifactClose`
- Props type follows the same naming: `ArtifactHeaderProps`, `ArtifactTitleProps`
- Every sub-component accepts `className` and spreads `...props` for override flexibility
- Use `cn()` to merge base classes with consumer's `className`

## When to use compound pattern

- Component has **2+ visual sections** (header, content, actions, footer)
- Consumers may **omit or reorder** sections
- Sub-components need **independent styling**

## When NOT to use compound pattern

- **Leaf components** with a single visual element (Shimmer, Spinner)
- Components that are **always rendered as one unit** with no layout variation
