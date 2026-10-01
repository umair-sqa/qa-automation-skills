# Coverage Checklist

A coverage percentage measures lines executed, not risk retired. Use this checklist to judge whether coverage is meaningful before trusting it as a release signal — pairs with `test-suite-reviewer` and the `test-suite-quality-review` skill.

## Critical Path Coverage

- [ ] Every revenue-affecting flow (checkout, payment, subscription change) has tests that assert on specific outcomes, not just that the code ran.
- [ ] Every irreversible or destructive action (delete account, refund, data export/purge) has a dedicated negative-outcome test, not only a happy-path test.
- [ ] Auth and authorization boundaries (login, session expiry, role checks) are covered by tests that assert denial as rigorously as they assert access.
- [ ] The single most-used user journey in production (by actual traffic data, not assumption) is covered end-to-end, even if it's the least interesting code to test.

## Negative and Edge Case Coverage

- [ ] Boundary values are tested (empty, zero, max-length, off-by-one) wherever a limit or range exists in the logic.
- [ ] Invalid/malformed input is tested at every external boundary (API request bodies, file uploads, third-party webhook payloads), not just well-formed input variations.
- [ ] Failure modes of dependencies (timeout, 500, malformed response, partial failure) are tested, not only the dependency's success response.
- [ ] Concurrent/race scenarios are tested where the system allows simultaneous access to shared state (double-submit, double-spend, simultaneous edits).

## Coverage-by-Risk vs. Coverage-by-Percentage

- [ ] The team can name which modules are intentionally under-tested and why (low risk, low change frequency, scheduled for deprecation) — silence here means the gap is accidental, not a decision.
- [ ] A high-percentage module isn't high-risk code left under-verified because it happens to execute a lot of lines cheaply (e.g., config loading, logging wrappers).
- [ ] A low-percentage module isn't actually the highest-risk code in the system, deprioritized because it's harder to test.
- [ ] Coverage targets are set per risk tier (e.g., payment logic held to a higher bar than an admin-only debug page), not one blanket percentage for the whole codebase.

## Over-Mocked "Coverage" That Doesn't Exercise Real Behavior

- [ ] Tests counted as "integration coverage" actually cross the boundary they claim to (real DB/test container, real HTTP call to a local server), not a fully mocked collaborator standing in for the whole boundary.
- [ ] Mocked responses are checked periodically against the real dependency's actual shape (contract test, recorded fixture refresh) so coverage doesn't quietly verify a stale mock instead of reality.
- [ ] A test that passes with the subject-under-test's core logic deleted or stubbed out is treated as a false-coverage bug, not a passing test.
- [ ] Snapshot tests are reviewed by a human when they change, rather than auto-approved — otherwise the "coverage" only proves the snapshot updater ran.
