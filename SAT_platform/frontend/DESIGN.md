# Design System & Guidelines

This document governs all visual and interaction design decisions for the SAT prep platform. Every UI change must follow these principles. When in doubt, optimize for the student experience — fast, focused, and satisfying to use.

> "All those unseen details combine to produce something that's just stunning, like a thousand barely audible voices all singing in tune." — Paul Graham

---

## Core Philosophy

**Taste is trained, not innate.** Good taste is not personal preference — it is a trained instinct. Every detail in this document exists because the aggregate of invisible correctness creates interfaces people love without knowing why.

**Beauty is leverage.** In a world where every SAT prep tool is "good enough," the one that *feels* best wins. Design is not decoration — it is our competitive advantage.

**Unseen details compound.** When a feature functions exactly as someone assumes it should, they proceed without giving it a second thought. That is the goal.

---

## Core Design Principles (in priority order)

### 1. Speed & Efficiency
- **Perceived performance is king.** Every interaction must feel instant. Use skeleton loaders, optimistic updates, and transitions to eliminate dead time.
- A fast-spinning spinner makes the app feel like it loads faster, even when the load time is identical. Perception of speed matters as much as actual speed.
- Target **< 100ms** for UI feedback on any click/tap.
- Lazy-load heavy content (Desmos calculator, KaTeX renders, images). Never block the main thread.
- Prefetch the next likely page. If a student is on question 3 of 10, prefetch question 4.
- No layout shift. Reserve space for async content with fixed-size containers or skeleton placeholders.

### 2. Visual Beauty & Polish
- **Clean, minimal, confident.** Every pixel should feel intentional. No visual clutter.
- **Dense, not airy.** Every visible area must earn its space with useful content or interactive elements. Don't add decorative spacing "for breathing room" — only space that improves readability of dense content (like question text). Tight layouts > generous whitespace.
- Shadows should be subtle and purposeful — use `--shadow-sm` for cards, `--shadow-md` for elevated elements, `--shadow-lg` for modals/popovers only.
- Border radius: `--r-sm` (8px) for buttons/inputs, `--r-md` (12px) for cards, `--r-lg` (16px) for modals/large containers.
- Color usage: green is the primary action color. Use it sparingly for CTAs and active states. Most of the UI should be neutral grays with strategic green accents.
- Typography: use font weight contrast (400 for body, 500 for labels, 600 for headings, 700 for hero text) instead of size contrast where possible.
- Dark mode must be a first-class citizen, not an afterthought. Every component must look good in both themes.

### 3. Interactivity & Delight
- **Everything the student touches should respond.** Hover states, active states, focus rings — no dead-feeling elements. No static text blocks where an interactive element could live.
- Use micro-animations for state changes: answer selection, correct/incorrect feedback, progress bar fills, score reveals.
- Prefer interactive patterns: hover reveals for extra info, expandable sections over separate pages, inline editing over modals, clickable stats that drill down, tooltips that show context on demand.
- Celebrate wins. When a student gets a question right, make it feel good (green flash, subtle confetti on streaks, score animations). Keep it tasteful — never annoying.
- Add keyboard navigation support everywhere. Power users (and accessibility) depend on it.

### 4. Consistency & Predictability
- Same action, same visual treatment, everywhere. A primary button looks identical on every page.
- Navigation should never surprise the student. Current page is always clearly indicated in the sidebar.
- Error states use red (`--red-400`/`--red-500`), success uses green (`--green-400`/`--green-500`), info uses blue (`--blue-400`/`--blue-500`), warnings use gold (`--gold-400`/`--gold-500`).
- Toast notifications for async feedback. Never use `alert()`.

