---
name: regression-and-golden-scenario-management
description: Guides the ongoing curation of a regression suite around a small set of "golden scenarios" — the flows whose breakage would be a business-critical incident — and mapping a code change to the regression scenarios it actually affects, instead of defaulting to "run everything" or letting the suite grow forever. Use when deciding what regression coverage a new feature needs long-term, when a PR needs a scoped set of regression checks rather than the full suite, when a regression suite has grown every release with nothing ever retired, or when a feature is deprecated and its regression scenarios need retiring.
---

# Regression and Golden Scenario Management

## Overview

A regression suite exists to catch real regressions, not to accumulate a permanent record of everything ever tested. Left uncurated, it grows by one feature's worth every release and shrinks by nothing, until it's too slow to run on every change and too large for anyone to review the full results before merging. This skill is the ongoing discipline of deciding what belongs in the regression set as the product evolves: naming the true golden scenarios, mapping changes to the subset of the suite they actually touch, and retiring scenarios whose feature is gone. It is not suite cleanup (`test-suite-simplification-and-dedup`) or a one-time framework migration (`test-suite-migration-and-deprecation`) — it's the recurring decision process that keeps the regression set itself trustworthy.

## When to Use

- Deciding whether a new feature's tests belong in the regression suite, and at what tier
- Selecting which regression scenarios a specific PR/change needs to run, before merge
- A regression suite's size or runtime has grown every release with no corresponding removal
- A feature is being deprecated or removed and its regression coverage needs a retirement decision
- Nobody can currently state, without checking, why a given regression scenario exists or what business risk it protects

**When NOT to use:** Scoping the regression pass for a specific release go/no-go decision — that's `release-readiness-and-exit-criteria`. Initial risk scoring for a brand-new feature before any tests exist — that's `test-strategy-and-risk-based-planning`. Removing duplicate assertions across test levels within an already-stable suite — that's `test-suite-simplification-and-dedup`. This skill sits between those: it's the standing policy for what stays in, gets tagged for selective execution, or gets removed from the regression set over time.

## Core Process

1. **Write down explicit golden-scenario criteria before classifying anything.** A scenario is golden if its breakage would plausibly become a business-critical incident: material revenue impact, legal/compliance exposure, safety, or a flow used by the large majority of active users/traffic. Everything else that's merely present in the suite is incidental coverage — useful, but not what the regression set exists to protect above all else.

2. **Classify every current regression scenario against those criteria**, not against how long it's been in the suite. Tag each as golden, incidental (keep, but don't over-invest), or candidate-for-removal. A scenario's age or the effort it took to write is not a classification criterion.

3. **Build a change-to-regression mapping** (tags, ownership metadata, or a dependency graph) so a given diff can be translated into the owned subset of golden + relevant incidental scenarios, instead of "run everything" or "run whatever's fast." See the tagging technique below.

4. **Run a small, always-on core smoke set plus the mapped subset for every change**, and reserve a full regression run for changes that touch shared/core paths (auth, payments, shared components) or for scheduled release gates — not for every commit by default.

5. **Retire a scenario the moment the feature it protects is deprecated or removed**, not on a "maybe later" schedule. A golden scenario for a feature that no longer exists is not golden coverage anymore — it's CI time spent verifying nothing.

6. **Re-review the golden list on a fixed cadence (e.g., quarterly or every major release), not only when someone happens to notice bloat.** Business priorities shift; a flow that was golden two years ago may now be incidental, and a newly critical flow may not yet be tagged golden at all.

7. **Track suite size and runtime against feature count release over release.** A regression set that only grows, release after release, with nothing ever demoted or retired, is the leading indicator that curation has stopped happening even if each individual addition seemed reasonable at the time.

8. **Log every classification and retirement decision** (what changed, why, who approved) so the next reviewer isn't reconstructing intent from scratch — an undocumented "it's golden because it's always been golden" is not a criterion, it's an assumption.

## Techniques and Patterns

### Change-based test selection via tags and an ownership map

Tag every regression scenario with the module/domain it protects, and maintain a small ownership map from source paths to tags:

```yaml
# regression-ownership.yaml
paths:
  src/checkout/**:        [checkout, payments]
  src/auth/**:            [auth]
  src/catalog/search/**:  [search]
  src/catalog/sort/**:    [catalog-incidental]
shared_paths:             # any change here triggers the full suite, not just mapped tags
  - src/shared/**
  - src/payments/gateway-client/**
```

```
# CI step (pseudocode)
changed_files = diff(base, head)
tags = map_paths_to_tags(changed_files, regression-ownership.yaml)
if any(changed_files matches shared_paths):
    run(full_regression_suite)
else:
    run(core_smoke_set + scenarios_tagged(tags))
```

