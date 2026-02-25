# Prop Type Convention

Choose the props base type based on what the component renders.

## When wrapping another component

Use `ComponentProps<typeof WrappedComponent>` — inherits the wrapped component's full API:

```tsx
// Wrapping a library component
export type ToolProps = ComponentProps<typeof Collapsible>;
export type MessageActionProps = ComponentProps<typeof Button> & { tooltip?: string };

// Wrapping another custom component
export type ConversationProps = ComponentProps<typeof StickToBottom>;
```

## When rendering a raw HTML element

Use `HTMLAttributes<HTMLElement>` — directly describes the DOM element:

```tsx
export type MessageProps = HTMLAttributes<HTMLDivElement> & { from: UIMessage["role"] };
export type ArtifactHeaderProps = HTMLAttributes<HTMLDivElement>;
```

## Rules

- Export the props type alongside the component: `export type {Name}Props = ...`
- Props type name: `{ComponentName}Props`
- Always destructure `className` and spread `...props`
- Custom props go in the `& { ... }` intersection
- Prefer `ComponentProps<"div">` over `HTMLAttributes<HTMLDivElement>` for consistency when the distinction doesn't matter
