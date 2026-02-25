# Performance Memoization

AI streaming causes rapid updates. Without memoization, each token triggers re-render cascades that hit expensive computations (syntax highlighting, markdown parsing).

## Three memoization layers

### 1. React.memo with custom comparers

```tsx
export const MessageResponse = memo(
  ({ className, ...props }: MessageResponseProps) => (
    <Streamdown className={cn("...", className)} plugins={streamdownPlugins} {...props} />
  ),
  (prev, next) => prev.children === next.children  // shallow check on content only
);
MessageResponse.displayName = "MessageResponse";
```

- Use `memo()` on components that re-render frequently during streaming
- Custom comparer checks **only the props that matter** (usually `children` or `code`)
- Always set `displayName` on memoized components

### 2. Module-level Map caches

```tsx
const highlighterCache = new Map<string, Promise<Highlighter>>();
const tokensCache = new Map<string, TokenizedCode>();
```

- Cache expensive computations (highlighter instances, tokenized output) at module scope
- Key by content hash: `${language}:${code.length}:${start}:${end}`
- Singleton pattern for resources like Shiki highlighters (one per language)

### 3. Subscriber pattern for async updates

```tsx
const subscribers = new Map<string, Set<(result: TokenizedCode) => void>>();
```

- When async work (highlighting) completes, notify all subscribers
- Avoids duplicate async work for the same content
- Components subscribe on mount, unsubscribe on unmount

## Rules

- `useCallback` on all event handlers passed as props
- `useMemo` on all context value objects
- Static objects (plugin configs, status maps) defined **outside** the component
- Never create new object/array literals in render — extract to `useMemo` or module scope
