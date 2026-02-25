# Provider Lift Pattern

Complex components default to **self-managed state** but support an optional provider to lift state upward.

```tsx
// Self-managed: PromptInput owns its own state internally
<PromptInput onSubmit={handleSubmit} />

// Lifted: Parent controls state, siblings can read it
<PromptInputProvider initialInput="Hello">
  <Sidebar />           {/* can call useProviderAttachments() */}
  <PromptInput onSubmit={handleSubmit} />
</PromptInputProvider>
```

## Rules

- Without the provider, the component works **fully self-contained**
- With the provider, state is lifted via `createContext` + memoized value objects
- Provider name: `{Component}Provider` (e.g., `PromptInputProvider`)
- Internal state hooks check both local and provider contexts: `const ctx = local ?? provider`
- All context values are wrapped in `useMemo` to prevent unnecessary re-renders
- Callbacks use `useCallback` for referential stability

## Why this pattern

- **Sibling access**: Components outside the main component can read/write shared state
- **Multi-instance sync**: Multiple instances can share one provider
- **Testability**: State lives above the component, easy to mock or control in tests

## Implementation checklist

1. Define context interface (`TextInputContext`, `AttachmentsContext`)
2. Create context with `createContext<T | null>(null)`
3. Build provider component managing `useState` + `useCallback` + `useMemo`
4. Export required hook (`usePromptInputController`) and keep optional variant internal
5. In the component, prefer local context, fall back to provider