A PR touching only `src/catalog/sort/**` runs the core smoke set plus `catalog-incidental` scenarios — seconds, not the full suite. A PR touching `src/payments/gateway-client/**` (a shared path) triggers a full run, because payment-gateway changes are exactly the kind of blast radius a narrow tag can't safely bound. The mapping is a living artifact: update it whenever a new module is added, and audit it periodically for paths that were never assigned a tag (an unmapped path silently falls back to "runs nothing extra," which is its own risk to catch in review).

### Golden vs. incidental — worked example

An e-commerce catalog and checkout product, classifying five existing regression scenarios:

| Scenario | Impact if broken | Traffic/usage | Classification | Rationale |
|---|---|---|---|---|
| Checkout completes and charges the correct total | Revenue loss, possible over/undercharging | Near 100% of paying users | **Golden** | Direct revenue + trust impact; textbook business-critical |
| Login succeeds with valid credentials | Total lockout of the product | Near 100% of users | **Golden** | No feature is reachable if this breaks |
| Order confirmation email is sent after purchase | Support burden, user confusion, no revenue loss (order still completes) | 100% of orders | **Incidental** | Annoying if broken, not an incident on its own; downgrade from golden, keep covered |
| Product list "sort by price ascending" | Minor UX inconvenience | Small fraction of sessions use non-default sort | **Incidental** | Real but low-stakes; a regression here is not a business-critical event |
| Legacy CSV export for a sunset admin report | None — feature removed last quarter | Zero, feature deprecated | **Retire** | No feature exists to protect; remove from active suite now |

The two golden scenarios earn the tightest ownership (run on virtually every change touching their domain, reviewed first on any failure). The incidental ones stay in the suite but don't gate every unrelated change. The retired one is deleted, not skipped — its feature is gone.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Just add every new feature's tests to the regression suite forever, more coverage is always safer" | Unreviewed growth is how regression suites become slow and untrustworthy — every addition without an equivalent curation pass compounds runtime and dilutes attention paid to the scenarios that actually matter. |
| "We don't have time to figure out which regression tests are relevant to this change, just run the whole suite" | The mapping is a one-time investment per module, not a per-PR cost — without it, "run everything" becomes the permanent default and CI time grows without bound as the suite grows. |
| "This scenario used to matter so we'll never remove it, even though the feature was deprecated two years ago" | A scenario's history is not a reason to keep running it once the feature it protects no longer exists — it's pure CI cost with zero remaining business risk retired. |
| "The mapping might miss something, so let's just run the full suite on every change to be safe" | That's what the shared-paths fallback and scheduled full runs are for — a documented, bounded fallback for genuinely broad changes, not an excuse to skip building the mapping at all. |
| "The golden list was decided at launch, it doesn't need revisiting" | Business priority shifts as the product evolves; a periodic re-review is how a once-critical flow gets correctly downgraded and a newly critical one gets correctly promoted. |
| "More golden scenarios means more safety" | Marking everything golden collapses the prioritization the classification exists to provide — if every scenario blocks every change, nothing is actually prioritized and review fatigue sets in exactly where it matters most. |

## Red Flags

- Regression suite size or runtime grows every release with nothing ever retired or demoted
- Regression runs take long enough that nobody actually reviews the full results before merging
- No documented criteria exist for what makes a scenario "golden" versus merely present in the suite
- Regression coverage for a deprecated/removed feature is still executing on every run, wasting CI time
- Every PR triggers a full regression run regardless of which files changed, with no change-to-scenario mapping in place
- The golden-scenario list hasn't been reviewed in over a year despite the product changing materially in that time
- A scenario is called "golden" with no stated business-impact rationale attached — just tenure in the suite

## Verification

- [ ] A current, documented list of golden scenarios exists, each with a stated business-impact rationale (revenue, legal, safety, or traffic share) — not just suite tenure
- [ ] A change-to-regression mapping (tags, ownership file, or dependency graph) exists and was exercised on the most recent PR reviewed, producing a scoped subset rather than a full run
- [ ] Shared/core paths that trigger a full regression run are explicitly listed, not left to ad hoc judgment
- [ ] Suite size and runtime are tracked release over release, with a recorded curation review each period (additions matched by demotions/retirements, not perpetual growth)
- [ ] Every deprecated/removed feature's regression scenarios were deleted from the active suite (not left skipped) with a linked deprecation reference
- [ ] The most recent golden-vs-incidental classification review has a date and an owner, not an undated assumption
