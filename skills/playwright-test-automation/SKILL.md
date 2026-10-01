---
name: playwright-test-automation
description: Guides agents through implementing Playwright + TypeScript/JavaScript test suites idiomatically — custom fixtures via test.extend, playwright.config.ts project/browser setup, role/test-id locator strategy, when auto-waiting is and isn't enough, scoped Page Object Model, API testing with the request fixture, data-driven tests with test.step, and parallelization/sharding for CI (GitHub Actions/Jenkins). Use when writing or reviewing Playwright test code, structuring a new Playwright project, setting up CI parallelization/sharding for a Playwright suite, or diagnosing Playwright-specific flakiness (waitForTimeout calls, worker-order-dependent failures, missing trace artifacts).
---

# Playwright Test Automation

## Overview

Playwright's built-in actionability checks, fixture system, and trace viewer solve most of the problems teams reach for ad hoc code to fix. This skill is the concrete implementation path — fixtures, config, locators, POM, API testing, parallelization, debugging — for a team whose primary stack is Playwright + TypeScript/JavaScript in GitHub Actions and/or Jenkins. It assumes the tool-agnostic rationale (locator stability, condition-based waits, POM scope, visual regression cost/benefit) from `ui-test-automation-patterns` and does not re-derive it here.

## When to Use

- Writing new Playwright test code, fixtures, or page objects.
- Setting up or reworking `playwright.config.ts` (projects, workers, retries, reporters).
- Configuring CI parallelization/sharding across GitHub Actions or Jenkins runners.
- Reviewing a PR that adds Playwright tests for locator or wait anti-patterns.
- Diagnosing a Playwright suite that's flaky only under full parallelism, or that produces CI failures with no debugging artifact attached.
- NOT for: tool-agnostic locator/wait/POM/visual-regression rationale (see `ui-test-automation-patterns`), test-health dashboards and trend tracking (see `test-observability-and-reporting`), or non-Playwright stacks (Cypress/Selenium/WebdriverIO have their own idioms).

## Core Process

1. **Structure the project around fixtures, not setup boilerplate.** Anything a test needs before it runs (an authenticated page, a seeded API client, a per-test tenant) belongs in a custom fixture built with `test.extend`, not in a `beforeEach` copy-pasted across spec files.
2. **Configure `playwright.config.ts` as the single source of truth for environments and browsers.** Base URL, projects (browser/device matrix), workers, retries, and reporters are config-level decisions, not per-test conditionals.
3. **Default every locator to `getByRole`/`getByTestId`/`getByLabel`.** Fall back to CSS only when no semantic or test hook exists, and treat that fallback as a gap to close (add the test hook), matching the locator strategy in `ui-test-automation-patterns`.
4. **Trust auto-waiting for actionability, but recognize its actual boundary.** Playwright's auto-wait covers "is this element attached, visible, stable, enabled, and receiving events" before an action — it does not know your business logic. Network-dependent state and custom conditions still need an explicit wait.
5. **Compose Page Objects as scoped classes, not one file per app.** One class per meaningful page or reusable component region, locators as class fields, methods that express user intent — never a single `pages.ts` accumulating unrelated selectors.
6. **Push state setup to the API where it's faster and just as valid.** Use the `request` fixture to create/seed state (login, records, feature flags) and reserve UI interaction for the behavior actually under test.
7. **Make datasets and reporting native to the framework.** Loop over data with `for` + `test()`/`test.describe`, and wrap meaningful sub-actions in `test.step` so CI reports read like a narrative, not a stack trace.
8. **Configure parallelization deliberately.** Set `workers` for local/CI parallelism, use `--shard` to split the shard across CI machines, and audit test isolation (no shared files, ports, or DB rows) before increasing worker count — a suite that only passes at `workers: 1` has a real bug, not a config problem.
9. **Wire debugging artifacts into CI, not just local dev.** Trace-on-first-retry, video/screenshot-on-failure, and the trace viewer should be the first thing anyone opens on a CI failure. Tie the artifact-upload story to `test-observability-and-reporting` for how those artifacts feed trend tracking.

## Project Structure and Configuration

```
e2e/
  fixtures/
    auth.fixture.ts       # test.extend for authenticated page/context
    api.fixture.ts        # test.extend wrapping the `request` fixture
  pages/
    login.page.ts         # one page/component per file
    checkout.page.ts
  tests/
    checkout.spec.ts
playwright.config.ts
```

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  workers: process.env.CI ? 4 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }], ['blob']]
    : 'list',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

`fullyParallel` plus a fixed `workers` count means every test must be independently seedable and independently cleanable — see Parallelization below before raising the worker count on an existing suite.

## Custom Fixtures

```ts
// e2e/fixtures/auth.fixture.ts
import { test as base, expect } from '@playwright/test';

type AuthFixtures = {
  authedPage: import('@playwright/test').Page;
};

export const test = base.extend<AuthFixtures>({
  authedPage: async ({ page, request }, use) => {
    // Seed the session via API instead of driving the login UI in every test.
    const response = await request.post('/api/test/login', {
      data: { role: 'admin' },
    });
    const { token } = await response.json();
    await page.context().addCookies([
      { name: 'session', value: token, url: process.env.BASE_URL! },
    ]);
    await use(page);
  },
});

export { expect };
```

