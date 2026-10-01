---
name: test-data-management-strategy
description: Guides choosing and building a test data strategy — synthetic generation vs fixtures vs factories, seeding and teardown, test isolation, and masking or avoiding production PII in test environments — instead of ad hoc copy-pasted or shared test data. Use when setting up test fixtures for a new suite, when tests fail depending on execution order or share mutable accounts, when staging environments are seeded from raw production data, or when a fixture file contains real customer data, credentials, or secrets.
---

# Test Data Management Strategy

## Overview

Test data determines whether a suite is trustworthy or accidentally coupled to hidden shared state. The choice between synthetic generation, static fixtures, and factories — plus how data is seeded, torn down, and isolated per test — decides whether tests can run in any order, in parallel, and without leaking real customer information into places it doesn't belong.

## When to Use

- Setting up test data/fixtures for a new test suite or service
- Diagnosing tests that pass individually but fail when run together or in a different order
- Standing up or refreshing a staging/QA environment's data
- A fixture file contains anything that looks like a real name, email, phone number, card number, or credential
- Reviewing whether a suite's data setup and teardown is sound before it scales to CI

**When NOT to use:** One-off manual exploratory sessions using a disposable sandbox account don't need a formal data strategy — this applies to data that automated suites and CI depend on repeatedly.

## Core Process

1. **Classify each piece of test data by how it should be produced:**
   - Values that just need to exist and be varied (names, addresses, arbitrary emails) → **synthetic generation** (Faker.js, Python Faker, or equivalent) — generated fresh, realistic-looking, never tied to a real person.
   - A specific, curated input that exercises a specific known scenario (a malformed CSV, a known-tricky date, a specific discount-code edge case) → **static fixture**, version-controlled, with a comment explaining why that exact value was chosen.
   - Entities with relationships and defaults that many tests need slight variations of (a "user" with 10 fields, most tests only care about 2) → **factory** (builder function with sensible defaults, override only what the test cares about).

2. **Design seeding to be per-test or per-suite-run, not a shared static environment.** Each test (or at minimum each test file/suite) creates the data it needs at setup time and does not depend on data another test left behind.

3. **Design teardown as seriously as setup.** Every test that creates data cleans it up (delete, rollback transaction, truncate schema) after itself — regardless of whether the test passed or failed. A test run that leaves residue changes the starting conditions for the next run.

4. **Enforce isolation: no shared mutable state between tests.** Two tests must never race to mutate the same record (e.g., two tests both marking the same "shared test user" as inactive). Give each test its own data, generated at runtime with unique identifiers (UUIDs, timestamps) so parallel runs can't collide.

5. **Never seed lower environments from a raw production copy.** If production-realistic data is genuinely needed (e.g., to reproduce a scale-dependent bug), mask or anonymize every PII/sensitive field as part of the export pipeline — never as a manual "remember to scrub it" step that gets skipped under deadline pressure.

6. **Scan fixtures for hardcoded secrets and PII before they're committed.** Treat a fixture file the same as any other file for secret-scanning purposes — an API key or real customer record baked into a checked-in fixture is a security incident waiting to be found by `git log`.

7. **Prefer generated-but-realistic data over literal copies of anything real**, for both privacy and test robustness — synthetic data generators produce varied, edge-case-friendly inputs (unicode names, varying lengths) that a single copied record never will.

## Techniques and Patterns

### Factories with overridable defaults

```javascript
// Factory: sensible defaults, override only what this test cares about
function buildUser(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    email: faker.internet.email(),         // synthetic, not a real address
    name: faker.person.fullName(),
    plan: 'free',
    createdAt: new Date(),
    ...overrides,
  };
}

// Test only needs to specify what's relevant to the assertion
it('upgrades a free-plan user to pro after payment', async () => {
  const user = buildUser({ plan: 'free' });
  await seed(user);

  await upgradeUser(user.id, 'pro');

  expect(await getUser(user.id)).toMatchObject({ plan: 'pro' });
  await cleanup(user.id); // or wrap the whole test in a transaction rollback
});
```

Each test's identity fields (`id`, `email`) are freshly generated, so parallel test runs never collide on the same row.

### Isolation via transactional rollback (when the backing store supports it)

```javascript
beforeEach(async () => { await db.beginTransaction(); });
afterEach(async () => { await db.rollbackTransaction(); }); // always runs, pass or fail
```

Rollback-per-test is often cheaper and more reliable than manual delete calls, and it guarantees teardown runs even when the test fails partway through — manual cleanup code often lives in a place that's skipped on assertion failure unless it's in a `finally`/`afterEach` hook.

### Masking production data for staging (when synthetic data can't reproduce the issue)

```
Export pipeline for staging refresh:
1. Extract from production (restricted access, audited).
2. Mask/anonymize in the same pipeline, before it ever lands in staging:
   - Names/emails/phones → replaced with synthetic equivalents, deterministic
     per source ID (so relationships between records stay consistent).
   - Payment/identity fields → tokenized or dropped entirely, never copied.
   - Free-text fields (support tickets, notes) → redacted or dropped, since
     PII often hides inside prose, not just named fields.
3. Verify: run a PII-pattern scan (emails, card-number regex, SSN-shaped
   strings) against the masked output before it's loaded into staging.
4. Only masked output ever reaches staging; the raw export is discarded,
   not retained "just in case."
```

If step 2 can be skipped under time pressure, the pipeline is unsafe — masking must be a mandatory stage, not an optional cleanup step.

### Faker-style generation for realistic-but-fake data

