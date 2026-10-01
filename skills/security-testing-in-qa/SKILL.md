---
name: security-testing-in-qa
description: Guides building security testing into standard QA practice rather than treating it as a separate team's responsibility — wiring DAST/SAST tools into pipelines as gates, writing authorization negative tests (IDOR) for multi-tenant data, treating injection/XSS cases as standard negative tests, gating on dependency vulnerability scans, and scanning fixtures/repos for committed secrets. Use when designing a test plan for any feature with authentication, authorization, or multi-tenant data; when a pipeline has no security gate at all; or when someone says security testing is "someone else's job" or "we'll pen-test before launch."
---

# Security Testing in QA

## Overview

Security bugs are functional bugs — a user accessing another user's data is a defect, not a separate discipline's concern. Treating security testing as an occasional, separate-team activity means the fastest-moving, highest-blast-radius defects (broken auth, injection, leaked secrets) get the least continuous scrutiny of any class of bug. Folding it into everyday QA — negative tests, pipeline gates, fixture hygiene — catches these defects at the same cadence as any other regression.

## When to Use

- Designing a test plan for any feature touching authentication, authorization, or multi-tenant/multi-user data
- A pipeline has no SAST/DAST/dependency-scan gate at all, or one that exists but doesn't block merges
- Writing negative test cases for an API or form that accepts user input
- Before adding fixtures, seed data, or example configs to a test repo
- Someone frames security testing as exclusively a separate security team's, or a pre-launch pen-test's, responsibility

**When NOT to use:** This skill covers security testing as part of routine QA practice, not running a full penetration test engagement, threat modeling a system architecture, or incident response — those are adjacent, larger-scope activities that a dedicated security function typically owns.

## Core Process

