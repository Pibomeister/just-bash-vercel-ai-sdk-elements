# Form Architecture

Forms use React Hook Form + Zod + shadcn/ui form components.

## Stack

```
Zod schema → @hookform/resolvers → React Hook Form → Form components (shadcn/ui)
```

## Schema co-location

Zod schemas live in the **same file** as the form component that uses them.

```tsx
// components/my-form.tsx
import { z } from "zod";

const formSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

type FormValues = z.infer<typeof formSchema>;
```

## Form component hierarchy

```tsx
<Form {...form}>           {/* = FormProvider from RHF */}
  <FormField
    control={form.control}
    name="email"
    render={({ field }) => (
      <FormItem>             {/* generates unique ID via useId() */}
        <FormLabel />        {/* auto-links to input via htmlFor */}
        <FormControl>        {/* Radix Slot — passes a11y attrs to child */}
          <Input {...field} />
        </FormControl>
        <FormDescription />  {/* linked via aria-describedby */}
        <FormMessage />      {/* auto-displays Zod error messages */}
      </FormItem>
    )}
  />
</Form>
```

## Rules

- Always use `FormControl` around the input — it provides `id`, `aria-describedby`, and `aria-invalid`
- Every `FormField` needs a `FormItem` wrapper for ID generation
- `FormMessage` renders nothing when there's no error (no empty div)
- All form components use `data-slot` attributes for styling hooks
- `data-error` attribute on `FormLabel` enables error-state styling