Use a synthetic data library (Faker.js, Python Faker, or an equivalent for your stack) to generate names, addresses, emails, and other PII-shaped fields — realistic enough to exercise validation/formatting logic, without ever being a real person's data:

```python
from faker import Faker
fake = Faker()

def build_customer(**overrides):
    return {
        "id": fake.uuid4(),
        "name": fake.name(),
        "email": fake.email(),
        "address": fake.address(),
        **overrides,
    }
```

This is tool-agnostic guidance — any generator library that produces varied, realistic-shaped fake data serves the same purpose.

### Database and persistence integrity validation

Data setup gets a test into the right starting state; this is the mirror concern — verifying that what a test *did* to persisted data is actually correct, not just that the API said so.

- **Validate that writes actually persisted, not just that the call returned success.** A `200`/`201` response only proves the request was accepted — it doesn't prove the row was written with the right values, or written at all if there's an async queue or eventual-consistency step between the API and the store. After a write, read the persisted record back (directly or via a trusted read path) and assert on its actual field values, not just the response status.

- **Validate relational integrity, not just the row you touched.** Deleting or updating a parent record should be checked for its effect on related rows: foreign keys that should cascade did cascade, foreign keys that shouldn't cascade correctly blocked or nulled instead, and no orphaned child records were left behind (a `customer` deleted while its `orders` rows silently remain, now pointing at nothing). Write an explicit assertion for the child-table state, not just the parent.

- **Validate that a migration or schema change didn't silently corrupt or drop existing data.** Before/after row counts, spot-checked field values on a sample of pre-existing rows, and referential integrity across the migration boundary all need a check — a migration that "ran successfully" (no error thrown) can still have coerced a column to the wrong type, truncated a value, or dropped rows that failed a new constraint silently.

- **Decide deliberately whether an assertion belongs against the database directly or only through the application's read API.** Asserting only through the app's own read API is convenient and often sufficient, but it can mask a real bug: if the write path stores the wrong value and the read path independently compensates for it (a formatting shim, a default-fallback, a cache serving stale-but-plausible data), the test passes while the underlying row is wrong. When a test's purpose is specifically to verify persistence correctness — not just user-visible behavior — assert directly against the database in addition to (or instead of) the app's read API, so a compensating read can't hide a broken write.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The API returned 200, so the write succeeded" | A success status only confirms the request was accepted — async processing, queues, or a buggy write path can still mean the record never persisted correctly. Read the data back and assert on it directly. |
| "If the app's read API shows the right value, the data must be correct" | A read API can independently mask a bad write (formatting, defaults, caching) — asserting only through the app's own read path can hide a genuinely corrupt row. Assert against the database directly when the test's purpose is to verify persistence itself. |
| "We can just copy prod data into staging, it's realistic" | Realism doesn't require using real people's data — masked/synthetic data can match production's shape and scale without the privacy and compliance exposure of a raw copy. |
| "Tests can share the same seeded account, it saves setup time" | Shared mutable accounts are exactly what causes order-dependent failures and flaky parallel runs; the setup time saved is paid back many times over in flake debugging. |
| "PII in test fixtures is fine, it's not really prod" | A fixture with a real name, email, or card number *is* real personal data regardless of which environment it lives in — it's committed to version control, often with wider access than production itself. |
| "We'll clean up the test data later, it doesn't block this PR" | "Later" cleanup rarely happens, and every run until then pollutes the next one — teardown belongs in the same commit as setup, not a follow-up ticket. |
| "It's faster to hardcode a specific user ID than generate one" | Hardcoded IDs are exactly what causes collisions between parallel test runs and CI jobs; generating a unique ID costs one line and removes an entire class of flakiness. |
| "This is just a quick fixture for one test, isolation doesn't matter" | "Quick" fixtures are the ones most likely to get copy-pasted into other tests later, carrying the same hardcoded, shared-state problem with them. |

## Red Flags

- Tests that only pass when run in a specific order, or fail intermittently in parallel/CI but pass locally one at a time
- Two or more tests referencing the same hardcoded user ID, email, or account name
- Real customer names, emails, phone numbers, or payment details present in any committed fixture file
- Credentials, API keys, or tokens hardcoded into fixtures or seed scripts
- No teardown step for tests that create data — or a teardown step that only runs on the success path (not in `afterEach`/`finally`)
- A staging environment seeded directly from a production database dump with no masking step in the pipeline
- Fixture files with no comment explaining why a specific curated value was chosen, making it unclear whether it's load-bearing for a specific edge case or accidental cruft
- Tests that assert only on an API's status code or the application's own read path after a write, with no check of the persisted record's actual field values
- A migration or schema change deployed with no before/after row-count or spot-check of existing data's integrity

## Verification

- [ ] Every test creates its own data at setup and does not depend on another test's leftover state (verified by running the suite in randomized order and in parallel)
- [ ] Every test that creates data has a corresponding teardown/rollback step that runs regardless of pass/fail (in `afterEach`/`finally`, not only the happy path)
- [ ] No hardcoded shared identifiers (user IDs, emails, account names) are reused across multiple test files
- [ ] A secret/PII scan has been run against fixture files and returns clean, or any flagged data has been confirmed synthetic
- [ ] Any staging/lower-environment data sourced from production has a documented, mandatory masking step in its pipeline — not a manual, skippable one
- [ ] Randomly re-running the suite twice in a row produces identical pass/fail results (no data-order dependence)
- [ ] Tests that verify persistence-critical behavior assert against the actual persisted record (directly against the database where warranted), not solely against the application's own read API