### 5. Accessibility
- Minimum contrast ratio: 4.5:1 for body text, 3:1 for large text and UI elements.
- Focus rings must be visible. Use `outline: 2px solid var(--border-focus); outline-offset: 2px`.
- All interactive elements must be reachable via keyboard (Tab, Enter, Escape, Arrow keys).
- Use semantic HTML: `<button>` for actions, `<a>` for navigation, `<input>` for data entry. No `<div onClick>`.
- Screen reader support: `aria-label` on icon-only buttons, `aria-live` on dynamic content regions.
- Gate hover animations behind `@media (hover: hover) and (pointer: fine)` — touch devices trigger hover on tap, causing false positives.

---

## Design Tokens

All colors, spacing, shadows, and radii are defined as CSS custom properties in `globals.css`. Never use raw hex values or Tailwind color utilities directly — always reference the design tokens.

### Color Palette
| Token | Usage |
|-------|-------|
| `--green-500` / `--green-600` | Primary action, CTAs, active states |
| `--gold-400` / `--gold-500` | Gamification, streaks, achievements, XP |
| `--gray-*` | All neutral UI: backgrounds, text, borders |
| `--red-*` | Errors, incorrect answers, destructive actions |
| `--blue-*` | Info, links, secondary accents |
| `--purple-*` | Premium features, AI tutor elements |

### Semantic Aliases
Always use semantic aliases over raw scale values:
- `--bg`, `--bg-card`, `--bg-card-hover` for backgrounds
- `--text-1` (primary), `--text-2` (secondary), `--text-3` (muted) for text
- `--border`, `--border-focus` for borders
- `--shadow-xs` through `--shadow-lg` for elevation

---

## Animation System (Emil Kowalski Philosophy)

### The Animation Decision Framework

Before writing any animation, answer these questions in order:

#### 1. Should this animate at all?

| Frequency | Decision |
|-----------|----------|
| 100+ times/day (keyboard shortcuts, command palette) | **No animation. Ever.** |
| Tens of times/day (hover effects, list navigation) | Remove or drastically reduce |
| Occasional (modals, drawers, toasts) | Standard animation |
| Rare/first-time (onboarding, celebrations) | Can add delight |

**Never animate keyboard-initiated actions.** They are repeated hundreds of times daily. Animation makes them feel slow.

#### 2. What easing should it use?

**Critical: use custom easing curves.** The built-in CSS easings are too weak. They lack the punch that makes animations feel intentional.

```css
:root {
  /* Strong ease-out for UI interactions (entering elements) */
  --ease: cubic-bezier(0.23, 1, 0.32, 1);

  /* Strong ease-in-out for on-screen movement/morphing */
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);

  /* iOS-like drawer curve */
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
}
```

**Decision tree:**
- Element entering or exiting? → `ease-out` (starts fast, feels responsive)
- Moving/morphing on screen? → `ease-in-out` (natural acceleration/deceleration)
- Hover/color change? → `ease`
- Constant motion (progress bar, marquee)? → `linear`
- Default? → `ease-out`

**Never use `ease-in` for UI animations.** It starts slow, which makes the interface feel sluggish. A dropdown with `ease-in` at 300ms *feels* slower than `ease-out` at the same duration.

#### 3. How fast should it be?

| Element | Duration |
|---------|----------|
| Button press feedback | 100–160ms |
| Tooltips, small popovers | 125–200ms |
| Dropdowns, selects | 150–250ms |
| Modals, drawers | 200–500ms |

**Rule: UI animations must stay under 300ms.** Anything longer feels sluggish.

#### 4. Asymmetric enter/exit timing

Pressing should be slow when deliberate (hold-to-delete: 2s linear), but release should always be snappy (200ms ease-out). Slow where the user is deciding, fast where the system is responding.

### Animation Rules

1. **Never animate from `scale(0)`.** Nothing in the real world disappears and reappears completely. Start from `scale(0.95)` with `opacity: 0`.

2. **Never use `transition: all`.** Specify exact properties: `transition: transform 200ms ease-out, opacity 200ms ease-out`. `all` triggers unnecessary recalculations and can animate properties you didn't intend.

