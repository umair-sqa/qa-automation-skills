---
name: api-contract-test-automation
description: Guides agents through testing REST/GraphQL/gRPC APIs beyond status-code checks — schema validation, consumer-driven contract testing, negative-case error shape assertions, idempotency testing, and deciding when to mock vs hit real dependencies. Use when writing or reviewing API test suites, when producer/consumer services are integrated across teams, or when API tests pass but production breaks on a response-shape change.
---

# API Contract Test Automation

## Overview

An API test that only checks `status === 200` proves the server responded, not that the response is usable by anything that consumes it. This skill covers schema validation, contract testing between producer and consumer, and the negative-path coverage that catches most real API regressions before they reach production.

## When to Use

- Writing or reviewing tests for a REST, GraphQL, or gRPC API.
- Two services (or a frontend and backend owned by different teams) integrate over an API and drift between them has caused or nearly caused an incident.
- An API test suite exists but only asserts status codes, or has no coverage of 4xx/5xx paths.
- Deciding whether a dependency should be mocked or hit for real in a given test tier.
- NOT for: UI-level assertions on rendered API data (see ui-test-automation-patterns) or load/throughput testing of the same endpoints (see performance-and-load-testing).

## Core Process

1. **Define the schema as the source of truth first** (OpenAPI for REST, SDL for GraphQL, .proto for gRPC) if one doesn't already exist. Tests validate against this artifact, not against a hand-maintained list of expected fields that drifts from the real contract.
2. **Assert full response shape, not just status code**, for every happy-path test: validate the body against the schema (types, required fields, enums) in addition to status and a couple of business-relevant field values.
3. **Cover the negative paths deliberately**: for each endpoint, enumerate the error conditions it can produce (validation failure, not found, unauthorized, conflict, rate-limited, upstream timeout) and assert both the status code and the error body shape for each.
4. **Decide contract testing vs plain integration tests per boundary.** Use consumer-driven contract testing (Pact-style) where producer and consumer are owned by different teams/deploy independently and a broken integration would only surface at runtime. Use plain integration tests where the same team owns both sides and can run them together in one CI pipeline — the contract-test setup and broker overhead isn't worth it there.
5. **Test idempotency explicitly for retryable operations** (payment creation, order submission, anything behind an `Idempotency-Key` or similar) — send the same request twice and assert a single side effect, not just two 200s.
6. **Decide mock vs real per test tier**: unit/component-level API tests mock external dependencies for speed and determinism; a smaller integration tier hits a real (staging/sandboxed) dependency to catch drift the mock can't see. Never let 100% of coverage live only in the mocked tier — that's exactly how contract drift reaches production undetected.
7. **Wire schema validation and contract tests into CI as a gate**, not an optional/manual step — drift caught in a nightly job that nobody reads is drift caught in production.

## Techniques and Examples

### Schema validation over status-only assertions

```js
// BAD: proves the server responded, nothing else
const res = await request(app).get('/api/orders/123');
expect(res.status).toBe(200);

// GOOD: validates shape, not just status
const res = await request(app).get('/api/orders/123');
expect(res.status).toBe(200);
expect(res.body).toMatchSchema(orderResponseSchema); // validated against OpenAPI component
expect(res.body.status).toBe('confirmed');
expect(res.body.total).toEqual(expect.any(Number));
```

### Negative-case coverage checklist per endpoint

| Case | What to assert |
|---|---|
| Missing/invalid required field | 400/422 + error body includes field name and reason, matches error schema |
| Not found | 404 + consistent error shape (not a raw stack trace or HTML page) |
| Unauthorized/unauthenticated | 401 vs 403 distinction is correct, no data leakage in the body |
| Conflict (e.g., duplicate resource) | 409 + body identifies the conflicting resource |
| Rate limited | 429 + `Retry-After` or equivalent header present |
| Upstream dependency failure | 502/503/504 as appropriate, no internal error detail leaked to the client |

### Consumer-driven contract testing vs integration tests

- **Contract testing** (Pact or equivalent): consumer defines expectations as a contract, producer verifies against it in CI independent of the consumer's deploy cycle. Worth the broker/setup overhead when producer and consumer deploy independently and an e2e environment covering both isn't reliably available.
- **Plain integration tests**: both sides tested together against a real running instance. Cheaper to set up, but only catches drift when both sides are deployed together — doesn't protect a consumer from a producer's later, independent change.
- These are not redundant with each other or with end-to-end tests: e2e tests catch that the full user journey works *today*; contract tests catch that a producer's *next* change doesn't silently break a consumer it doesn't render in any shared environment.

