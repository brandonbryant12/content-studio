# Styling

This document defines the Modern/Bold design system for Content Studio.

## Design Philosophy

Content Studio uses a **Modern/Bold** aesthetic:

- **Strong colors** with confident contrast
- **Clear typography** hierarchy with purpose
- **Purposeful micro-animations** that provide feedback
- **Premium feel** without being heavy
- **Professional** yet approachable

Avoid generic AI aesthetics. Every design choice should be intentional.

## Color System

### Light Theme

| Token | HSL | Usage |
|-------|-----|-------|
| `--primary` | `225 75% 52%` | Primary actions, links, focus rings |
| `--primary-foreground` | `0 0% 100%` | Text on primary |
| `--background` | `220 15% 98%` | Page background |
| `--foreground` | `220 25% 10%` | Primary text |
| `--card` | `0 0% 100%` | Card backgrounds |
| `--muted` | `220 10% 94%` | Subtle backgrounds |
| `--muted-foreground` | `220 10% 45%` | Secondary text |
| `--border` | `220 15% 88%` | Borders, dividers |
| `--destructive` | `0 70% 55%` | Errors, delete actions |
| `--success` | `152 55% 38%` | Success states |
| `--warning` | `38 90% 50%` | Warnings |
| `--info` | `210 80% 52%` | Informational |

### Dark Theme

| Token | HSL | Usage |
|-------|-----|-------|
| `--primary` | `225 85% 60%` | Electric sapphire (glows) |
| `--background` | `225 15% 5%` | Deep black |
| `--foreground` | `220 10% 95%` | Light text |
| `--card` | `225 12% 8%` | Elevated surfaces |
| `--muted` | `225 10% 14%` | Subtle backgrounds |
| `--muted-foreground` | `220 8% 50%` | Secondary text |
| `--border` | `225 12% 16%` | Borders |

### Semantic Colors

Use semantic tokens for status indicators:

```tsx
// Status badges
<Badge variant="success">Ready</Badge>
<Badge variant="warning">Generating</Badge>
<Badge variant="destructive">Failed</Badge>
<Badge variant="info">Processing</Badge>
```

## Typography

### Font Families

| Font | Usage | Class |
|------|-------|-------|
| DM Sans | UI text (default) | `font-sans` |
| Source Serif 4 | Editorial, headlines | `font-serif` / `font-editorial` |
| JetBrains Mono | Code, technical data | `font-mono` / `font-technical` |

### Type Scale

| Class | Size | Weight | Usage |
|-------|------|--------|-------|
| `text-4xl` | 2.25rem | 700 | Page titles |
| `text-2xl` | 1.5rem | 600 | Section headings |
| `text-xl` | 1.25rem | 600 | Card titles |
| `text-lg` | 1.125rem | 500 | Subheadings |
| `text-base` | 1rem | 400 | Body text |
| `text-sm` | 0.875rem | 400 | Secondary text |
| `text-xs` | 0.75rem | 500 | Labels, badges |

### Typography Patterns

```tsx
// Page title
<h1 className="text-4xl font-bold tracking-tight">Podcasts</h1>

// Section heading
<h2 className="text-2xl font-semibold">Recent Episodes</h2>

// Card title
<h3 className="text-xl font-semibold">Episode Title</h3>

// Body text
<p className="text-base text-foreground">Content here...</p>

// Secondary/meta text
<p className="text-sm text-muted-foreground">Updated 2 hours ago</p>

// Editorial headline (for content-heavy sections)
<h1 className="font-editorial text-4xl font-semibold">The Art of Podcasting</h1>

// Technical/code
<span className="font-technical text-sm">pod_abc123</span>
```

## Spacing

Use Tailwind's spacing scale consistently:

| Spacing | Value | Usage |
|---------|-------|-------|
| `1` | 0.25rem | Tight inline spacing |
| `2` | 0.5rem | Icon gaps, compact lists |
| `3` | 0.75rem | Form field gaps |
| `4` | 1rem | Standard component padding |
| `6` | 1.5rem | Section spacing |
| `8` | 2rem | Card padding |
| `12` | 3rem | Section margins |
| `16` | 4rem | Major section breaks |

### Spacing Patterns