1. **Add IDOR/authorization negative tests wherever data is scoped to a user, tenant, or role.** For every endpoint or UI action that reads or writes data belonging to "the current user/tenant," write a test where user A's credentials are used to request or modify user B's resource, and assert it is rejected (403/404, not a silent 200 with someone else's data).

2. **Treat injection and XSS as standard negative test cases, not exotic ones.** Any field that accepts free text and is later used in a query, rendered in HTML, passed to a shell, or interpolated into a template gets a negative test with representative payloads (`' OR '1'='1`, `<script>alert(1)</script>`, path traversal sequences) asserting the input is rejected, sanitized, or safely escaped — the same way you'd test any other boundary input.

3. **Wire a SAST tool into the pipeline as a gate, not a report nobody reads.** Run static analysis (e.g. Semgrep, CodeQL, Bandit) on every PR, fail the build on new high/critical findings, and require explicit triage (fix or documented accepted-risk) for anything else. A SAST report that's generated but not blocking is equivalent to not running it.

4. **Wire a DAST tool into the pipeline against a running test environment.** Run a dynamic scanner (e.g. OWASP ZAP, Burp Suite's automation) against staging or a test deploy on a schedule or per-release, targeting the same endpoints covered by functional test suites, and gate release on no new high-severity findings.

5. **Gate on dependency vulnerability scanning as part of the standard test gate.** Run a dependency/SCA scanner (e.g. `npm audit`, Dependabot, Snyk, `pip-audit`, `trivy`) on every build, not as an ad hoc quarterly exercise. Treat a new critical CVE in a direct dependency the same way you'd treat a failing test: it blocks merge or release until triaged.

6. **Scan fixtures, seed data, and test repos for committed secrets.** Run a secrets scanner (e.g. gitleaks, truffleHog, detect-secrets) over test fixtures and configuration before they're committed, and periodically over the full repo history. Real API keys, tokens, or passwords in "fake" test data are a common leak vector precisely because they're assumed harmless.

7. **Make security testing continuous, not launch-only.** Fold IDOR/injection negative tests into the same regression suite that runs on every PR, and schedule DAST/dependency scans on a recurring cadence (nightly/weekly), not solely as a pre-launch checklist item. A defect introduced the week after launch deserves the same scrutiny as one introduced the week before.

## Techniques and Patterns

### IDOR test pattern (works for any resource-scoped API)

```
Given: user A owns resource R (order, document, profile, message)
When:  user B's authenticated session requests/modifies R by its ID
Then:  the API returns 403/404 and does NOT return or mutate R's data

# Concretely:
POST /login as userB -> token_B
GET /orders/{userA_order_id}  with token_B
assert response.status in (403, 404)
assert "userA" not in response.body   # no data leakage even in an error path
```
Do this for every ID-addressable resource: sequential IDs make this trivially exploitable if authorization is missing, but UUIDs don't fix it either — the check has to happen server-side regardless of ID guessability.

### Negative test payload set (standard, not exotic)

| Class | Example payloads | Expected result |
|---|---|---|
| SQL injection | `' OR '1'='1`, `'; DROP TABLE users; --` | Rejected or safely parameterized, no query structure change |
| XSS (stored/reflected) | `<script>alert(1)</script>`, `"><img src=x onerror=alert(1)>` | Escaped/sanitized on output, never executes |
| Path traversal | `../../etc/passwd`, `..%2f..%2fconfig` | Rejected, no file outside intended directory served |
| Command injection | `; rm -rf /`, `` `whoami` `` | Rejected or safely escaped before reaching a shell |
| Auth bypass via param tampering | Changing a `role=user` field to `role=admin` in a request body | Server-side role is authoritative; client-supplied role ignored or rejected |

### Pipeline gate wiring (illustrative, tool-agnostic)

```yaml
# per-PR: fast checks
- sast_scan (semgrep/codeql) --fail-on=high
- dependency_scan (npm audit / pip-audit / snyk) --fail-on=critical
- secrets_scan (gitleaks) --fail-on=any

# nightly / pre-release: slower checks
- dast_scan (zap-baseline or full scan) against staging --fail-on=high
- IDOR/negative-auth regression suite (part of normal functional suite)
```
The split mirrors the test pyramid: cheap, fast checks on every PR; slower, environment-dependent checks on a recurring or pre-release cadence — but both are pipeline-gated, not manual or ad hoc.

### Fixture hygiene

Replace anything that looks like a real credential with obviously-fake, clearly-scoped values (`test_sk_live_FAKE_0000000000000000`), and run a secrets scanner in CI on every commit touching `fixtures/`, `seed/`, or `test-data/` directories, not just at release time.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Security is a separate team's job, not QA's" | Auth and authorization bugs are functional defects found the same way any other regression is — with a test. Waiting for a separate team's review cadence leaves every PR in between unchecked. |
| "We'll pen-test before the big launch, that's enough" | A point-in-time pen-test only proves the state at that moment. Every change afterward — including the week after launch — ships with zero security regression coverage until the next engagement. |
| "We trust our own API, we don't need negative auth tests against it" | Trust isn't a control. IDOR is consistently one of the most common production vulnerability classes precisely because "it's our own code, we trust it" is the default assumption that goes unverified. |
| "SAST/DAST findings are noisy, we'll just review them manually sometimes" | An unblocking, manually-reviewed-sometimes report has the same effect as not scanning at all: nothing stops a high-severity finding from merging. Gate on it or it isn't a gate. |
| "Dependency scanning is a separate ad hoc process, we do it quarterly" | New CVEs in existing dependencies appear continuously. A quarterly cadence means a critical vulnerability can sit unpatched in production for months between checks. |
| "It's just test data, the keys in fixtures aren't real" | Fixtures get copy-pasted from real credentials more often than assumed, and secrets scanners can't tell "fake" from "forgotten to rotate" — scan regardless of intent. |

## Red Flags

- Zero negative authorization tests (no IDOR coverage) on a system with multi-tenant or multi-user data
- Test fixtures, seed scripts, or example configs containing real-looking API keys, tokens, or passwords
- Dependency vulnerability scanning absent from the pipeline entirely, or run manually on an irregular schedule
- SAST/DAST findings generated but not wired to block merge or release
- Security testing that only ever happens once, before a major launch, with nothing scheduled afterward
- Injection/XSS test cases treated as a specialist add-on rather than part of standard negative test design for any input field
- A secrets scanner exists but was never run against existing repo history, only new commits

## Verification

- [ ] At least one IDOR/negative-authorization test exists per resource type that is scoped to a user/tenant/role, and it was run and shown to fail closed
- [ ] Injection and XSS negative test cases exist for every free-text input that reaches a query, shell, or rendered output, checked into the standard test suite (not a separate security-only suite)
- [ ] SAST is wired into the pipeline and configured to fail the build on new high/critical findings, with evidence of at least one build actually blocked by it
- [ ] Dependency vulnerability scanning runs on every build or on a defined recurring schedule, gates on critical findings, and has a documented triage path
- [ ] A secrets scanner has been run against fixtures/test-data directories and against full repo history at least once, with findings remediated or rotated
- [ ] A DAST scan has run against a staging/test environment within the current release cycle, not solely before the original launch
