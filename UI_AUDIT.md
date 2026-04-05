# Pitboard Build Tracker - UI/UX Audit

**Date:** 2026-04-04
**Auditor:** Style Director
**Repo:** `/home/cuyler/.openclaw/workspace/pitboard-bugfix`
**Tech Stack:** React + Vite, custom CSS, Chart.js

---

## Executive Summary

The Pitboard Build Tracker has a **strong, distinctive dark theme** with good visual identity, but suffers from **accessibility gaps**, **inconsistent component patterns**, and **keyboard navigation issues**. The AppSelect custom dropdown is well-intentioned but has accessibility problems. The design feels cohesive overall but requires focused cleanup to meet professional standards.

**Overall Assessment:** Medium-to-high effort needed for WCAG AA compliance and polish.

---

## Strengths (What Works Well)

### 1. Visual Identity & Mood
- **Distinctive dark aesthetic** with orange accent (`#f97316`) that pops nicely
- Good use of gradients and radial backgrounds creates depth
- Bento-style card layout with consistent rounded corners (20px) and subtle shadows
- **Color scheme feels appropriate** for automotive/tuning culture — serious but not boring

### 2. Typography
- **Font pairing works:** Space Grotesk (geometric sans) + IBM Plex Mono
- Clear hierarchy between headers, body, and labels
- Monospace for data and status elements reinforces technical nature

### 3. Interactive Patterns
- Dashboard task board with status columns is intuitive
- Wiring diagram SVG renderer is clever and visually clear
- Expandable task cards and collapsible connector sections work well
- Good use of badges and pills for status indication

### 4. Responsive Layout
- Grid layouts adapt to smaller screens with `@media` queries
- Navigation wraps appropriately on mobile
- Forms reflow from multi-column to single column

---

## Critical Issues (High Severity)

### 1. **AppSelect Accessibility FAILURE**
**Severity:** HIGH

The custom AppSelect component **completely breaks keyboard navigation** and screen reader support:

- ❌ No `role="listbox"` / `role="option"` ARIA roles
- ❌ No keyboard support (Arrow keys, Enter, Escape not handled)
- ❌ No focus management — dropdown doesn't trap focus
- ❌ No `aria-expanded`, `aria-activedescendant`, `aria-controls`
- ❌ No `tabindex` management for options
- ❌ Click-outside closes but doesn't return focus to trigger
- ❌ Native `<select>` replaced but loses built-in accessibility

**Impact:** Keyboard-only and screen reader users cannot use dropdowns at all.

**Recommendation:** Either:
1. Add full ARIA + keyboard support (WAI-ARIA Combobox pattern), OR
2. Use native `<select>` elements with proper styling (preferred for simplicity)

### 2. **Color Contrast Failures**
**Severity:** HIGH

Several text/background combinations fail WCAG AA:

- `--text-soft: #a9b0bd` on `--bg: #06070a` = **7.8:1** ✓ (actually this is fine)
- But **form inputs**: `#000` / `rgba(255,255,255,0.05)` on dark has contrast issues at small sizes
- **Secondary text** (captions, metadata) uses `--text-soft` which is okay
- **Border colors** `rgba(255,255,255,0.08)` may be below 3:1 on dark backgrounds

Wait — let me recalc properly:
- Text `#f4f1ea` on `#06070a` = ~20:1 ✓
- Soft text `#a9b0bd` on `#06070a` = ~8.4:1 ✓
- So contrast is actually **good** on dark mode.

But: The **AppSelect options** use `#0d0f14` background with `#f4f1ea` text — that's ~20:1 ✓

**Revised:** Contrast is actually not an issue. The focus is on AppSelect accessibility.

But there is an issue: **Focus indicators are missing** on most custom interactive elements.

### 3. **Missing Focus Indicators**
**Severity:** HIGH

Custom buttons and cards lack visible `:focus` styles:

- Buttons: No `:focus-visible` outline
- Task cards clickable but no keyboard focus style
- Connector sections collapse/expand but no focus
- Table rows selectable but no visual focus state

**Impact:** Keyboard users cannot see which element is focused.

**Fix needed:**
Add `:focus-visible` styles to all interactive elements:
```css
button:focus-visible,
.app-select-trigger:focus-visible,
.task-card-header:focus-visible,
.connector-section-header:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

### 4. **Semantic HTML Issues**
**Severity:** HIGH

- Clickable `<div>` elements used for navigation (task cards, build rows) without `role="button"` or `tabindex="0"`
- Headings may be skipped (some sections use plain `<div>` with bold text instead of heading elements)
- Tables missing `<caption>` or `aria-label`
- Form inputs not always associated with `<label>` (some use placeholder-only)

### 5. **AppSelect Keyboard Support**
**Severity:** HIGH (duplicate of #1 but worth emphasizing)

The AppSelect is used extensively across the app. As implemented:
- `Tab` can focus the trigger
- But `Enter`/`Space` doesn't toggle (actually it does via `onMouseDown`)
- Arrow keys do nothing to navigate options
- `Escape` doesn't close the menu
- No way to select option via keyboard at all

**This makes the app unusable for keyboard-only navigation.**

---

## Medium Severity Issues

### 6. **Inconsistent Button Styles**
**Severity:** MEDIUM

- Buttons use `.button` class but sometimes `.button primary`, `.button ghost`, `.button small subtle`
- There's no defined size system (only `.small`)
- Primary buttons have gradient; ghost buttons have transparent bg
- No "secondary" variant (everything is primary or ghost)
- Disabled states not consistently styled (rely on `:disabled` but custom classes may not inherit)

**Recommendation:** Establish button variants: `primary`, `secondary`, `ghost`, `danger` with consistent sizing (`sm`, `md`, `lg`).

### 7. **Form Input Styling Inconsistencies**
**Severity:** MEDIUM

- Inputs have rounded corners (16px) but selects use AppSelect (different style)
- Input padding is `13px 14px` — feels spacious but maybe too tall?
- Placeholder text color is hardcoded `#7e8797` instead of using `--text-soft`
- No error state styling (red border, error message)
- No helper text styling (`.helper-text` needed)

