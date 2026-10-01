---
name: cross-browser-and-device-testing
description: Guides agents through building a data-driven browser/device test matrix using real usage analytics instead of testing only what's convenient or exhaustively testing every combination. Covers prioritizing browsers/OS/devices by actual user share, choosing between cloud device grids and local-only testing, responsive breakpoint strategy, and documenting browser-specific bugs with regression guards. Use when defining what browsers/devices/OS versions a suite should cover, when a cross-browser bug is found, or when reviewing an existing test matrix for gaps or bloat.
---

# Cross-Browser and Device Testing

## Overview

The test matrix (which browser/OS/device combinations get automated coverage) should be derived from how real users actually access the product, not from convenience ("we already have Chrome set up") or from misplaced thoroughness ("test every combination"). This skill defines how to build, prioritize, and maintain that matrix, and how to handle the browser-specific bugs it surfaces.

## When to Use

- Setting up a new test suite's browser/device coverage for the first time.
- Reviewing whether an existing matrix still matches the current user base.
- A bug report comes in that only reproduces on a specific browser, OS, or device.
- Deciding whether to add a cloud device grid (BrowserStack, Sauce Labs, LambdaTest) or rely on local/CI-native browser support (e.g., Playwright's bundled browser binaries).
- A stakeholder asks "should we support Safari/IE/some old Android version?"

**Do not use this skill's process for** unit or API-level tests that have no rendering or client-runtime surface — cross-browser concerns apply to UI/E2E layers, not business logic tests.

## The Matrix-Building Process

1. **Pull real usage analytics before deciding anything.** Get browser, OS, device, and screen-resolution breakdowns from the actual product's analytics (Google Analytics, Mixpanel, Amplitude, server-side user-agent logs, or a CDN's edge analytics) — not industry-wide market share reports, which don't reflect this specific product's user base. Segment by the metric that matters most to the business (e.g., revenue-weighted sessions for an e-commerce site, not raw pageviews) if the tool supports it.
2. **Rank combinations by real share and set coverage tiers.** A common split:
   - **Tier 1 (full regression suite, every release):** combinations covering the top ~80-90% of real sessions.
   - **Tier 2 (smoke/critical-path only, every release):** the next slice, roughly 90-98% cumulative.
   - **Tier 3 (spot-checked periodically, not gating):** long-tail combinations below that — cover them if a specific bug report demands it, not by default.
