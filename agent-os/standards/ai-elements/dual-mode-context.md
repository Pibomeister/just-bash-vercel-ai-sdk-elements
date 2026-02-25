# Dual-Mode Context Hooks

Context hooks come in two variants: **required** (throws) and **optional** (returns null).

```tsx
// Required — throws if no provider found
export const usePromptInputController = () => {
  const ctx = useContext(PromptInputController);
  if (!ctx) throw new Error("Wrap in <PromptInputProvider>");
  return ctx;
};

// Optional — returns null, never throws
const useOptionalProviderAttachments = () =>
  useContext(ProviderAttachmentsContext);
```

## Rules

- **Default to required hooks** — name as `use{Feature}` (e.g., `useMessageBranch`)
- **Optional variants** — prefix with `useOptional` (e.g., `useOptionalProviderAttachments`)
- Required hooks include a descriptive error message naming the missing provider
- Optional hooks are typically **not exported** (internal to the file)

## When to use optional variant

- Component works **standalone or inside a provider** (dual-mode)
- Fallback logic: `const context = local ?? provider` pattern
- Prototyping components before wiring up the full provider tree

## Common mistake

- Using the required hook in a component that might render outside its provider — causes runtime crash. Check if the component is dual-mode before choosing.