3. **Only animate `transform` and `opacity`.** These skip layout and paint, running on the GPU. Animating `padding`, `margin`, `height`, or `width` triggers expensive reflows.

4. **Use CSS transitions over keyframes for interruptible UI.** CSS transitions can be interrupted and retargeted mid-animation. Keyframes restart from zero. For toasts, toggles, or any rapidly-triggered element, transitions produce smoother results.

5. **Use CSS animations over JS under load.** CSS animations run off the main thread. When the browser is busy, JS animations (`requestAnimationFrame`) drop frames. Use CSS for predetermined animations; JS for dynamic, interruptible ones.

6. **Stagger list entrances.** When multiple elements enter together, stagger by 30–80ms between items. Keep delays short — long delays make the interface feel slow. Never block interaction while stagger animations play.

7. **Make popovers origin-aware.** Popovers should scale from their trigger, not from center. **Exception: modals** — they stay `transform-origin: center` because they aren't anchored to a trigger.

8. **Tooltips: skip delay on subsequent hovers.** Once one tooltip is open, hovering over adjacent elements should open their tooltip instantly with no animation.

9. **Buttons must feel responsive.** Add `transform: scale(0.97)` on `:active`. This gives instant press feedback.
   ```css
   .button {
     transition: transform 160ms ease-out;
   }
   .button:active {
     transform: scale(0.97);
   }
   ```

10. **Respect `prefers-reduced-motion`.** Reduced motion means fewer and gentler animations, not zero. Keep opacity and color transitions. Remove movement and position animations.
    ```css
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
      }
    }
    ```

### Advanced Techniques

#### Use blur to mask imperfect transitions
When a crossfade between two states feels off, add subtle `filter: blur(2px)` during the transition. Keep blur under 20px — heavy blur is expensive, especially in Safari.

#### `clip-path` for reveal animations
`clip-path: inset()` is hardware-accelerated and perfect for progress fills, image reveals, and comparison sliders.

#### `@starting-style` for CSS-only entry animations
The modern CSS way to animate element entry without JavaScript:
```css
.toast {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 400ms ease, transform 400ms ease;
  @starting-style {
    opacity: 0;
    transform: translateY(100%);
  }
}
```

#### Web Animations API (WAAPI) for programmatic CSS animations
JavaScript control with CSS performance. Hardware-accelerated, interruptible, no library needed.
```js
element.animate(
  [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }],
  { duration: 1000, fill: 'forwards', easing: 'cubic-bezier(0.77, 0, 0.175, 1)' }
);
```

### Performance Gotchas

- **Avoid animating CSS variables on parents.** Changing a CSS variable recalculates styles for all children. Update `transform` directly on the element instead.
- **Framer Motion `x`/`y` shorthand is NOT hardware-accelerated.** Use `transform: "translateX(100px)"` for GPU acceleration.
- **`translateY(100%)` uses the element's own height.** Use percentage-based translates instead of hardcoded pixel values — they adapt to content.

---

## Component Standards

### Buttons
- **Primary**: Green background (`--green-600`), white text, hover darkens slightly. Use for the single most important action on screen.
- **Secondary**: Transparent with green border, green text. Use for secondary actions.
- **Ghost**: No border, subtle hover background. Use for tertiary/cancel actions.
- All buttons: `border-radius: var(--r-sm)`, `padding: 10px 20px`, `font-weight: 600`, `cursor: pointer`.
- `:active` state: `transform: scale(0.97)` with `transition: transform 160ms ease-out`.
- Disabled state: `opacity: 0.5`, `cursor: not-allowed`, no hover effect.
- Loading state: replace text with a small spinner, maintain button width to prevent layout shift.

### Cards
- `background: var(--bg-card)`, `border: 1px solid var(--border)`, `border-radius: var(--r-md)`, `box-shadow: var(--shadow-sm)`.
- Hover (if clickable): `background: var(--bg-card-hover)`, `box-shadow: var(--shadow-md)`, `transform: translateY(-1px)`.
- Transition: `transition: transform var(--dur) var(--ease), box-shadow var(--dur) var(--ease)` — never `transition: all`.

