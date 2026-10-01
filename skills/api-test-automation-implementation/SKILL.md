---
name: api-test-automation-implementation
description: Guides agents through building and structuring runnable API test suites — Playwright's `request` fixture and Postman/Newman collections, bearer/OAuth2/API-key auth handling, per-environment config management, request chaining for multi-step workflows, and data-driven test design. Use when implementing or reviewing the actual API test code/collections (not the contract or schema rules themselves), setting up auth for API tests, managing base URLs and secrets across environments, or chaining requests into an end-to-end API workflow test.
---

# API Test Automation Implementation

## Overview

Knowing *what* to assert on an API response (schema, contract, negative cases — see `api-contract-test-automation`) is a different problem from building a test suite that can actually run that assertion reliably across environments, auth states, and multi-step workflows. This skill is the concrete implementation path: how to structure API test code and collections so auth doesn't leak between tests, environments don't get hardcoded, and chained requests don't silently depend on test execution order.

## When to Use

- Writing or reviewing Playwright `request`-fixture API tests, or Postman/Newman collections and environments.
- Setting up authentication for an API test suite — bearer tokens, OAuth2 client-credentials/refresh flows, API keys, or signed requests.
- Managing base URLs, credentials, or feature flags across local/CI/staging environments for API tests.
- Building a multi-step API test that chains requests (create → read → update → delete, or a multi-service workflow) and needs to pass state between steps without duplicating setup.
- Designing data-driven API tests that run the same request shape across many input permutations.
- NOT for: deciding what to assert on a response body, schema/contract validation rules, or consumer-driven contract testing (see `api-contract-test-automation`); load/throughput testing of the same endpoints (see `performance-and-load-testing`); authorization *negative-case security* testing like privilege escalation (see `security-testing-in-qa`); or UI-level assertions on rendered API data (see `ui-test-automation-patterns`).

## Core Process

1. **Pick one implementation path per suite and commit to it.** Playwright's `request` fixture (or `request.newContext()`) for test suites already in Playwright/TypeScript — no second HTTP client needed. Postman/Newman for a suite that must stay runnable by non-engineers or ship as a shareable collection. Don't run both for the same coverage; it doubles maintenance for no added signal.
2. **Authenticate once per auth state, not once per test.** Acquire the token/session in a fixture (Playwright) or a pre-request script / Newman `--folder` setup step (Postman) that runs once per auth state (e.g., "as admin," "as regular user," "unauthenticated") and reuse it. A test that logs in inline duplicates setup and hides which auth state the test actually needs.
3. **Externalize every environment-specific value.** Base URL, credentials, tenant IDs, and feature-flag values live in environment config (Playwright `.env` + `playwright.config.ts` `use.baseURL`/`extraHTTPHeaders`, or a Postman environment file) — never as a literal string inside a test body. A test that hardcodes `https://staging.example.com` cannot run against any other environment without editing test code.
4. **Never commit real secrets into test code or committed Postman environments.** Pull tokens/API keys from environment variables or a secrets manager at run time; committed Postman environment JSON files must only contain placeholder values with the real ones injected via Newman `-e`/`--env-var` at CI run time.
5. **Chain requests through explicit extracted state, not shared mutable fixtures.** When step 2 needs an ID created in step 1, extract it explicitly (Playwright: `const { id } = await res.json()`; Postman: `pm.environment.set('orderId', jsonData.id)` in a test script) and pass it forward. Don't rely on tests running in file order or on a shared outer-scope variable mutated across unrelated test cases.
6. **Design data-driven cases around input shape, not copy-pasted test bodies.** Loop over a data table of inputs (valid/invalid/boundary payloads) against one parameterized request-building function, matching the equivalence/boundary technique from `test-case-design-techniques` rather than hand-writing near-identical test bodies per case.
7. **Isolate state per test run.** Each chained workflow test should create its own resources (don't assume a specific seeded record exists) and clean up after itself (or run against a scope — tenant, namespace — that's torn down as a unit), so re-running the suite concurrently or repeatedly doesn't collide.
8. **Wire the suite into CI the same way contract tests are gated.** Newman collections run via `newman run collection.json -e env.json` as a CI step with a non-zero exit on failure; Playwright API tests run in the same pipeline as UI tests. A collection that only runs from someone's local Postman app isn't part of the test suite — it's documentation.

## Techniques and Examples

### Auth fixture (Playwright)

