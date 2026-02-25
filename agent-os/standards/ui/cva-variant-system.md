# CVA Variant System

Use [class-variance-authority](https://cva.style) for components with **2+ variant axes**.

```tsx
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center ...",  // base classes
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        destructive: "bg-destructive text-white",
        ghost: "hover:bg-accent",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

## Rules

- Use CVA when a component has **2 or more variant dimensions** (e.g., variant + size)
- Single-axis variants: use conditional `cn()` instead
- Name the variants const as `{component}Variants` (e.g., `buttonVariants`, `badgeVariants`)
- Export the variants const alongside the component for reuse
- Always set `defaultVariants` for every axis
- Component props: `React.ComponentProps<"element"> & VariantProps<typeof variants>`
- Apply with `cn(variants({ variant, size, className }))`
- Store `data-variant` and `data-size` on the element for external targeting
