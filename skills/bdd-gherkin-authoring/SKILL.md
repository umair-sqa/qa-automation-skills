---
name: bdd-gherkin-authoring
description: Guides agents through an honest evaluation of BDD/Gherkin (Cucumber, Reqnroll — the maintained successor to the now end-of-life SpecFlow — Behave) — when it earns its overhead as shared team language versus when it's pure indirection over ordinary test code — and how to write declarative, non-duplicated step definitions when it is used. Use when introducing BDD to a team, reviewing .feature files for quality, or when a Gherkin suite has become imperative, duplicated, or unread by anyone outside engineering.
---

# BDD/Gherkin Authoring

## Overview

BDD earns its overhead only when the Gherkin layer genuinely functions as shared language read by non-engineers and as living documentation someone consults. Absent that, it's an extra translation layer between test code and reality, with all the maintenance cost and none of the communication benefit. This skill covers deciding whether to adopt it and, if adopted, how to keep it declarative and DRY.

## When to Use

- Deciding whether to introduce Cucumber/Reqnroll/Behave (or similar) for a new or existing test suite.
- Reviewing `.feature` files or step definitions for quality.
- An existing BDD suite has drifted into imperative, click-by-click steps or has near-duplicate step definitions across features.
- NOT for: general UI locator/wait patterns (see ui-test-automation-patterns) — Gherkin is a specification layer on top of whatever automation actually drives the app, not a replacement for it.

## Core Process

1. **Establish who actually reads the .feature files before adopting BDD.** If product managers, support, or business stakeholders will genuinely open and review scenarios as part of their workflow, BDD's shared-language benefit is real. If the honest answer is "only the engineers who wrote the step definitions," a plain test suite in the team's normal language will be less overhead for the same coverage.
2. **If adopting, write scenarios at the business-rule level, not the interaction level** — see the declarative vs imperative examples below. A scenario should read as a specification of behavior, not a transcript of clicks.
3. **Design step definitions for reuse across features from the start**: extract common givens (`Given a user with an expired subscription`) into shared step libraries scoped by domain concept, not copy-pasted per feature file.
4. **Push implementation detail down, not up.** Step definitions may call page objects, API helpers, or fixtures — but the `.feature` file itself should never need to change when the underlying UI implementation changes, only when the business behavior changes.
5. **Periodically audit for step-definition duplication** — near-identical step implementations across multiple feature files are a sign the step vocabulary needs consolidating into a shared glossary.
6. **Periodically audit whether the "living documentation" claim still holds** — if no non-engineer has opened the feature files in months, treat that as a signal to either fix the collaboration process that was supposed to keep them relevant, or drop the BDD layer rather than keep paying its overhead for a benefit that isn't materializing.

## Techniques and Patterns

### Declarative vs imperative Gherkin

```gherkin
# BAD: imperative, UI click-by-click instructions in disguise
Scenario: Renew subscription
  Given I navigate to "/account"
  When I click the button with id "renew-2"
  And I wait for the modal to appear
  And I click the button labeled "Confirm"
  Then I should see the text "Success" on the page

# GOOD: declarative, describes business behavior
Scenario: User with an expired subscription can renew
  Given a user with an expired subscription
  When the user renews their subscription
  Then their subscription status is "active"
  And a renewal confirmation is sent to the user
```

The imperative version is a UI test wearing a Gherkin costume — it breaks on any DOM change and tells a non-engineer nothing about the actual business rule being verified. The declarative version survives UI refactors untouched and reads as a specification a product manager could actually review and agree is correct.

### Avoiding step-definition duplication

- Maintain a shared step glossary per domain concept (e.g., "user state" steps, "subscription" steps, "payment" steps) rather than letting each feature file's author write their own phrasing for the same underlying condition.
- When a new scenario needs "a user with X," check the existing step library before writing a new `Given` — near-duplicate steps (`Given a user with an expired subscription` vs `Given the user's subscription has expired`) fragment the vocabulary and double the maintenance surface for the same setup logic.
- Parameterize steps (`Given a user with a subscription in "<status>" status`) instead of writing a near-identical step per status value.

### When BDD is worth it vs when it's indirection