```tsx
// Card padding
<div className="p-6">

// Form field spacing
<div className="space-y-4">

// Button icon gap
<Button><Icon className="mr-2" /> Label</Button>

// Section spacing
<section className="mt-12">
```

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | 0.25rem (4px) | Inputs, small elements |
| `rounded-md` | 0.375rem (6px) | Buttons |
| `rounded-lg` | 0.5rem (8px) | Cards |
| `rounded-xl` | 0.75rem (12px) | Modals, large cards |
| `rounded-full` | 9999px | Pills, avatars |

```tsx
// Standard button
<Button className="rounded-md">

// Card
<Card className="rounded-lg">

// Modal
<Dialog className="rounded-xl">

// Avatar
<Avatar className="rounded-full">
```

## Shadows

| Class | Usage |
|-------|-------|
| `shadow-sm` | Subtle elevation (inputs) |
| `shadow` | Cards at rest |
| `shadow-md` | Cards on hover, dropdowns |
| `shadow-lg` | Modals, popovers |
| `shadow-xl` | Floating elements |

### Shadow Patterns

```tsx
// Card with hover elevation
<div className="shadow transition-shadow hover:shadow-md">

// Modal
<Dialog className="shadow-xl">

// Dropdown
<DropdownContent className="shadow-lg">
```

## Animation

### Duration Tokens

| Duration | Value | Usage |
|----------|-------|-------|
| `duration-75` | 75ms | Micro-interactions (focus rings) |
| `duration-150` | 150ms | Fast transitions (hovers) |
| `duration-200` | 200ms | Standard transitions |
| `duration-300` | 300ms | Larger transitions (modals) |
| `duration-500` | 500ms | Emphasis animations |

### Easing

| Easing | Usage |
|--------|-------|
| `ease-out` | Exit animations, elements leaving |
| `ease-in-out` | Movement, transforms |
| `ease-in` | Rarely used (feels sluggish) |

### Animation Patterns

```tsx
// Hover transition
<Button className="transition-colors duration-150">

// Card hover lift
<Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">

// Modal entrance
<Dialog className="animate-in fade-in-0 zoom-in-95 duration-200">

// Skeleton pulse
<div className="animate-pulse bg-muted">

// Spinner
<Spinner className="animate-spin duration-1000">
```

### Micro-Interactions

Add subtle feedback for user actions:

```tsx
// Button press effect
<Button className="active:scale-[0.98] transition-transform duration-75">

// Checkbox check animation
<Checkbox className="data-[state=checked]:animate-in zoom-in-50 duration-150">

// Toast entrance
<Toast className="animate-in slide-in-from-right-full duration-300">
```

## Component Patterns

### Cards

```tsx
// Standard card
<div className="rounded-lg border bg-card p-6 shadow-sm">

// Interactive card
<div className="rounded-lg border bg-card p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/20 cursor-pointer">

// Selected card
<div className="rounded-lg border-2 border-primary bg-card p-6">
```

### Buttons

```tsx
// Primary action
<Button className="bg-primary text-primary-foreground hover:bg-primary/90">

// Secondary action
<Button variant="secondary" className="bg-secondary hover:bg-secondary/80">

// Ghost (subtle)
<Button variant="ghost" className="hover:bg-accent">

// Destructive
<Button variant="destructive" className="bg-destructive hover:bg-destructive/90">
```

### Empty States

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <Icon className="h-12 w-12 text-muted-foreground/50" />
  <h3 className="mt-4 text-lg font-semibold">No podcasts yet</h3>
  <p className="mt-2 text-sm text-muted-foreground max-w-sm">
    Create your first podcast to get started.
  </p>
  <Button className="mt-6">Create Podcast</Button>
</div>
```

### Loading States

```tsx
// Skeleton text
<div className="h-4 w-3/4 animate-pulse rounded bg-muted" />

// Skeleton card
<div className="rounded-lg border bg-card p-6">
  <div className="h-6 w-1/2 animate-pulse rounded bg-muted" />
  <div className="mt-4 space-y-2">
    <div className="h-4 w-full animate-pulse rounded bg-muted" />
    <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
  </div>
</div>

// Spinner overlay
<div className="absolute inset-0 flex items-center justify-center bg-background/80">
  <Spinner className="h-6 w-6" />