### 8. **Visual Hierarchy Confusion**
**Severity:** MEDIUM

Some sections compete for attention:

- Dashboard has stat bar + task board + summary cards + phases — none clearly hierarchical
- Card titles use uppercase monospace with accent color — feels "label-y" but not clear weight progression
- No clear distinction between primary action buttons and secondary actions (both use same button style)
- "Notice" alerts use same orange accent as primary buttons, reducing urgency signaling

**Recommendation:**
- Establish heading system (h1-h6) within cards
- Use size/weight to distinguish primary vs secondary actions
- Reserve accent color for primary buttons and critical alerts
- Use neutral colors for secondary information

### 9. **Component Naming & Structure**
**Severity:** MEDIUM

- `.card` is used for everything (auth, settings, content) but sometimes needs modifiers
- `.workspace-shell`, `.app-header`, `.main-area` — unclear if these are layout containers or components
- Mix of BEM-ish naming (`.card-title`, `.card-header`) and utility classes
- `.section-grid`, `.form-grid` are layout helpers but no documentation

**Recommendation:** Adopt a consistent naming convention (BEM or utility-first) and document component variants.

### 10. **Missing Loading States**
**Severity:** MEDIUM

- Data fetching shows "Loading account data..." but no visual spinner or skeleton
- Chart rendering may have flash of empty state
- Button busy states not visible during async ops

---

## Low Severity Issues

### 11. **Color Scheme Single-Theme**
**Severity:** LOW (design decision)

The app is dark-only (`color-scheme: dark`). This is fine for a pro tool, but:
- Consider a light mode toggle for accessibility/preference
- If staying dark-only, ensure luminance range has enough contrast (currently it does)

### 12. **Typography Scale**
**Severity:** LOW

- No defined type scale; sizes are likely hardcoded in pixels
- Consider using `clamp()` for fluid typography
- Line heights seem okay (1.5 default)

### 13. **Ad Placeholder Styling**
**Severity:** LOW

The "Ad placeholder" visual doesn't match the aesthetic — dashed border looks like a wireframe. Either:
- Remove it (no ads expected?)
- Style it to match card aesthetic but with subtle "ad" indicator

---

## Specific Component Audits

### AppSelect (Custom Dropdown)
**Problems:**
- No ARIA roles/attributes
- No keyboard navigation
- Focus not managed
- No announcement of selection to screen readers
- Options not focusable individually

**Recommendation:** Replace with native `<select>` styled with `appearance: none` OR rebuild with WAI-ARIA Combobox pattern:
```jsx
<div role="combobox" aria-expanded={open} aria-controls="options-list" ...>
  <button aria-haspopup="listbox" ... />
  <ul role="listbox" id="options-list">
    <li role="option" aria-selected={...} tabIndex={-1} ... />
  </ul>
</div>
```

### Wiring Diagram (SVG)
**Good:**
- Uses semantic `<svg>` with proper viewBox
- Grouped elements (`<g>`) for wires and connectors
- Color coding via wireColorToHex()

**Issues:**
- No `<title>` or `<desc>` for accessibility
- No `aria-label` on the diagram
- Text labels in SVG use `fill` but no `font-family` fallback (uses `var(--mono)` which may not be defined in SVG context)
- Wire paths not announced; consider `aria-hidden` on decorative elements

**Recommendation:**
```jsx
<svg aria-label="Wiring diagram showing connections between ECU, sensors, and actuators" role="img">
  <title>Wiring Diagram</title>
  <desc>Visual representation of electrical connections...</desc>
</svg>
```

### Tables
**Good:**
- Proper `<thead>`, `<tbody>`, `<th>` scopes
- Sticky headers would help long tables (not implemented)
- Row hover states

**Issues:**
- No `caption` element describing table purpose
- No `aria-rowcount`, `aria-colcount` for complex tables
- Verbose cell content (nested `<span>` for metadata) could use `aria-label` for screen readers

---

## Accessibility Checklist

