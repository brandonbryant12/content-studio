# Styling

## Golden Principles

1. Radix portaled components: `min-width: var(--radix-*-trigger-width)` -- never use absolute positioning <!-- enforced-by: manual-review -->
2. Semantic color tokens only -- no hardcoded hex/rgb/hsl values <!-- enforced-by: manual-review -->
3. Tailwind utility classes only -- no inline styles <!-- enforced-by: manual-review -->

## Design Tokens (Semantic Colors)

All colors use CSS custom properties for automatic dark mode support.

| Token | Usage |
|-------|-------|
| `--background` / `--foreground` | Page background and primary text |
| `--card` / `--card-foreground` | Card surfaces |
| `--primary` / `--primary-foreground` | Primary actions (buttons, links) |
| `--secondary` / `--secondary-foreground` | Secondary actions |
| `--muted` / `--muted-foreground` | Disabled, placeholder, subtle text |
| `--accent` / `--accent-foreground` | Hover states, highlights |
| `--destructive` / `--destructive-foreground` | Delete, error actions |
| `--success` / `--success-foreground` | Success states |
| `--border` | Borders and dividers |
| `--input` | Form input borders |
| `--ring` | Focus rings |

Use via Tailwind: `bg-primary`, `text-muted-foreground`, `border-destructive`.

## Typography

| Font | Variable | Usage |
|------|----------|-------|
| DM Sans | `--font-sans` | UI elements (default) |
| Source Serif 4 | `--font-serif` | Editorial content, headings |
| JetBrains Mono | `--font-mono` | Code, technical values |

### Type Scale

| Class | Size | Weight | Use |
|-------|------|--------|-----|
| `text-xs` | 12px | 400 | Captions, badges |
| `text-sm` | 14px | 400-500 | Secondary text, labels |
| `text-base` | 16px | 400 | Body text |
| `text-lg` | 18px | 500 | Section headings |
| `text-xl` | 20px | 600 | Page subtitles |
| `text-2xl` | 24px | 600 | Page titles |
| `text-3xl` | 30px | 700 | Hero headings |

## Spacing Scale

Use Tailwind spacing utilities. Preferred values:

| Tailwind | px | Usage |
|----------|-----|-------|
| `1` | 4px | Tight gaps (icon-to-text) |
| `2` | 8px | Inline spacing |
| `3` | 12px | Compact padding |
| `4` | 16px | Standard padding |
| `6` | 24px | Section gaps |
| `8` | 32px | Card padding |
| `12` | 48px | Section spacing |
| `16` | 64px | Page sections |

## Animation Scale

| Duration | Use | Tailwind |
|----------|-----|----------|
| 75ms | Micro (hover color) | `duration-75` |
| 150ms | Fast (button press) | `duration-150` |
| 200ms | Standard (tooltips, dropdowns) | `duration-200` |
| 300ms | Medium (modals, drawers) | `duration-300` |
| 500ms | Slow (page transitions) | `duration-500` |

## Radix UI Portaled Components

Radix Select, DropdownMenu, Popover, and Combobox render in portals. The content panel must match the trigger width:

```tsx
// SelectContent — correct
<SelectContent className="min-w-[var(--radix-select-trigger-width)]">

// PopoverContent — correct
<PopoverContent className="min-w-[var(--radix-popover-trigger-width)]">
```

Available variables per component:

| Component | CSS Variable |
|-----------|-------------|
| Select | `--radix-select-trigger-width` |
| Popover | `--radix-popover-trigger-width` |
| DropdownMenu | `--radix-dropdown-menu-trigger-width` |

## Rules

- File naming: kebab-case (`voice-selector.tsx`, not `VoiceSelector.tsx`) <!-- enforced-by: manual-review -->
- Component library: use `@repo/ui` components (`Button`, `Input`, `Card`, etc.) <!-- enforced-by: manual-review -->
- Dark mode: handled by semantic tokens -- never add manual dark mode classes <!-- enforced-by: manual-review -->
- Responsive: mobile-first (`sm:`, `md:`, `lg:` breakpoints) <!-- enforced-by: manual-review -->
- Focus visible: all interactive elements must show focus ring (`focus-visible:ring-2 ring-ring`) <!-- enforced-by: manual-review -->