</div>
```

## Escape Hatches

While design tokens should be preferred, escape hatches are acceptable when:

1. **One-off adjustments** that don't warrant a new token
2. **Exact pixel values** for alignment with external content
3. **Responsive breakpoint-specific** tweaks

```tsx
// PREFERRED - use tokens
<div className="p-6 text-sm">

// ACCEPTABLE - escape hatch for specific need
<div className="p-[22px] text-[13px]">  // When 22px is exactly right

// WRONG - arbitrary values without reason
<div className="p-[1.4rem]">  // Just use p-5 or p-6
```

Document escape hatches with comments:

```tsx
// Custom spacing to align with sidebar icon grid
<div className="ml-[52px]">
```

## Dark Mode

Content Studio supports light and dark modes via `next-themes`.

### Implementation

```tsx
// ThemeProvider wraps the app
<ThemeProvider attribute="class" defaultTheme="system">
  {children}
</ThemeProvider>
```

### Dark-Specific Styles

Most styles work automatically via CSS variables. For exceptions:

```tsx
// Different opacity in dark mode
<div className="bg-primary/10 dark:bg-primary/20">

// Different color in dark mode
<Icon className="text-muted-foreground dark:text-muted-foreground/80">
```

## Radix UI Portaled Components

Radix primitives like `Select.Content`, `Popover.Content`, and `DropdownMenu.Content` render through a **Portal** — the dropdown DOM is appended to `<body>`, not nested inside the trigger's parent. This means CSS positioning relative to the trigger's parent (`absolute`, `left-0 right-0`, `top-full`) **will not work**.

### How Radix Handles Positioning

With `position="popper"`, Radix uses Floating UI internally and exposes CSS custom properties on the content element:

| Variable | Description |
|----------|-------------|
| `--radix-select-trigger-width` | Width of the Select trigger |
| `--radix-popover-trigger-width` | Width of the Popover trigger |
| `--radix-dropdown-menu-trigger-width` | Width of the DropdownMenu trigger |

### Correct Pattern

```css
/* WRONG — absolute positioning breaks inside a portal */
.my-dropdown {
  @apply absolute top-full left-0 right-0 mt-1;
}

/* CORRECT — let Radix position, use CSS var for width */
.my-dropdown {
  @apply p-1.5 rounded-lg border border-border bg-popover shadow-lg;
  min-width: var(--radix-select-trigger-width);
}
```

### Key Rules

1. **Never use `absolute`/`top-full`/`left-0 right-0`** on portaled Radix content — there's no positioned ancestor in the portal.
2. **Use `min-width: var(--radix-{component}-trigger-width)`** to match the trigger width.
3. **Use `sideOffset` prop** (not CSS margin) to control gap between trigger and content.
4. **Non-portaled Radix content** (without `<Portal>`) can use relative positioning, but portaled is the default and recommended approach.

## Anti-Patterns

### Generic AI Aesthetics

```tsx
// WRONG - bland, generic
<div className="bg-gray-100 p-4 rounded">
  <h2 className="text-lg">Title</h2>
</div>

// CORRECT - intentional, premium
<div className="bg-card border rounded-lg p-6 shadow-sm">
  <h2 className="text-xl font-semibold tracking-tight">Title</h2>
</div>
```

### Inconsistent Spacing

```tsx
// WRONG - arbitrary values
<div className="p-5 mt-7 mb-3">

// CORRECT - consistent scale
<div className="p-6 mt-8 mb-4">
```

### Missing Transitions

```tsx
// WRONG - jarring state changes
<Button className="hover:bg-primary/90">

// CORRECT - smooth transitions
<Button className="transition-colors duration-150 hover:bg-primary/90">
```

### Overusing Animations

```tsx
// WRONG - everything bounces
<Card className="animate-bounce hover:animate-pulse">

// CORRECT - subtle, purposeful
<Card className="transition-shadow duration-200 hover:shadow-md">
```

### Ignoring Dark Mode

```tsx
// WRONG - hardcoded colors that break in dark mode
<div className="bg-white text-gray-900">

// CORRECT - use semantic tokens
<div className="bg-card text-card-foreground">
```

### Inline Styles

```tsx
// WRONG - inline styles
<div style={{ padding: '24px', marginTop: '16px' }}>

// CORRECT - Tailwind classes
<div className="p-6 mt-4">
```