3. **Decide local vs. cloud grid per tier.** Tier 1 combinations that match what's easily run locally or in standard CI runners (e.g., latest Chrome/Firefox/Edge on Linux) can run natively in CI. Combinations requiring real device hardware, older OS/browser pairings, or actual mobile Safari/Chrome (not just a desktop viewport emulation) need a cloud grid or physical device lab — emulated viewports do not catch real rendering engine or touch-input differences.
4. **Define the responsive breakpoint strategy separately from the browser matrix.** Breakpoints (mobile/tablet/desktop, or specific pixel ranges tied to the design system) are a layout-testing concern and can mostly be tested via viewport resizing in a single reliable browser; reserve the full cross-browser matrix for interaction/rendering-engine differences, not for re-testing every breakpoint in every browser (that's the combinatorial explosion this skill exists to avoid).
5. **When a browser-specific bug is found, isolate and document it before treating it as generic.** Confirm the bug reproduces only in the specific browser/version/OS combination (not just "reported by someone using Safari" — verify), file it with the exact reproducing combination, and note the reason (CSS rendering quirk, JS engine difference, feature support gap) rather than a generic bug description.
6. **Add a regression guard for confirmed browser-specific bugs.** Once fixed, add a targeted test (in the matrix's cloud-grid or physical-device tier if that's where it reproduces) so the same bug can't silently return in a future release. A generic-browser test suite that never targets the specific combination that broke will not catch the regression.
7. **Re-review the matrix on a cadence (e.g., quarterly) against updated analytics.** Browser/OS/device share shifts — a matrix frozen at launch drifts from reality within a year.

## Techniques and Patterns

**Example tiered matrix (illustrative, derived from a hypothetical analytics pull):**

| Tier | Combination | Share of sessions | Coverage |
|---|---|---|---|
| 1 | Chrome (latest 2) / Windows & macOS | 52% | Full regression, every release, local CI |
| 1 | Safari (latest 2) / macOS & iOS | 21% | Full regression, every release, cloud grid (real WebKit) |
| 1 | Chrome / Android (top 2 OEM devices) | 14% | Full regression, every release, cloud grid or physical lab |
| 2 | Firefox (latest) / Windows | 6% | Smoke suite only |
| 2 | Edge (latest) / Windows | 4% | Smoke suite only |
| 3 | Samsung Internet, older Android WebView, IE11-class legacy | <3% combined | Spot-checked only on specific bug reports |

**Isolating a browser-specific bug — checklist before filing:**
- Confirm on at least two versions of the suspect browser (bug in "Safari 17" vs. "all Safari" changes the fix and the regression guard scope).
- Confirm it does *not* reproduce in the top Tier 1 browser — if it does, it's not browser-specific, it's a general bug mislabeled.
- Capture the rendering engine (WebKit/Blink/Gecko) since bugs often track engine, not brand — e.g., a "Safari bug" reproducing in all WebKit-based browsers (including some in-app webviews) is an engine-level CSS/JS issue, not a vendor quirk.

**Cloud grid vs. local decision factors:**

| Factor | Favors local/CI-native | Favors cloud grid (BrowserStack/Sauce Labs/LambdaTest) or physical lab |
|---|---|---|
| Browser/OS availability | Latest evergreen browsers on common CI OS images | Real Safari/iOS, real Android hardware, older OS/browser pairs |
| Touch/gesture fidelity | Not needed (desktop-only feature) | Required (mobile-specific interactions, real touch events) |
| Cost sensitivity | Free/cheap, runs on existing CI minutes | Paid per-minute or per-seat, budget it against Tier 1/2 combination count only |
| Parallelism needs | High-volume unit/API-adjacent UI checks | Lower-volume, targeted Tier 1 cross-browser regression runs |

**Browser-specific bug report template (use this instead of a generic bug description):**

```
Title: [Engine/Browser] Short description
Reproducing combination: Safari 17.4 / macOS 14.4 (WebKit)
Does NOT reproduce on: Chrome 128 / Windows 11 (confirmed)
Rendering engine: WebKit
Root cause category: CSS flex-gap not respected in nested grid (rendering quirk)
  vs. JS engine difference (e.g., Intl.NumberFormat locale data gap)
  vs. missing feature support (e.g., :has() selector, ResizeObserver edge case)
Regression guard: added to Tier 1 cloud-grid suite, tagged `browser:webkit`
```

Filing it this way — with the confirmed reproducing *and* non-reproducing combinations, plus the rendering engine — prevents the bug from being re-triaged from scratch by whoever picks it up, and makes clear which regression-guard tier it belongs in.

**Responsive breakpoint strategy, separated from the browser matrix:**

| Breakpoint | Typical range | Test approach |
|---|---|---|
| Mobile | ≤480px | Viewport resize in one reliable browser (layout-only concern) |
| Tablet | 481-1024px | Viewport resize, same browser |
| Desktop | ≥1025px | Viewport resize, same browser |
| Mobile browser rendering (as opposed to just layout) | N/A — device-specific | Folded into Tier 1 real-device/cloud-grid coverage, not re-tested per breakpoint |

Keep these two concerns (layout at a breakpoint vs. rendering-engine behavior) in separate test suites — collapsing them into "test every breakpoint in every browser" is exactly the combinatorial explosion this skill exists to avoid.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We tested it in Chrome, that covers basically everyone" | Only true if analytics confirm it — for many products Safari/iOS and Android WebView represent a large, revenue-relevant share that Chrome-only testing never exercises. Pull the real numbers before assuming. |
| "Let's test every OS x browser x version combination to be thorough" | The combinatorial matrix grows unmanageable and most combinations represent near-zero real usage — that budget is better spent on deeper coverage of the top tiers plus faster feedback loops. |
| "Safari's weird, we'll just tell users to use Chrome" | Telling real paying/using customers to switch browsers is a support and retention cost, and it doesn't remove Safari-using sessions from the analytics — it just means those bugs go unfound until support tickets pile up. |
| "We emulated a mobile viewport in Chrome, that's the same as testing mobile" | Viewport emulation catches layout/breakpoint issues but not real touch-event timing, mobile Safari/WebView rendering quirks, or OS-level input behavior — Tier 1 mobile coverage needs a real device or cloud grid. |
| "It's an edge case browser, not worth a regression test once we fix it" | A confirmed bug without a regression guard reappears silently in the next refactor — the fix without the test is only half done. |

## Red Flags

- 100% of automated runs execute against a single browser with no analytics-backed justification for that choice.
- A test matrix that was chosen once at project inception with no reference to actual user analytics, and hasn't been revisited since.
- Known browser-specific bugs on record with no test guarding against their regression.
- Mobile coverage that consists entirely of desktop-browser viewport emulation, with no real device or cloud-grid run in the pipeline.
- Bug reports labeled generically ("UI broken") when they are actually browser/engine-specific and would be better tracked and fixed with that context.

## Verification

- [ ] The current test matrix's tiering is backed by an analytics export (screenshot, CSV, or dashboard link) pulled within the last quarter, not by assumption.
- [ ] Tier 1 combinations include at least one real (non-emulated) mobile browser/device run, via cloud grid or physical device.
- [ ] Every confirmed browser-specific bug in the tracker has a corresponding regression test tagged to the reproducing combination.
- [ ] The responsive breakpoint tests are separated from full cross-browser runs (not duplicated across every browser in the matrix).
- [ ] The matrix has a documented next-review date or cadence.
