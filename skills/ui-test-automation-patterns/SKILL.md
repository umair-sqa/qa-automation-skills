---
name: ui-test-automation-patterns
description: Guides agents through writing resilient UI automation — Page Object vs Screenplay pattern choice, stable locator strategy, condition-based waits instead of sleeps, component vs end-to-end test scoping, and when visual regression testing is worth its flakiness cost. Use when writing or reviewing browser/UI test code, diagnosing a flaky UI suite, or deciding how to structure page objects for a growing app.
---

# UI Test Automation Patterns

## Overview

Most UI suite flakiness and maintenance cost comes from three decisions made early and never revisited: how locators are chosen, how waits are expressed, and how much shared structure (page objects) different flows are forced through. This skill gives concrete patterns for all three, plus when to reach for visual regression.

## When to Use

- Writing new UI test code (Playwright, Cypress, Selenium/WebdriverIO, or equivalent).
- Reviewing a PR that adds UI tests and checking for brittle locators or hardcoded waits.
- A UI suite has become flaky or slow to write against, and the root cause needs isolating.
- Deciding whether a new flow needs a full end-to-end test or a narrower component-level test.
- NOT for: API-level or contract testing (see api-contract-test-automation) or mobile gesture/animation timing (see mobile-test-automation, which has its own wait concerns).

## Core Process

1. **Choose locator strategy before writing the first test.** Prefer stable, test-specific hooks (`data-testid`, `data-cy`, ARIA roles/accessible names) over CSS classes or XPath tied to visual structure. If the app has no test hooks yet, add them as part of the test work — don't route around the gap with brittle selectors.
2. **Choose Page Object Model or Screenplay based on team size and flow complexity**, not habit (see Patterns section below).
3. **Replace every fixed sleep with a condition-based wait** tied to an observable state change (element visible/enabled, network response received, URL changed) before merging.
4. **Scope each new test at the right level**: does this assertion need a full browser render and network stack, or would a component test with mocked dependencies catch the same regression faster and more reliably? Default to the narrowest scope that still exercises the real risk.
5. **Only add visual regression coverage where pixel diffs catch something assertions can't** (layout/CSS regressions, unintended visual drift) and budget for its inherent flakiness (font rendering, anti-aliasing, animation timing) with masking/tolerance settings from day one.
6. **Review page objects periodically for scope creep** — a single class accumulating methods for unrelated pages is a sign the abstraction has stopped matching the app's actual structure.

## Patterns

### Page Object Model vs Screenplay

- **Page Object Model (POM):** one class per page/component encapsulating locators and actions on that page. Fits small-to-medium teams and apps with a fairly linear page structure. Cheaper to learn, faster to onboard new contributors.
- **Screenplay Pattern:** actors performing tasks composed of interactions, decoupled from any single page. Fits larger teams, apps with many cross-cutting user journeys, or suites shared across multiple applications. Higher upfront design cost, pays off when the same "task" (e.g., "complete checkout") recurs across many specs with different actors/personas.
- Default to POM until the suite has a concrete pain point Screenplay solves (duplicated task logic across many page objects); don't adopt Screenplay speculatively.

### Locators: before and after

```js
// BAD: brittle locator + hardcoded sleep
test('user can renew subscription', async () => {
  await page.goto('/account');
  await page.click('.btn-primary-2');   // styling class, will break on redesign
  await page.waitForTimeout(5000);      // guesses how long the modal takes
  await page.click('//div[3]/section/button[2]'); // structural XPath, breaks on any DOM reshuffle
  expect(await page.isVisible('.toast-success')).toBe(true); // toast may already be gone by the time this runs
});

// GOOD: stable locator + condition-based wait
test('user can renew subscription', async ({ page }) => {
  await page.goto('/account');
  await page.getByTestId('renew-subscription-button').click();
  await page.getByRole('dialog', { name: 'Confirm renewal' }).waitFor();
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByTestId('renewal-success-toast')).toBeVisible();
});
```

The "after" version survives a CSS redesign, a DOM restructure, and variable modal-open latency, because it asserts on meaning (test id, role, name) and waits on the actual condition (dialog present, toast visible) rather than a guessed duration or the page's incidental structure.

### Component-level vs end-to-end

- Use end-to-end when the risk is the integration itself (real auth flow, real payment redirect, cross-service handoff).
- Use component-level (real component, mocked network/dependencies) when the risk is UI logic (conditional rendering, form validation, state transitions) that doesn't require a live backend to prove.
- A growing ratio of end-to-end tests asserting on things component tests could cover is a maintenance-cost smell, not a coverage win — it multiplies run time and flake surface for no additional confidence.

