---
name: accessibility-testing-automation
description: Guides agents through integrating accessibility checks (axe-core, Lighthouse, Pa11y) into CI as a continuous gate, while being honest that automated tools only catch roughly 30-50% of WCAG issues and manual testing (keyboard-only navigation, screen reader testing with VoiceOver/NVDA/JAWS, focus order and focus-trapping) is still required. Use when adding accessibility checks to a pipeline, reviewing whether an "accessible" claim is actually verified, preparing for a compliance deadline, or auditing a new UI component (especially modals, custom widgets, forms) for a11y regressions.
---

# Accessibility Testing Automation

## Overview

Automated accessibility tools (axe-core, Lighthouse, Pa11y) reliably catch a meaningful but partial slice of issues — contrast ratios, missing alt text, ARIA misuse, missing form labels — roughly 30-50% of WCAG success criteria are even mechanically checkable. The rest (keyboard operability, focus management, screen reader announcement quality, cognitive/visual usability) requires manual and assistive-technology testing. This skill treats accessibility as a continuous CI gate combining both, not a one-time audit or a tool-output rubber stamp.

## When to Use

- Adding or reviewing automated accessibility checks in a CI pipeline.
- A UI component ships with interactive behavior (modal, dropdown, custom widget, multi-step form, carousel).
- Someone claims a page/feature is "accessible" based solely on an automated scan.
- Preparing for a compliance deadline (WCAG 2.1/2.2 AA, ADA, EN 301 549) — this skill applies well before the deadline, not as a last-minute audit.
- Reviewing an existing a11y setup for coverage gaps (single-page scans, no manual testing, no CI gate).

**Do not treat this skill as satisfied by** running an automated scanner once and recording "zero violations" — that is the specific anti-pattern this skill exists to prevent.

## The Core Process