```ts
// fixtures/api-auth.fixture.ts
export const test = base.extend<{ adminRequest: APIRequestContext }>({
  adminRequest: async ({ playwright }, use) => {
    const ctx = await playwright.request.newContext({ baseURL: process.env.API_BASE_URL });
    const res = await ctx.post('/auth/token', {
      data: { grant_type: 'client_credentials', client_id: process.env.ADMIN_CLIENT_ID, client_secret: process.env.ADMIN_CLIENT_SECRET },
    });
    const { access_token } = await res.json();
    await ctx.dispose();
    const authedCtx = await playwright.request.newContext({
      baseURL: process.env.API_BASE_URL,
      extraHTTPHeaders: { Authorization: `Bearer ${access_token}` },
    });
    await use(authedCtx);
    await authedCtx.dispose();
  },
});
```

### Request chaining without shared mutable state

```ts
test('order lifecycle: create, fetch, cancel', async ({ adminRequest }) => {
  const createRes = await adminRequest.post('/orders', { data: newOrderPayload() });
  const { id: orderId } = await createRes.json();

  const getRes = await adminRequest.get(`/orders/${orderId}`);
  expect((await getRes.json()).status).toBe('pending');

  const cancelRes = await adminRequest.post(`/orders/${orderId}/cancel`);
  expect(cancelRes.status()).toBe(200);
});
```

### Postman/Newman environment separation

```json
// env.staging.json (committed — placeholders only)
{ "values": [
  { "key": "baseUrl", "value": "https://staging.example.com" },
  { "key": "apiKey", "value": "{{REPLACED_AT_RUNTIME}}" }
]}
```
```bash
# CI step — real secret injected at run time, never committed
newman run orders.postman_collection.json -e env.staging.json --env-var "apiKey=$STAGING_API_KEY"
```

### Data-driven request table

```ts
const cases = [
  { name: 'valid payload', payload: validOrder(), expectedStatus: 201 },
  { name: 'missing required field', payload: omit(validOrder(), 'customerId'), expectedStatus: 422 },
  { name: 'quantity at boundary (0)', payload: { ...validOrder(), quantity: 0 }, expectedStatus: 422 },
];

for (const { name, payload, expectedStatus } of cases) {
  test(`create order — ${name}`, async ({ adminRequest }) => {
    const res = await adminRequest.post('/orders', { data: payload });
    expect(res.status()).toBe(expectedStatus);
  });
}
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll just paste the bearer token in each test, it's faster for now" | A hardcoded token expires, leaks into version control, and means every test independently duplicates (and can drift on) how auth is acquired. A shared fixture is one place to fix when the auth flow changes. |
| "The base URL is the same for now, I'll inline it" | "For now" is exactly the condition that breaks the first time someone needs to run the suite against a second environment (PR preview, staging, local) — externalizing it costs one config line today. |
| "I'll just use a global variable to pass the order ID between tests" | That makes test order load-bearing — run the suite in parallel, shard it, or reorder it, and the dependent test fails for a reason that has nothing to do with the behavior it's supposed to verify. Extract and pass state explicitly within one test. |
| "The Postman collection works when I click Run in the app, that's good enough" | A collection no one runs except manually from the Postman UI isn't gating anything in CI — it's a manual QA ritual wearing the costume of automation. Wire it into `newman run` as a CI step. |
| "I copy-pasted the happy-path test four times and changed one field each time for the other cases" | Four near-identical test bodies is four places to update when the request shape changes, and it hides that these are the same test running a data table. Parameterize once. |

## Red Flags

- Literal base URLs, hostnames, or credentials inside test files or committed Postman collections instead of environment config.
- A real (non-placeholder) secret present in a committed Postman environment JSON file.
- Tests that only pass when run in a specific file/declaration order because they depend on a shared mutable variable set by an earlier test.
- A Postman collection with no corresponding `newman run` CI step — it only ever executes from someone's local Postman client.
- Near-identical test bodies repeated with one literal changed per copy, where a data table would collapse them into one parameterized case.
- Auth acquired inline, repeatedly, inside individual test bodies rather than once per auth state in a shared fixture/setup step.

## Verification

- [ ] No literal environment-specific URL, credential, or secret appears inside test code or a committed collection file.
- [ ] Each distinct auth state the suite needs (anonymous, user, admin, service-to-service) is acquired in exactly one fixture/setup step and reused.
- [ ] Any test chaining multiple requests passes state forward explicitly (extracted from a prior response), with no dependency on file/declaration order or a shared outer-scope variable.
- [ ] Data-driven cases use one parameterized request-building path, not copy-pasted near-duplicate test bodies.
- [ ] The suite (Playwright spec or Postman collection) runs as a required CI step via the project's test runner or `newman run`, not only from a local client.