### Visual regression: when it earns its cost

- Worth it for: marketing/landing pages, design-system component libraries, pixel-sensitive layouts (print/PDF-like output), dark-mode/theme regressions that assertions can't express.
- Not worth it for: pages that change frequently by design, or as a substitute for functional assertions — a pixel diff tells you *something* changed, not *what* or *whether it matters*.
- Mitigate inherent flakiness: freeze animations, mock dynamic content (dates, avatars), set an explicit diff tolerance, and review diffs in CI as a required approval step rather than auto-failing on any pixel delta.

## Diagnosing an Already-Flaky Suite

When a UI suite is flaky and the cause isn't obvious, check these in order — they account for the large majority of real-world UI flake:

1. **Fixed waits masking a real race condition.** A `sleep(2000)` that "usually" works is evidence of an unaddressed timing dependency, not a fix. Replace it with a wait on the actual condition and see if the flake reproduces reliably — now you have a real bug to fix instead of a probabilistic one to live with.
2. **Locators matching multiple elements.** A CSS class or partial-text locator that matches more than one node resolves non-deterministically depending on render order. Test-id locators scoped to a single element remove this class of flake outright.
3. **Test-order dependency.** A test that passes alone but fails in a full run is usually leaking state (unclosed modal, un-reset local storage, a background timer) into the next test. Run the suite with randomized order in CI specifically to surface this.
4. **Network/backend nondeterminism bleeding into a UI-only concern.** If a UI test's flake traces to an API response varying, the fix is at the API/fixture layer (seed deterministic data), not adding a longer wait in the UI test.
5. **Animation/transition timing.** Waiting on "element visible" can pass mid-transition. Wait on the post-transition state (e.g., `toHaveCSS('opacity', '1')` or an explicit "animation complete" test hook) when a test's assertion depends on final layout.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Just add sleep(5000), it fixes the timing issue" | It fixes the symptom on the machine that's currently slow and reintroduces flakiness the moment CI is faster or slower than expected. A condition-based wait ties the test to the actual event and works at any speed. |
| "XPath is fine, it works on my machine" | XPath tied to DOM position breaks on any markup reshuffle, including ones unrelated to the feature under test — a redesign no one told QA about fails fifty unrelated specs. Test-id or role-based locators are why. |
| "We'll refactor the page objects later once things stabilize" | UI code never stabilizes; the page object either gets a naming/scoping convention now or accretes into a god-object that everyone is afraid to touch, which is the actual state most abandoned suites are found in. |

## Red Flags

- Any `sleep()`/`waitForTimeout()`/fixed-duration wait call in the suite where a condition-based wait was available.
- Locators referencing classes that are clearly styling-only (`.btn-primary-2`, `.mt-4`, `.col-6`) rather than semantic/test hooks.
- A single Page Object class with 50+ methods spanning unrelated pages or flows.
- Visual regression tests with no diff tolerance/masking, failing on every font-rendering or anti-aliasing difference between environments.
- End-to-end tests asserting on pure UI logic (a checkbox toggling a hidden div) that a component test could cover in a fraction of the time.
- A test that passes in isolation but fails when the suite runs in a different order — a sign of state leakage between tests rather than a genuine timing issue.
- CI configuration includes an automatic retry-on-failure for the UI suite with no corresponding flake-tracking ticket per retried test.

## Verification

- [ ] `grep` (or equivalent) across the suite for `sleep(`, `waitForTimeout(`, `Thread.sleep(`, or framework-specific fixed waits returns zero unjustified hits.
- [ ] A sample of locators in new/changed tests use test-id, role, or accessible-name selectors, not CSS classes tied to styling or positional XPath.
- [ ] Page object files are checked for method count/scope; any class exceeding a reasonable single-page/flow boundary is flagged for split.
- [ ] Any new visual regression test has an explicit diff tolerance/mask configuration checked into the repo, not default zero-tolerance.
- [ ] For each new end-to-end test added, there's a one-line justification (in the PR or test file) for why it needs full-stack scope instead of a component test.
- [ ] Running the suite with tests in randomized order produces the same pass/fail results as the default order (no order-dependent failures).
- [ ] Any test currently on a retry-on-failure allowance has a linked flake-tracking ticket, not an indefinite silent retry.
