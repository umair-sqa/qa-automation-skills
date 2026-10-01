---
name: exploratory-testing-and-bug-reports
description: Guides running exploratory testing as session-based test management — a charter with a stated mission, scoped areas, and a time-box, executed using deliberate tours rather than unstructured clicking — and writing defect reports precise enough that someone else can reproduce the bug from the report alone. Use when planning an exploratory session, when someone proposes "just clicking around" instead of a charter, when writing up a bug found outside scripted test cases, or when a developer can't reproduce a reported defect because the steps, environment, or evidence are missing.
---

# Exploratory Testing and Bug Reports

## Overview

Exploratory testing is a distinct discipline, not a euphemism for unscripted clicking. Session-based test management gives it the same rigor a scripted suite has — a charter defines the mission and time-box up front, and a record of what was actually covered makes the session reviewable afterward. The other half of the discipline is what happens when exploration finds something: a bug report is only as useful as its reproducibility. A vague report costs more engineering time chasing "can't repro" than the bug itself would have cost to fix. This skill covers both halves; for systematic, technique-driven test case derivation (boundary value analysis, decision tables, etc.) that complements exploration, see `test-case-design-techniques`, which also introduces the charter concept briefly — this skill goes deeper on session structure, tours, and the report format.

## When to Use

- Planning an exploratory testing session for a new, unstable, or ambiguous feature
- Someone proposes skipping the charter because "everyone knows what to test"
- Writing up a bug found during exploration, code review, or ad hoc use — not from a scripted test case
- A developer reports back that they can't reproduce a filed defect
- Reviewing whether exploratory sessions are actually happening or if the same ground is being re-covered repeatedly while other areas go untouched

**When NOT to use:** Deriving systematic scripted test cases for known, specifiable logic (boundaries, multi-condition rules, state machines) — that's `test-case-design-techniques`. This skill is specifically about unscripted-in-the-moment exploration conducted under a structured session, and about writing up what it finds.

## Core Process