### Inputs & Forms
- `background: var(--bg-input)`, `border: 1px solid var(--border)`, `border-radius: var(--r-sm)`.
- Focus: `border-color: var(--border-focus)`, `box-shadow: 0 0 0 3px rgba(62, 192, 127, 0.15)`.
- Labels above inputs, not inside (placeholder-as-label is an anti-pattern).
- Validation errors shown below the input in `--red-500` with a small icon.

### Navigation (Sidebar)
- Dark green background (`--bg-sidebar`), white text.
- Active item: `--bg-sidebar-active` background, white text, left border accent.
- Hover: `--bg-sidebar-hover` background.
- Collapse on mobile to a hamburger menu or bottom tab bar.

### Modals & Dialogs
- Backdrop: `rgba(0, 0, 0, 0.5)` with `backdrop-filter: blur(4px)`.
- Content: `border-radius: var(--r-lg)`, `box-shadow: var(--shadow-lg)`, `transform-origin: center`.
- Animate in from `scale(0.95)` + `opacity: 0` — never from `scale(0)`.
- Always dismissible via Escape key and backdrop click.

---

## Layout Rules

### Spacing Scale (Dense-First)
Favor the tighter end of the scale. Only use large gaps where content density demands separation for readability.
- `gap-1` / `p-1` (4px): tight internal spacing (icon + label)
- `gap-2` / `p-2` (8px): related element groups, card internal padding minimum
- `gap-3` / `p-3` (12px): standard card padding
- `gap-4` / `p-4` (16px): section separation within a page
- `gap-6` / `p-6` (24px): major section breaks
- `gap-8` / `p-8` (32px): page-level vertical rhythm (use sparingly)

### Responsive Breakpoints
- Mobile-first. Default styles target phones (< 640px).
- `sm:` (640px+): larger phones, small tablets.
- `md:` (768px+): tablets. Sidebar becomes visible.
- `lg:` (1024px+): laptops. Full layout with sidebar.
- `xl:` (1280px+): large screens. Max content width kicks in.
- Max content width: `max-w-7xl` (80rem) centered. Never let content stretch full-width on ultrawide monitors.

### Grid & Flex Patterns
- Dashboard cards: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- Form layouts: single column, `max-w-md` centered
- Practice session: full viewport height, no scroll on the question area if possible
- Split pane (RW questions): CSS Grid with `grid-template-columns` and draggable divider

---

## Page-Specific Guidelines

### Practice Session
- This is the most critical page. Optimize everything here.
- Question text must be readable without squinting: `text-lg` minimum, `leading-relaxed`.
- Answer options: large click targets (min 48px height), clear hover/selected/correct/incorrect states with `scale(0.97)` press feedback.
- Timer (if present): unobtrusive, top-right, doesn't distract from the question.
- Progress indicator: thin bar at top or numbered dots. Minimal visual weight.

### Dashboard
- Show the most actionable info first: "Continue where you left off" > stats > leaderboard teaser.
- Stats cards should use the `countUp` animation on first load with staggered entrance (50ms between cards).
- Keep it scannable. A student should understand their status in < 3 seconds.

### Landing Page
- Hero section: bold headline, single CTA, no clutter.
- Social proof / stats if available.
- Fast path to registration — minimize friction.

---

## Component Library & Dependencies

### Currently Installed
- **Tailwind CSS v4** — utility-first styling
- **KaTeX** — math rendering
- **Plus Jakarta Sans** — primary typeface
- **Heroicons / custom SVG** — icon system

### Approved for Installation
*(List component libraries here after reviewing the websites the user provides)*

---

## Review Checklist

When reviewing UI code, check for these issues:

| Issue | Fix |
|-------|-----|
| `transition: all` | Specify exact properties: `transition: transform 200ms ease-out` |
| `scale(0)` entry animation | Start from `scale(0.95)` with `opacity: 0` |
| `ease-in` on UI element | Switch to `ease-out` or custom curve |
| `transform-origin: center` on popover | Set to trigger location (modals are exempt) |
| Animation on keyboard action | Remove animation entirely |
| Duration > 300ms on UI element | Reduce to 150–250ms |
| Hover animation without media query | Add `@media (hover: hover) and (pointer: fine)` |
| Keyframes on rapidly-triggered element | Use CSS transitions for interruptibility |
| Framer Motion `x`/`y` props under load | Use `transform: "translateX()"` for hardware acceleration |
| Same enter/exit transition speed | Make exit faster than enter |
| Elements all appear at once | Add stagger delay (30–80ms between items) |
| No `:active` state on button | Add `transform: scale(0.97)` on `:active` |
| Raw hex colors inline | Use CSS custom properties from design tokens |
| `<div onClick>` | Use `<button>` for actions, `<a>` for navigation |

---

## Anti-Patterns (Never Do These)

1. **No raw colors.** Never write `#0F6B3A` inline — use `var(--green-600)`.
2. **No `!important`.** Fix specificity issues properly.
3. **No pixel values for spacing.** Use Tailwind utilities or CSS custom properties.
4. **No layout-breaking hover effects.** Hover should never cause content to reflow.
5. **No unstyled scrollbars** in visible areas. Style them or use `overflow: hidden` with a custom scroll solution.
6. **No orphaned styles.** If you remove a component, remove its styles.
7. **No text walls.** Break long content into scannable chunks with headings, bullets, or cards.
8. **No `div` soup.** Use semantic elements. If you need more than 3 levels of nested `div`, rethink the structure.
9. **No inconsistent loading states.** Every async operation shows a skeleton or spinner.
10. **No disabled buttons without explanation.** If a button is disabled, show a tooltip or helper text explaining why.
11. **No `transition: all`.** Always specify exact properties.
12. **No `ease-in` on UI elements.** Use `ease-out` or custom curves.
13. **No animations from `scale(0)`.** Start from `scale(0.95)` minimum.
14. **No hover-only states on touch devices.** Gate behind `@media (hover: hover) and (pointer: fine)`.

---

## Debugging Animations

- **Slow motion testing:** Temporarily increase duration to 2–5x normal, or use Chrome DevTools animation inspector.
- **Frame-by-frame:** Use Chrome DevTools Animations panel to step through and spot timing issues between coordinated properties.
- **Review the next day:** Review animations with fresh eyes. You notice imperfections the next day that you missed during development.
- **Test on real devices:** For touch interactions, test on physical devices. Simulators don't capture gesture feel accurately.

---

## Design Skills Reference

### Style Split
- **Functional pages** (practice, dashboard, progress, AI tutor, profile): **minimalist-ui** — dense, clean, editorial. The UI disappears so students focus on content.
- **Marketing pages** (landing, pricing, onboarding): **high-end-visual-design** — premium, striking, conversion-optimized.

### Installed Design Skills
| Skill | When to Use |
|-------|-------------|
| `/redesign-existing-projects` | First step — audit what's wrong with a page |
| `/impeccable` | Broad UX audit (hierarchy, cognitive load, spacing, a11y) |
| `/emil-design-eng` | Animation & interaction implementation |
| `/design-taste-frontend` | Component architecture & CSS engineering |
| `/full-output-enforcement` | Force complete code output, no placeholders |
| `/imagegen-frontend-web` | Generate visual direction before coding |
| `/image-to-code` | Convert a screenshot/design into code |
| `/minimalist-ui` | Clean editorial style for functional pages |
| `/high-end-visual-design` | Premium style for landing/marketing pages |
| `/brandkit` | Brand identity & visual guidelines |
| `/stitch-design-taste` | Unify inconsistent pages into cohesive design |
| `/gpt-taste` | General design taste second opinion |