### Idempotency test shape

```js
test('duplicate submission with same idempotency key creates one order', async () => {
  const key = uuid();
  const first = await request(app).post('/api/orders').set('Idempotency-Key', key).send(payload);
  const second = await request(app).post('/api/orders').set('Idempotency-Key', key).send(payload);
  expect(first.body.orderId).toBe(second.body.orderId);
  expect(await countOrdersFor(payload.customerId)).toBe(1);
});
```

### GraphQL and gRPC specifics

- **GraphQL**: status-code checks are nearly meaningless here since errors often return HTTP 200 with an `errors` array in the body. Assert on the `errors` array's presence/absence and shape explicitly, validate the response against the SDL-generated types, and cover both field-level errors (partial data + error) and request-level errors (no data).
- **gRPC**: assert on the returned status code (`NOT_FOUND`, `INVALID_ARGUMENT`, `PERMISSION_DENIED`, etc.) from the `.proto`-defined enum, not just "the call succeeded/failed" — a generic catch-all failure assertion hides exactly the distinction a consumer needs to branch on. Validate response messages against the compiled proto types so a field-number/type mismatch fails the test instead of silently deserializing to a zero-value.

### Mock vs real dependency decision table

| Test tier | Dependency handling | Rationale |
|---|---|---|
| Unit / component API tests | Mock all external dependencies | Fast, deterministic, run on every commit |
| Integration tests (same-team boundary) | Real dependency in a shared CI environment | Both sides deploy together, real environment is cheap to stand up |
| Contract tests (cross-team boundary) | Mocked via contract broker, verified independently by each side | Producer and consumer deploy independently, no reliable shared environment |
| Pre-release smoke tests | Real dependency in staging | Catches environment/config drift that no test-time mock can see |

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We only need to check the response is 200 OK" | A 200 with a malformed, missing, or renamed field passes this check and breaks every consumer parsing the body. Status-only assertions catch server crashes, not contract regressions — which are the more common production incident. |
| "Contract tests are redundant, our e2e tests already hit the API" | E2e tests only prove today's producer and consumer are compatible *right now*, in the one environment they both happen to be deployed to. They give zero warning when the producer changes independently next week — which is exactly what contract tests exist to catch. |
| "We'll add schema validation later, the shape hasn't changed yet" | "Hasn't changed yet" is not a property of the code, it's a description of luck so far. The schema check costs almost nothing to add now and is the only thing catching the change when it does happen, often silently, in a dependency bump or a "small" refactor. |
| "GraphQL always returns 200, so there's nothing to assert on the status" | That's exactly why the `errors` array and partial-data shape need explicit assertions — treating a 200 as success without checking the body lets field-level and request-level GraphQL errors pass silently. |
| "The idempotency key is implemented, so it must work" | An implemented feature with no test exercising the duplicate-request path is an assumption, not a verified property — idempotency bugs (race conditions in the dedup check itself) are exactly the kind of thing that only shows up under an explicit duplicate-request test. |

## Red Flags

- API tests that assert only HTTP status with zero body or schema assertions.
- Zero test coverage of 4xx/5xx paths for an endpoint that clearly has validation, auth, or rate limiting.
- A schema file (OpenAPI/proto/SDL) exists but tests don't reference it — meaning the schema and the tests can drift from each other independently.
- Contract drift between a producer and consumer discovered via a production incident or customer report rather than a CI failure.
- Retryable write operations (payment, order creation) with no idempotency test, or with an `Idempotency-Key` implemented but never exercised by a duplicate-request test.
- 100% of API test coverage lives in a mocked tier with no test ever hitting a real (even staging) instance of the dependency.

## Verification

- [ ] Every endpoint with automated tests has at least one test asserting response body/schema shape, not status code alone.
- [ ] Every endpoint's known error conditions (validation, auth, not-found, conflict, rate-limit) have a corresponding negative test asserting both status and error body shape.
- [ ] For each cross-team producer/consumer boundary, either a contract test suite exists and runs in both sides' CI, or a documented reason explains why plain integration tests suffice.
- [ ] Retryable write endpoints have an explicit idempotency test that asserts a single side effect from a duplicate request.
- [ ] Schema validation runs as a required CI check, not a manual or nightly-only step.