| Signal | Worth the overhead | Pure indirection |
|---|---|---|
| Who reads .feature files | PMs/support/stakeholders review them regularly | Only the engineers who wrote the step defs |
| Step definitions | Thin glue calling shared page objects/API helpers | Step defs contain the actual test logic, feature files are a thin wrapper |
| Scenario language | Business-rule level ("a user with an expired subscription") | Click-by-click UI instructions |
| Change trigger | Feature files change only when business behavior changes | Feature files change on every UI tweak |
| Living-documentation claim | Verifiably true — cite recent non-engineer edits/reviews | Asserted but no non-engineer has opened the files in months |

### Tooling notes

- **Cucumber** (JS/Ruby/Java): the most common choice, large ecosystem, works with most CI setups; the step-definition-duplication failure mode described above is also the most commonly reported complaint about it in practice.
- **Reqnroll** (.NET): the actively maintained successor to SpecFlow — SpecFlow itself was end-of-lifed by Tricentis on 2024-12-31 (repos deleted; do not recommend it for a new suite), and Reqnroll is its community-forked, drop-in replacement for teams in the Visual Studio/.NET ecosystem. The same declarative-vs-imperative discipline applies — neither tool prevents imperative steps any more than Cucumber does.
- **Behave** (Python): lighter-weight, fits teams already using Python for other test tooling (pytest, etc.); worth comparing against just using pytest with well-named test functions if the non-engineer-readership case for BDD isn't actually present.
- None of these tools enforce declarative phrasing or prevent step duplication — that discipline is a team practice, not a tooling feature. Choosing between them should follow the team's existing language stack, not a belief that one tool solves the discipline problem the others don't.

### Migrating away from BDD when it isn't earning its keep

If the audit in step 6 above shows the living-documentation claim isn't holding, don't leave the suite in limbo — either:

1. **Fix the process**, if the intent is still real: schedule a recurring review with the stakeholders who were supposed to read the scenarios, and make feature-file review part of the actual acceptance process for a story, not an afterthought.
2. **Or migrate the scenarios to plain test code**, mapping each declarative scenario to an equivalent test function with the same assertions — this is usually mechanical if the steps were already declarative and thin, and it removes the step-definition indirection layer with no coverage loss.

Leaving a Gherkin layer in place "because we already wrote it" after establishing nobody reads it keeps 100% of the translation overhead for 0% of the communication benefit — that's a worse position than either committing to the process fix or migrating off it.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "BDD makes tests self-documenting so we don't need any other docs" | Self-documenting only if someone outside engineering actually reads the scenarios; otherwise it's an extra abstraction layer with the same documentation gap as a suite with no Gherkin at all, plus more code to maintain. |
| "Let's add Cucumber, it's the industry standard for QA" | Popularity isn't a fit criterion. If no stakeholder outside engineering will read or review the `.feature` files, the collaboration benefit BDD is sold on doesn't exist for this team, and it's paying step-definition overhead for zero return. |
| "We'll write imperative steps for now, we can make them declarative later" | Imperative steps get consumed by dozens of scenarios before "later" arrives, and rewriting them then means touching every scenario that references them. Declarative phrasing costs the same to write the first time and is what makes the suite resilient to UI change at all. |

## Red Flags

- Gherkin steps that are literally UI click-by-click instructions (`I click the button with id "X"`, `I wait for the modal`) rather than business-rule descriptions.
- Step definitions duplicated near-identically across multiple feature files instead of shared from a common step library.
- `.feature` files that change every time the UI changes, rather than only when business behavior changes — a sign the abstraction has leaked implementation detail upward.
- `.feature` files sold as "living documentation" that no non-engineer has opened, commented on, or referenced in months.
- A step glossary that has grown multiple near-synonymous steps for the same underlying setup condition.
- A BDD suite kept in place after an audit shows nobody outside engineering reads it, with no decision made to either fix the review process or migrate off it.
- New scenarios copy-pasted from an existing feature file and edited in place rather than composed from the shared step library.

## Verification

- [ ] For each feature file, at least one recent (last few months) review comment, edit, or reference from someone outside engineering exists, or the "living documentation" claim is retired for that suite.
- [ ] Scenario steps read as business-rule descriptions, not UI interaction transcripts — spot-check a sample against the declarative/imperative table above.
- [ ] A shared step-definition library exists and is referenced across feature files rather than each file defining its own near-duplicate steps.
- [ ] A search across step definitions for near-identical implementations (same setup logic, different phrasing) turns up zero unconsolidated duplicates.
- [ ] Feature files did not require edits for the most recent pure-UI refactor (styling/DOM change with no business-behavior change) — if they did, that's evidence of leaked implementation detail.
