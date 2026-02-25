# Custom Animations

CSS keyframe animations are centralized in `globals.css`. Complex Framer Motion (motion) animations live at component level.

## CSS Keyframes (centralized)

```css
/* globals.css */
@keyframes pop-in {
  from { opacity: 0; transform: translateY(4px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.animate-pop-in {
  animation: pop-in 180ms ease-out;
}
```

## Rules

- Define `@keyframes` in `globals.css`
- Create a `.animate-{name}` utility class for each keyframe
- Use CSS custom properties for configurable timing:
  ```css
  .animate-bar-pulse {
    animation: bar-pulse var(--bar-duration, 600ms) ease-in-out infinite;
    animation-delay: var(--bar-delay, 0ms);
  }
  ```
- Naming: `animate-{descriptive-name}` (e.g., `animate-pop-in`, `animate-scale-in-image`)

## When to use which

| Type | Where | Example |
|------|-------|----------|
| Simple CSS transitions | Inline Tailwind (`transition-all`, `hover:scale-105`) | Hover effects |
| Keyframe animations | `globals.css` as `.animate-*` classes | Entry/exit animations |
| Complex orchestrated animations | Component-level Framer Motion (`motion`) | Multi-step sequences, gestures, layout animations |
| Tailwind animate plugin | `tw-animate-css` built-ins (`animate-in`, `fade-in-0`) | Standard enter/exit from Radix |