1. **Wire automated scanning into CI as a gate, not a report.** Run axe-core (via its Playwright/Cypress/Selenium bindings), Lighthouse CI, or Pa11y against every page/route that changed, on every PR — configure it to fail the build on new violations above an agreed severity (typically "serious" and "critical"), not just log them.
2. **Scan more than the homepage.** Cover every distinct template/route type and, critically, every interactive component state: modal open, dropdown expanded, form validation error shown, empty state, loading state. A component that's accessible in its default state can fail entirely once a modal opens and traps focus incorrectly.
3. **Track known-acceptable exceptions explicitly**, not by suppressing the whole rule. If a specific false positive or accepted-risk violation exists, allowlist that specific instance with a comment explaining why, so the rule still catches new occurrences elsewhere.
4. **Layer manual testing on top, on a defined cadence** — not skipped because automation "passed":
   - **Keyboard-only navigation:** unplug the mouse (or don't touch it) and complete every critical user flow using only Tab, Shift+Tab, Enter, Space, and arrow keys. Confirm every interactive element is reachable, operable, and has a visible focus indicator.
   - **Screen reader testing:** run critical flows with at least one real screen reader (VoiceOver on macOS/iOS, NVDA or JAWS on Windows) and confirm announcements make sense — labels are read, state changes (errors, loading, success) are announced, and reading order matches visual order.
   - **Focus order and focus trapping:** confirm modals trap focus inside themselves while open, return focus to the triggering element on close, and that tab order follows a logical sequence matching visual/reading flow (not DOM order that happens to differ from layout).
5. **File every manual-testing finding as a bug with the same severity rigor as a functional bug** — not a separate lower-priority backlog that never gets triaged.
6. **Re-run both automated and manual checks after every UI change to the affected component**, treating a11y regressions the same as functional regressions — gate merges on the automated part, and re-run the manual checklist for components with meaningfully changed interaction patterns.
7. **Track a11y as an ongoing metric** (violation count trend, pages covered, manual test cadence) reviewed regularly, not a single audit artifact filed away after a launch.

## Techniques and Patterns

**CI gate example with axe-core (Playwright):**

```js
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('checkout page has no serious/critical a11y violations', async ({ page }) => {
  await page.goto('/checkout');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  const blocking = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical'
  );
  expect(blocking).toEqual([]);
});
```

**What automated tools reliably catch vs. what they can't:**

| Automated (axe-core/Lighthouse/Pa11y) | Requires manual/assistive-tech testing |
|---|---|
| Missing/insufficient color contrast | Whether the reading/announcement order actually makes sense |
| Missing `alt` text on images | Whether alt text is *meaningful*, not just present |
| Missing form labels / label-input association | Whether error messages are announced at the right time |
| Invalid or misused ARIA attributes | Whether custom widget keyboard interaction matches ARIA APG patterns in practice |
| Missing document language, missing page title | Focus trapping and focus return in modals/dialogs |
| Insufficient touch target size (some tools) | Whether the experience is *usable*, not just technically compliant, for a screen reader or keyboard-only user |

**Keyboard-only navigation checklist for a modal component:**
- Tab reaches the trigger element and Enter/Space opens the modal.
- Focus moves into the modal automatically on open (typically to the first focusable element or a heading).
- Tab and Shift+Tab cycle only within the modal's focusable elements while open (focus trap) — focus does not escape to background content.
- Escape closes the modal.
- Focus returns to the triggering element after the modal closes.
- All interactive elements inside the modal have a visible focus indicator (not `outline: none` with no replacement).

**Screen reader spot-check flow (VoiceOver example):**
- Enable VoiceOver (Cmd+F5 on macOS), navigate the critical flow using VO+arrow keys and Tab.
- Confirm every interactive element announces its role and current state (e.g., "button, expanded" for a toggle).
- Trigger a form validation error and confirm it's announced without requiring the user to manually navigate to find it (commonly via `aria-live` or focus movement to the error).
- Confirm heading structure (`h1`-`h6`) allows navigating by headings in a sensible order (VO+Cmd+H).

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We ran axe and got zero violations, we're accessible" | Automated tools catch roughly 30-50% of WCAG issues at best — zero automated violations says nothing about keyboard operability, focus management, or screen reader usability, all of which require manual testing. |
| "Accessibility is a legal/compliance thing, not an engineering concern" | Accessibility bugs are usability bugs — keyboard traps and unlabeled controls break the product for real users, independent of any legal exposure, and they're cheaper to catch in CI than after a compliance complaint. |
| "We'll do an a11y audit once before the big launch and call it done" | A one-time audit is a snapshot; the next sprint's new component or modal isn't covered by it. Accessibility needs a standing CI gate plus a recurring manual-testing cadence, not a pre-launch checkbox. |
| "The design system component is accessible, so any page using it is fine" | A compliant base component can still be composed into an inaccessible flow (wrong heading order, focus not managed on route change, ARIA live regions misused) — composition-level testing is still required. |
| "Screen reader testing takes too long, we'll skip it for this release" | Skipping it doesn't remove the risk, it just moves discovery to production, where the cost of a broken checkout flow for screen reader users is a real, non-hypothetical harm and potential legal exposure. |

## Red Flags

- Automated a11y checks that only ever run against the homepage or a single reference page, never against interactive component states (modals open, errors shown).
- Zero manual keyboard-navigation or screen reader testing performed before a major release.
- Accessibility treated as a one-time compliance audit rather than a CI gate that can fail a build on new violations.
- A "zero violations" claim based solely on an automated tool's output, with no mention of manual testing.
- Known focus-trap or keyboard-navigation bugs sitting in a low-priority backlog instead of being triaged with the same severity as a functional bug.
- New interactive components (modals, custom dropdowns, drag-and-drop) shipped with no keyboard or screen reader verification at all.

## Verification

- [ ] Automated accessibility scanning (axe-core, Lighthouse, or Pa11y) runs in CI on every PR and fails the build on new serious/critical violations, with the config/workflow file as evidence.
- [ ] Scans cover every distinct route/template and key interactive states (modal open, form error, loading, empty state), not just the default view of one page.
- [ ] A documented keyboard-only navigation pass was completed for the critical user flow(s) affected by this change, with specific findings (pass or filed bugs).
- [ ] A documented screen reader pass (VoiceOver, NVDA, or JAWS) was completed for the same flow(s), with specific findings.
- [ ] Focus order and focus-trap behavior for any new modal/overlay component was explicitly verified, not assumed from the design system.
- [ ] Any known accepted-risk violations are allowlisted individually with a documented reason, not suppressed at the rule level.