1. **Write the charter before opening the application.** State the mission (what you're trying to learn or break), what's explicitly in scope and out of scope, and a time-box. A charter with no time-box tends to either end after five minutes of "nothing interesting" or run for hours with no record of what was actually covered.

2. **Choose one or two tours that match the mission**, rather than clicking wherever attention drifts. Tours are ways of moving through the product with a specific kind of failure in mind (see below) — picking a tour is what makes exploration purposeful instead of aimless.

3. **Log findings as you go, not from memory afterward.** Every observation — bug, confusing behavior, or even a "this seems fine but odd" note — gets a line in the findings log the moment it happens, with enough detail to reconstruct it later. Exploratory sessions have no script to fall back on; if the steps aren't captured immediately, they're often unrecoverable.

4. **At the time-box's end, close the session with a coverage note**: what was actually covered versus what the charter planned, what was skipped for lack of time, and what follow-up charter (if any) is needed for the areas not reached. This is what makes the session auditable — without it, nobody can tell whether an area was explored and found clean, or simply never visited.

5. **For every bug found, capture the full repro package before moving on**: preconditions, exact ordered steps, expected result, actual result, environment/build info, and evidence (screenshot, video, or log). Capturing this immediately, while the state is still on screen, is far cheaper than trying to reconstruct it later from memory.

6. **Assign severity and priority with a one-line stated rationale**, not just a label. "High" or "P1" with no justification forces the next reader to re-derive the reasoning (or just trust it blindly); a rationale line lets triage happen without re-litigating the assessment.

7. **File the report so a developer unfamiliar with the session can act on it without pinging the reporter for clarification.** If reproducing the bug requires asking the original tester a follow-up question, the report wasn't finished.

## Techniques and Patterns

### Session charter template (and a worked example)

```
Charter
Mission:         <what you're trying to learn or break, one sentence>
In scope:        <areas/flows to probe>
Out of scope:    <areas explicitly not covered this session>
Time budget:     <e.g. 60 minutes>
Tour(s) used:    <e.g. boundary tour, error-handling tour>
Tester / date:   <name, date>
---
Findings log (append during the session):
[time] <observation/bug> — repro so far: <steps> — severity guess: <label>
---
Coverage note (write at session close):
Covered:         <what was actually explored>
Not reached:     <planned but skipped, and why>
Follow-up:       <new charter needed, if any>
```

Worked example — feature: bulk CSV import for a product catalog.

```
Mission:      Find failure modes in CSV bulk import that scripted tests
              (valid-file happy path, one malformed-row case) don't cover.
In scope:     File upload UI, row validation, partial-failure handling,
              progress/cancel controls.
Out of scope: CSV export (separate feature), permissions/roles.
Time budget:  60 minutes.
Tours used:   Boundary tour (file size, row count, field length limits),
              Error-handling tour (network drop mid-upload, cancel mid-import).
Tester/date:  J. Rivera, 2026-09-22

Findings:
[00:12] Uploading a 0-row CSV (header only) shows "Import successful,
        0 rows" instead of a validation warning — repro: upload header-only
        file — severity guess: Low (confusing, not destructive)
[00:31] Cancelling an in-progress import (500/2000 rows done) leaves those
        500 rows committed with no rollback and no indication to the user
        which rows landed — repro: start import of 2000-row file, click
        Cancel at ~25% progress bar — severity guess: High (silent partial
        data state)
[00:45] Field exceeding 500 chars in a "notes" column truncates silently
        on import instead of rejecting or warning — severity guess: Medium

Coverage note:
Covered:      Boundary tour on file size/row count, error-handling tour on
              cancel and network-drop paths.
Not reached:  Concurrent imports by two users on the same catalog — ran out
              of time budget.
Follow-up:    New charter needed for concurrent-import race conditions.
```

### Tours (pick the ones matching the mission)

- **Boundary tour.** Push every input and limit to its edges: minimum/maximum field length, zero/empty/null, the largest file or payload the system claims to accept (and one byte past it), rate limits, pagination edges. Complements `test-case-design-techniques`' boundary value analysis by doing it live, against the real system, instead of against a spec.
- **Error-handling tour.** Deliberately break the "happy" conditions the feature assumes: kill the network mid-action, submit invalid or malformed data, cancel or interrupt a multi-step flow partway through, revoke a permission or session mid-session. This tour is where partial-failure and inconsistent-state bugs live — exactly what the CSV import example above surfaced.
- **Configuration tour.** Vary the environment and configuration the feature runs under: locale/timezone, screen size/viewport, user role or permission level, feature flags on/off, browser/OS combination. Bugs found here are often invisible in the single configuration a developer tested locally.

### Bug report: bad vs. good

**Bad report** (unreproducible — what a developer actually receives and can't act on):

```
Title: CSV import broken
CSV import doesn't work. Broken when uploading a file. High priority, please fix ASAP.
```

**Good report** (rewritten with full repro, environment, and evidence):

```
Title: Cancelling a CSV import mid-upload leaves partial rows committed
       with no indication of which rows landed

Preconditions: Logged in as a Catalog Manager role. A CSV file with 2000
               valid product rows is prepared locally.

Steps to reproduce:
  1. Navigate to Catalog > Bulk Import.
  2. Upload the 2000-row CSV file.
  3. While the progress bar is between 20-30% (roughly 500 rows), click
     the "Cancel" button.

Expected result: Either the import fully rolls back (zero rows committed)
                 or the UI clearly states how many rows were committed
                 and which ones, so the catalog state is known.

Actual result: The import stops, but the ~500 rows already processed
               remain committed in the catalog with no rollback and no
               summary of which rows were affected. Reopening the import
               screen shows no record of the partial run.

Environment: Staging, build 2026.09.22-rc3, Chrome 128 on macOS 14.6,
             Catalog Manager role, catalog "eu-store-01".

Evidence: screen recording attached (import-cancel-partial.mp4, 0:00-0:45
          shows cancel click and resulting catalog state); network log
          attached showing the last committed row ID before cancel.

Severity: High — rationale: silent partial-write leaves the catalog in
          an unknown state with no audit trail, and Catalog Managers have
          no way to detect or reverse it without a database query.
Priority: P1 for next release — rationale: bulk import is used weekly by
          every store operator; this is a realistic, repeatable action
          (cancel is a visible, expected button) not an edge case.
```

The good version needs no follow-up question to act on: a developer can reproduce it from the steps alone, confirm the environment matches, and understand why it's rated High/P1 without re-deriving the reasoning.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Exploratory testing isn't real testing since there's no script to point to" | A charter with a stated mission, scope, time-box, and coverage note is a repeatable, reviewable artifact at the mission level even though the exact clicks vary — dismissing it as "not real" is usually a way to skip writing the charter, not a real methodological objection. |
| "I found the bug, that's enough, the developer can figure out repro steps" | The tester was the only person with the state on screen at the moment of failure; asking the developer to "figure it out" later, from a vague title, routinely costs far more time than capturing the steps would have taken in the moment. |
| "We'll skip the charter, everyone knows what to test" | "Everyone knows" produces the same few obvious areas getting re-explored every session while whole areas (config combinations, error paths) never get touched — a charter is what makes coverage a deliberate choice instead of habit. |
| "It's a High severity bug, that's self-explanatory" | A label with no stated rationale forces every future reader to re-derive or just trust the judgment; a one-line rationale (business impact, likelihood, blast radius) is what makes triage decisions auditable and consistent across reporters. |
| "I'll just click around for a while and see what I find" | Unscoped, untimed exploration with no findings log is indistinguishable after the fact from "I didn't check that area" — the session provides no evidence of what was actually covered. |
| "The screenshot shows the bug, I don't need to write out the steps" | A screenshot shows a single end state, not the path to reach it; without ordered steps and preconditions, the same screen can be unreachable for whoever tries to verify the fix. |

## Red Flags

- A bug report a developer can't reproduce because steps, preconditions, or environment/build details are missing or vague
- Exploratory sessions with no charter, no time-box, and no findings log — indistinguishable from unstructured clicking
- No record of what a session actually covered, so the same areas get re-explored repeatedly while others are never touched
- Severity or priority assigned with no stated rationale, just a label
- "Exploratory testing" that turns out to be informal manual regression of the happy path with no real mission or scope
- A filed bug with a screenshot/video but no ordered reproduction steps or environment details
- Sessions that run past their time-box with no coverage note explaining what was skipped

## Verification

- [ ] A written charter exists for the session (mission, in/out scope, time-box, tester, date) before exploration began
- [ ] At least one named tour (boundary, error-handling, configuration, or another matched to the mission) guided the session, recorded in the charter
- [ ] A findings log was kept during the session, with entries timestamped as they occurred, not reconstructed afterward
- [ ] A coverage note exists at session close stating what was covered, what was skipped, and whether a follow-up charter is needed
- [ ] Every filed bug report includes preconditions, exact ordered steps, expected result, actual result, environment/build info, and evidence (screenshot/video/log)
- [ ] Every filed bug report states a severity/priority with an explicit one-line rationale, not a bare label
