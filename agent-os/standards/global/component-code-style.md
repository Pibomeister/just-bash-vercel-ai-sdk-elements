# UI Component Code Style

`components/ui/` and `components/ai-elements/` use **different code styles** intentionally.

## UI Components (`components/ui/`)

```tsx
// Function declarations
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card" className={cn("...", className)} {...props} />
  );
}

// Batch exports at end of file
export { Card, CardHeader, CardTitle, CardContent, CardFooter };
```

- **Function declarations** (not arrow functions)
- **`React.ComponentProps<>`** for props typing (namespaced import)
- **Batch `export { ... }`** at the bottom of the file
- No separate type exports — props types stay internal
- Follows shadcn/ui conventions to make upgrades seamless

## AI Elements (`components/ai-elements/`)

```tsx
// Arrow function with exported type
export type MessageProps = HTMLAttributes<HTMLDivElement> & { from: UIMessage["role"] };

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div className={cn("...", className)} {...props} />
);
```

- **Arrow functions** assigned to `const`
- **Inline `export`** on each component and type
- Props types are **exported** for consumer use
- No `data-slot` attributes

## Why the split

- UI components mirror shadcn/ui style for drop-in upgrades
- AI elements are custom-built and need exported types for integration