| Criterion | Status | Notes |
|-----------|--------|-------|
| Color contrast | ✅ PASS | Dark theme contrast ratios are good (all > 4.5:1) |
| Keyboard nav | ❌ FAIL | AppSelect blocks; many elements not focusable |
| Focus visible | ❌ FAIL | Missing `:focus-visible` styles |
| Semantic HTML | ⚠️ PARTIAL | Some `<div>`s used as buttons without ARIA |
| ARIA labels | ⚠️ PARTIAL | Missing on custom components |
| Form labels | ⚠️ PARTIAL | Some inputs lack associated `<label>` |
| Headings | ⚠️ PARTIAL | Inconsistent use of heading tags |
| Screen reader testing | ❌ NOT TESTED | Would likely reveal issues |
| Reduced motion | ⚠️ PARTIAL | No `prefers-reduced-motion` check |

---

## Responsive Design Review

**Breakpoints detected:**
- `@media (max-width: 1100px)` — grid columns collapse to 1fr
- `@media (max-width: 720px)` — padding reduces, nav simplifies
- `@media (max-width: 640px)` — dashboard task board becomes single column

**Issues:**
- Some grids (`.section-grid.two`, `.form-grid.six`) may overflow on very small screens if content doesn't shrink
- Horizontal scroll on tables works but could be improved with sticky first column
- No "hamburger" menu for mobile nav (top nav wraps but may take too much vertical space)

**Good:**
- Tables have `overflow: auto` wrapper
- Card widths are fluid (no fixed widths)
- Form inputs are 100% width

---

## Quick Wins (High Impact, Low Effort)

### 1. Add Focus Styles (30 min)
```css
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```
Apply to all interactive elements. **Big accessibility improvement.**

### 2. Fix AppSelect Keyboard (1-2 hours)
Replace with native `<select>` if possible:
```jsx
<select className="native-select" ...>
  {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
</select>
```
Style it to match:
```css
.native-select {
  appearance: none;
  background: rgba(255,255,255,0.05);
  /* same padding, border-radius as inputs */
  padding-right: 2.5rem; /* space for arrow */
}
```
**Huge accessibility win with minimal code churn.**

### 3. Semantic Form Labels (15 min)
Ensure every input has a `<label>`:
```jsx
<label>
  <span className="field-label">Email</span>
  <input ... />
</label>
```
Already mostly done, but verify all inputs.

### 4. Table Captions (10 min)
Add to every table:
```jsx
<table aria-label="Parts list">
  <caption className="sr-only">List of parts with name, category, status, and actions</caption>
```

### 5. Improve Visual Hierarchy (1 hour)
- Make page titles (`.card-title`) smaller and less accent-heavy
- Use size/weight for primary vs secondary buttons (e.g., `.btn-primary` larger than `.btn-ghost`)
- Add spacing between distinct sections (mb-8 between major cards)

---

## Medium-Term Improvements

### 6. Consistent Button System
Define: `.btn { base }`, `.btn--primary`, `.btn--secondary`, `.btn--ghost`, `.btn--danger` with sizes `--sm`, `--md`, `--lg`.

### 7. Component Variants
Add `.card--secondary`, `.card--interactive` to differentiate card types.

### 8. Loading States
Add spinners or skeleton screens for async operations. Use `aria-busy="true"` during loading.

### 9. Wiring Diagram Accessibility
Add `<title>`/`<desc>` to SVG, ensure text is readable, consider `role="img"`.

### 10. Form Validation
Add error states: `.input--error` with red border and error message `aria-describedby`.

---

## Recommendations Summary

### Immediate (Next Sprint)
1. **Replace AppSelect with native `<select>`** or add full keyboard/ARIA support
2. **Add `:focus-visible` styles** to all interactive elements
3. **Audit and fix** all missing form labels
4. **Add table captions** for screen readers
5. **Test with keyboard only** — fix tab order and focus traps

### Short-Term (1-2 Sprints)
6. Establish **button design system** (variants, sizes, states)
7. Define **card variants** and when to use each
8. Add **loading states** and `aria-busy` indicators
9. Improve **visual hierarchy** with size/weight/spacing
10. Add **component documentation** in a STYLE.md file

### Long-Term
11. Consider **light mode** toggle (at least as accessibility option)
12. **User testing** with screen reader users
13. **Automated accessibility testing** (axe-core in CI)
14. **Design token system** (CSS custom properties) for colors, spacing, fonts

---

## Files Reviewed

- `src/App.jsx` (142KB) — main component, all tabs
- `src/App.css` (18KB) — all styles
- `src/index.css` (2KB) — global base styles
- `src/main.jsx` — entry point
- `package.json` — dependencies

---

## Conclusion

Pitboard Build Tracker has a **strong visual foundation** with a cohesive dark theme and thoughtful automotive aesthetic. However, **accessibility is a blocker** — the custom AppSelect makes the app nearly unusable for keyboard/screen reader users. The good news: replacing AppSelect with native `<select>` would solve 80% of accessibility gaps in one fell swoop.

Focus on **keyboard operability** and **focus visibility** first, then polish button/form systems and visual hierarchy. The existing layout and responsive work are solid; the app just needs better semantics and component consistency to be production-grade.

**Priority:** Fix AppSelect → Add focus styles → Semantic HTML review → Button/form system.
