# Accessibility Checklist

Automated accessibility tools catch a meaningful but bounded slice of real accessibility defects — commonly cited estimates put automated coverage at roughly a third of WCAG success criteria. Use this checklist to know what to trust to automation and what requires a human pass — pairs with the `accessibility-testing-automation` skill.

## What Automated Tools (axe-core, Lighthouse, Pa11y) Reliably Catch

- [ ] Missing or empty `alt` text on images.
- [ ] Insufficient color contrast between text and background.
- [ ] Missing form label associations (`<label for>`, `aria-label`, `aria-labelledby`).
- [ ] Invalid or duplicate ARIA attributes, and ARIA roles used on the wrong elements.
- [ ] Missing document language attribute, missing page title, or invalid heading hierarchy (skipped levels).
- [ ] Missing accessible names on interactive elements (buttons, links) with no visible text.
- [ ] Duplicate IDs that break `aria-*` references.

## What Requires Manual Verification

- [ ] **Keyboard navigation** — every interactive element is reachable and operable via keyboard alone, in a logical order, with no dead-ends (no automated tool can drive a full keyboard walkthrough reliably).
- [ ] **Focus order and focus trapping** — tab order matches visual/logical order; modals trap focus while open and return it to the trigger element on close; no focus loss to `body` on dynamic content changes.
- [ ] **Screen reader pass** — a full journey (not spot checks) run with at least one real screen reader (VoiceOver, NVDA, JAWS, TalkBack) confirming announcements make sense in context, not just that labels exist.
- [ ] **Meaningful reading order** — content that looks correct visually but is scrambled or duplicated when linearized for assistive tech (common with CSS-repositioned or grid/flex-reordered content).
- [ ] **Dynamic content announcements** — live regions (`aria-live`), toasts, and async-loaded content are announced appropriately, not silently updated.
- [ ] **Custom widget semantics** — custom dropdowns, date pickers, sliders, and drag-and-drop interactions behave per the expected ARIA authoring pattern, including on unexpected input (rapid keys, browser zoom, touch).
- [ ] **Real-user cognitive/usability review** — content clarity, error message helpfulness, and timeout/session behavior for users who need more time or simpler flows.
- [ ] **Zoom and reflow** — content remains usable at 200-400% zoom / reflow without horizontal scrolling or content loss (automated tools rarely verify actual usability at these breakpoints, only static properties).

## Baseline Automated Checks for Every CI Pipeline

- [ ] Run an axe-core (or equivalent) scan against every page/route/component in the design system on every PR, not just a manually curated subset.
- [ ] Fail the build on any new "critical" or "serious" impact-level violation (per axe's impact taxonomy); track "moderate"/"minor" as informational to avoid noise fatigue burying real issues.
- [ ] Include color-contrast checks in the automated scan, covering both light and dark themes if both exist.
- [ ] Run the scan against rendered, post-JavaScript DOM state, not just static markup — client-rendered content invisible to a static scan is a common blind spot.
- [ ] Track violation count/trend over time on a dashboard so regressions are visible before they accumulate into a large remediation backlog.
- [ ] Schedule a recurring (not one-time) manual keyboard-and-screen-reader pass on critical journeys, since automation cannot substitute for it long-term.
