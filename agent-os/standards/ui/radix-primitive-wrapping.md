# Radix Primitive Wrapping

All interactive UI components wrap Radix UI primitives for built-in accessibility.

```tsx
import { Dialog as DialogPrimitive } from "radix-ui";

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogContent({ className, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Content
      data-slot="dialog-content"
      className={cn("...", className)}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  );
}
```

## Wrapping pattern

1. Import the Radix primitive with `as *Primitive` suffix
2. Wrap **each sub-component** individually (Root, Trigger, Content, etc.)
3. Add `data-slot` to every wrapper
4. Props type: `React.ComponentProps<typeof Primitive.SubComponent>`
5. Destructure `className`, merge with `cn()`, spread `...props`
6. Export all wrappers from the file

## Rules

- **Always prefer Radix** for interactive components — even simple ones. Radix handles ARIA roles, keyboard navigation, and focus management correctly.
- Only use raw HTML elements for purely visual (non-interactive) components
- Use the `Slot` component from Radix for `asChild` pattern (polymorphic rendering)
- Radix import path: `from "radix-ui"` (not `@radix-ui/*`)