Every test that needs an authenticated user imports this `test`, not the base one — the fixture runs once per test, is torn down automatically, and never leaks the setup code into the spec body.

## Locator Strategy and Waiting

Prefer, in order: `getByRole`, `getByLabel`, `getByTestId`, `getByText` — in that order of preference because role/label locators double as accessibility coverage. Raw CSS/XPath is a last resort and, per `ui-test-automation-patterns`, a signal to add a test hook instead.

Auto-waiting covers actionability (attached, visible, stable, enabled, receives events) before clicks, fills, and most assertions via `expect(locator)`. It does **not** know:

- That a network request your action triggers has resolved (use `page.waitForResponse` or assert on the resulting UI state with `expect.poll` if the API result doesn't map to a single DOM change).
- A custom condition not expressible as a locator (e.g., "background job finished," "queue is empty") — use `expect.poll(async () => ..., { timeout: 10_000 })`.
- That a *specific* element instance is the one that changed, when multiple similar elements exist (this is a locator specificity problem, not a wait problem — scope the locator).

```ts
// BAD: hardcoded wait masking a real network dependency
test('order confirmation shows updated total', async ({ page }) => {
  await page.getByRole('button', { name: 'Apply coupon' }).click();
  await page.waitForTimeout(2000); // guesses how long the discount API takes
  await expect(page.locator('.total-2')).toHaveText('$45.00'); // brittle styling class
});

// GOOD: wait on the actual network response, locator scoped by role/test-id
test('order confirmation shows updated total', async ({ page }) => {
  const discountApplied = page.waitForResponse('**/api/cart/apply-coupon');
  await page.getByRole('button', { name: 'Apply coupon' }).click();
  await discountApplied;
  await expect(page.getByTestId('cart-total')).toHaveText('$45.00');
});
```

## Page Object Model, Playwright-Idiomatic

```ts
// e2e/pages/checkout.page.ts
import type { Page, Locator } from '@playwright/test';

export class CheckoutPage {
  readonly page: Page;
  readonly couponInput: Locator;
  readonly applyCouponButton: Locator;
  readonly cartTotal: Locator;

  constructor(page: Page) {
    this.page = page;
    this.couponInput = page.getByLabel('Coupon code');
    this.applyCouponButton = page.getByRole('button', { name: 'Apply coupon' });
    this.cartTotal = page.getByTestId('cart-total');
  }

  async applyCoupon(code: string) {
    await this.couponInput.fill(code);
    const applied = this.page.waitForResponse('**/api/cart/apply-coupon');
    await this.applyCouponButton.click();
    await applied;
  }
}
```

One class per page or reusable region (`CheckoutPage`, `CartSummaryComponent`, `NavBarComponent`), locators as `readonly` class fields set in the constructor, methods named for user intent (`applyCoupon`, not `clickButtonThenWait`). A page object that starts accumulating methods for a different page/flow is the same god-object smell called out in `ui-test-automation-patterns` — split it before it grows further, not "later."

## API Testing with the `request` Fixture

```ts
test('admin can delete a product they created', async ({ request, authedPage }) => {
  // Seed state over the API — no UI navigation needed to get to a starting state.
  const created = await request.post('/api/products', {
    data: { name: 'Test Widget', price: 9.99 },
  });
  const { id } = await created.json();

  // Exercise the behavior actually under test through the UI.
  await authedPage.goto(`/admin/products/${id}`);
  await authedPage.getByRole('button', { name: 'Delete product' }).click();
  await authedPage.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();

  await expect(authedPage.getByText('Product deleted')).toBeVisible();
  const check = await request.get(`/api/products/${id}`);
  expect(check.status()).toBe(404);
});
```

Combining `request` (setup and verification) with the page (the one interaction being tested) is faster than driving every precondition through the UI and asserts on the same ground truth the API layer uses. This is `request` as a UI-test helper, scoped to one test's setup/teardown — for a dedicated API test suite where the API itself is the subject under test (auth fixtures, environment config, request chaining, Postman/Newman), see `api-test-automation-implementation`.

## Data-Driven Tests and Reporting

```ts
const roles = [
  { role: 'admin', canDelete: true },
  { role: 'viewer', canDelete: false },
];

test.describe.parallel('product delete permissions', () => {
  for (const { role, canDelete } of roles) {
    test(`${role} sees delete button: ${canDelete}`, async ({ page }) => {
      await test.step(`log in as ${role}`, async () => {
        await page.goto(`/login?role=${role}`);
      });
      await test.step('check delete button visibility', async () => {
        const deleteButton = page.getByRole('button', { name: 'Delete product' });
        if (canDelete) {
          await expect(deleteButton).toBeVisible();
        } else {
          await expect(deleteButton).toBeHidden();
        }
      });
    });
  }
});
```

`test.step` turns a CI failure into "step 2 of 2 failed" with its own trace segment, instead of one flat spec name — this is the difference between a report someone can act on without reproducing locally and one that requires it.

## Parallelization and Sharding

- **`workers`** controls in-process parallelism on one machine; raise it only after confirming isolation (below).
- **`--shard=<i>/<n>`** splits the whole test list across `n` CI machines/jobs, each running shard `i`. Combine with per-browser projects for a matrix (e.g., 3 browsers x 4 shards = 12 parallel jobs) in GitHub Actions via a job matrix, or Jenkins parallel stages.
- **Isolation requirements this depends on**: no two tests write the same DB row, file, or fixed port; auth/API-seeded state is per-test (unique emails/IDs), not a shared fixture record reused across specs; global state (feature flags, seeded accounts) is created and torn down per test or per worker, not once for the whole run.
- A suite that only passes reliably at `workers: 1` has hidden shared state — treat that as a correctness bug in the tests, not a reason to pin workers to 1 in CI permanently.

```yaml
# GitHub Actions matrix sketch
strategy:
  matrix:
    shardIndex: [1, 2, 3, 4]
    shardTotal: [4]
steps:
  - run: npx playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}
```

## Debugging Tooling

- **Trace viewer** (`trace: 'on-first-retry'` in config, or `npx playwright show-trace trace.zip` locally) reconstructs DOM snapshots, network, and console per action — the default first stop for any CI failure.
- **`--ui`** mode for interactive local debugging of a spec (time-travel through actions, inspect locators live).
- **`--debug`** for step-through debugging with the Playwright Inspector.
- **Video/screenshot-on-failure** (`video: 'retain-on-failure'`, `screenshot: 'only-on-failure'`) attached automatically — no manual repro required to see what the browser looked like at failure time.
- These artifacts are only useful if CI actually uploads them (`actions/upload-artifact` step for the `test-results/` and `blob-report/` directories in GitHub Actions; `archiveArtifacts` in a Jenkins `post` block) and if the artifacts feed the trend/triage workflow described in `test-observability-and-reporting` — a trace nobody looks at because it wasn't uploaded is the same as no trace at all.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Playwright auto-waits, so we never need an explicit wait" | Auto-wait covers element actionability, not network completion or custom business conditions. A click that triggers an async API call still needs `waitForResponse` or `expect.poll` on the resulting state, or the assertion races the request. |
| "Just add `page.waitForTimeout(2000)`, it's Playwright, it'll still be fast enough" | A fixed timeout is exactly as brittle in Playwright as in any other tool — it under-waits on a slow CI runner and over-waits (silently costing suite time) on a fast one. `waitForResponse`/`expect.poll`/`waitFor` on the real condition replaces a guess with a fact. |
| "Let's put every page's locators in one giant `pages.ts` file for simplicity" | It's simpler to write once and unmaintainable within a quarter — every unrelated page change causes merge conflicts in the same file, and nobody can tell which methods are still used. One class per page/component region keeps blast radius contained. |
| "We don't need `test.step` or trace viewer, console.log is enough for debugging CI failures" | `console.log` output from a headless CI run tells you what the test code did, not what the browser actually rendered or received over the network at the moment of failure. Trace viewer reconstructs both; `console.log` reconstructs neither. |
| "We can't parallelize, our tests aren't safe for it" | That's a test-isolation bug (shared fixture rows, fixed ports, global flags), not a permanent constraint — fix the isolation and reclaim the CI time `workers: 1` is currently costing. |

## Red Flags

- Any `page.waitForTimeout(...)` call in the suite outside a documented, justified exception (e.g., deliberately testing a debounce).
- CSS selectors tied to styling classes (`.btn-primary-2`, `.mt-4`) instead of `getByRole`/`getByTestId`/`getByLabel`.
- A single Page Object file (e.g., `pages.ts`) holding locators/methods for many unrelated pages or flows.
- CI failures with no trace, video, or screenshot artifact attached to the run — someone has to reproduce locally to see what happened.
- Tests that only pass reliably with `workers: 1` or `--workers=1` locally, revealing hidden shared state.
- `test.describe.serial` used as a workaround for tests that secretly depend on execution order, instead of fixing the dependency.
- `request` fixture available but every precondition still driven through the UI, inflating run time for no additional coverage.

## Verification

- [ ] `grep -rn "waitForTimeout" e2e/` (or the project's test directory) returns zero unjustified hits.
- [ ] `playwright.config.ts` sets `trace: 'on-first-retry'` (or `'on'`), `video: 'retain-on-failure'`, and `screenshot: 'only-on-failure'`, and the CI workflow/Jenkinsfile uploads the resulting artifact directories on failure.
- [ ] The suite passes with the CI-configured `workers`/`--shard` settings, not just with `--workers=1`.
- [ ] A sample of locators added/changed in the diff use `getByRole`/`getByTestId`/`getByLabel`, not CSS/XPath, unless a documented gap ticket exists for missing test hooks.
- [ ] No single Page Object file exceeds one page/component region's worth of locators and methods.
- [ ] Fixtures (`test.extend`) are used for shared setup (auth, seeded state) rather than duplicated `beforeEach` blocks across spec files.
- [ ] Data-driven specs use `test.step` for each meaningful sub-action, and the resulting HTML/trace report reads as a step-by-step narrative.
