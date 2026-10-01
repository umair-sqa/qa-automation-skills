---
name: mobile-test-automation
description: Guides agents through mobile-specific automation concerns — Appium/Espresso/XCUITest/Detox tool choice, device farm vs emulator/simulator strategy, OS/device fragmentation, flaky gesture and animation timing, app-state reset between tests, and offline/permission-prompt coverage. Use when writing or reviewing mobile UI automation, deciding device coverage before a release, or diagnosing mobile-specific flakiness.
---

# Mobile Test Automation

## Overview

Mobile automation carries risks that web automation doesn't: real hardware fragmentation, OS-level permission dialogs, animation timing that varies by device performance, and app lifecycle/state that must be reset between runs. This skill covers the mobile-specific decisions that a web-test playbook doesn't address.

## When to Use

- Writing or reviewing Appium, Espresso, XCUITest, or Detox test code.
- Deciding device/OS coverage for a release (device farm vs emulator/simulator vs real-device lab).
- A mobile suite is flaky specifically around gestures, animations, or app-state leakage between tests.
- The app depends on permissions (camera, location, notifications) or degraded network handling and neither is covered by automation.
- NOT for: general locator/wait patterns already covered generically in ui-test-automation-patterns (this skill assumes those and adds mobile-specific concerns on top).

## Core Process

1. **Pick the tool based on what the app is built with**, not general popularity: Espresso for native Android, XCUITest for native iOS, Detox for React Native (gray-box, faster and less flaky than black-box tools for RN specifically because it synchronizes with the JS thread), Appium when cross-platform reuse of test logic across iOS/Android/hybrid outweighs the setup and flakiness cost of driving both platforms through one WebDriver-based layer.
2. **Define the device/OS matrix from real usage data**, not assumption — pull the actual OS-version and device-model distribution from analytics/crash reporting, and size coverage to where users actually are, including the long tail of non-flagship devices and at least one OS version back from latest.
3. **Choose device farm vs emulator/simulator per test tier**: emulators/simulators for fast, deterministic CI runs on every PR; a device farm (or a real-device lab) for pre-release gates that need real hardware behavior (GPU rendering, real sensors, actual carrier network conditions, OEM skin quirks) that emulators can't reproduce.
4. **Reset app state explicitly between tests** — decide per-suite whether a fresh install or a clear-data-and-relaunch is required, and make it explicit in test setup rather than relying on incidental cleanup from the previous test.
5. **Isolate gesture and animation timing from fixed sleeps**: wait on the actual UI condition (element idle, animation-complete signal, specific view state) rather than a duration tuned to whichever device happened to be used to write the test.
6. **Add explicit coverage for permission prompts and degraded network/offline states** wherever the app's behavior depends on them — these are exactly the paths most likely to be skipped because they don't come up in a developer's default local setup.
7. **Gate release sign-off on at least one real-device pass**, not emulator-only green, for anything shipping to production.

## Techniques and Patterns

### Device farm vs emulator/simulator

| Concern | Emulator/Simulator | Device Farm / Real Device |
|---|---|---|
| Speed / cost per run | Fast, cheap, parallelizable in CI | Slower, costs per device-minute |
| GPU/rendering fidelity | Approximated | Real |
| Sensors (GPS, accelerometer, camera) | Simulated/faked | Real |
| Carrier/network conditions | Simulated | Can be genuinely real |
| OEM skin/firmware quirks (Samsung, etc.) | Not represented | Represented |
| Best use | Every PR, fast feedback | Pre-release gate, nightly, flagship regression bugs |

Never let "it passed on my emulator" substitute for at least one real-device pass before a release — emulator-only coverage misses exactly the class of bug (rendering glitches, OEM permission dialog wording, real sensor behavior) that reaches users first.

### Handling OS/device fragmentation

- Build the test matrix from telemetry (top N device models + top N OS versions by active install share), not from what's convenient to buy or provision.
- Explicitly include at least one OS version behind current, and at least one lower-resolution/older device — "we only need to test on the newest OS version" inverts the actual risk profile, since users lag OS adoption for months to years.
- Parameterize tests over screen size/density where layout logic branches on it, rather than writing device-specific test copies.

### Gesture and animation timing

```js
// BAD (Detox): fixed wait tuned to one device's animation speed
await new Promise((resolve) => setTimeout(resolve, 2000));
await element(by.id('card')).swipe('left');

// GOOD: wait on the actual condition, then act
await waitFor(element(by.id('card'))).toBeVisible().withTimeout(5000);
await element(by.id('card')).swipe('left');
await waitFor(element(by.id('next-card'))).toBeVisible().withTimeout(5000);
```

Animation duration varies by device performance and by whether "reduce motion" is enabled — a fixed sleep tuned on a fast device flakes on a slow one and vice versa. Wait on the resulting state, not the estimated duration.

### Resetting app state between tests

- **Fresh install** when a test needs to validate first-run behavior (onboarding, initial permission prompts, empty-state UI) — reinstalling is the only reliable way to get back to that state.
- **Clear app data / relaunch** for most other tests — faster than a reinstall, still guarantees no state leakage (logged-in session, cached data, local DB) from a previous test.
- Never rely on "the app was already in roughly the right state from the last test" — this is the single most common source of order-dependent mobile test flakiness.

### Offline and permission-prompt coverage

- Simulate degraded network (airplane mode toggle, network-condition throttling, or a proxy that injects latency/drops) as first-class test scenarios wherever the app has offline-handling logic (cached views, queued writes, retry banners) — untested offline paths are usually the least reliable in production because they're rare to hit manually.
- Automate the permission-prompt flow (grant, deny, "ask again") for every OS-level permission the app requests — a denied-permission path that silently breaks a feature is a common support-ticket source that's fully automatable.

### Tool landscape at a glance

| Tool | Platform | Approach | Best fit |
|---|---|---|---|
| Espresso | Android native | White-box, in-process, synchronizes with UI thread | Native Android apps needing fast, low-flake CI runs |
| XCUITest | iOS native | White-box, in-process (Apple's own framework) | Native iOS apps, tightest Xcode/CI integration |
| Detox | React Native | Gray-box, synchronizes with JS thread and native queue | React Native apps specifically — avoids the flakiness of black-box tools guessing at RN's async bridge |
| Appium | Cross-platform (iOS/Android, native/hybrid/web) | Black-box, WebDriver protocol | Teams needing one test codebase across platforms, or hybrid/webview-heavy apps, at the cost of more setup and generally higher flake than native tools |

### CI emulator matrix strategy

- Run a small, fixed matrix (e.g., 2-3 API levels/OS versions × 1-2 screen densities) on every PR for fast feedback — this is not the place for exhaustive coverage.
- Expand to the full telemetry-derived matrix only in a scheduled (nightly/pre-release) job, since real-device or broad-emulator-matrix runs are too slow and costly for per-PR feedback loops.
- Track flake rate per matrix cell (device/OS combination) over time — a cell that's persistently flakier than the rest is often revealing a real device-specific bug, not noise to retry away.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It passed on my emulator, that's good enough to ship" | Emulators don't reproduce real GPU rendering, OEM permission-dialog wording, or actual sensor/network behavior. Bugs that only manifest on real hardware are exactly the ones that reach users first when emulator-only coverage is treated as sufficient. |
| "We only need to test on the newest OS version" | Users adopt new OS versions over months to years, not overnight; the actual crash/error telemetry usually skews toward older OS versions still in the install base. Testing only the newest version tests the smallest current segment of users. |
| "We'll handle device fragmentation manually since users mostly have flagship phones" | Telemetry, not assumption, should decide this — mid-range and budget devices are frequently the majority of an install base outside a narrow set of markets, and manual spot-checks don't scale to a release cadence faster than monthly. |
| "The gesture test is flaky, let's just add a retry" | A retry masks a real timing dependency (animation duration, device performance variance) without fixing it, and the same test will resurface as flaky the next time CI runners get slower or a device farm queue backs up. Waiting on the actual post-gesture state removes the flake at its source. |
| "We tested it on the simulator with network throttling off, offline mode is basically the same code path" | Network conditions on real devices interact with OS-level connectivity APIs, background task scheduling, and radio state in ways a simulator's throttling doesn't reproduce — offline/degraded-network behavior needs its own explicit test, not an inference from the online path. |

## Red Flags

- Entire suite hardcoded to one device resolution or one OS version, with no parameterization for others.
- Zero real-device (device farm or physical lab) coverage anywhere before a release ships.
- No test coverage for permission-prompt flows (grant/deny/ask-again) despite the app requesting camera, location, or notification permissions.
- No test coverage for offline/degraded-network behavior despite the app having offline-handling logic (queued writes, cached views, retry banners).
- Tests relying on gesture timing tuned to one specific device's animation speed (fixed-duration sleeps around swipes/transitions).
- Tests that assume leftover state from the previous test run (no explicit fresh-install or clear-data step) and fail only when run in a different order.

## Verification

- [ ] The device/OS test matrix is derived from actual telemetry (crash reporting or analytics), not from convenience or assumption, and is documented somewhere reviewable.
- [ ] At least one real-device (not emulator/simulator-only) pass is recorded before each production release.
- [ ] Every OS-level permission the app requests has an automated test for at least grant and deny paths.
- [ ] Every offline/degraded-network code path (queued writes, cached views, retry UI) has a corresponding automated test.
- [ ] `grep` (or equivalent) across the mobile suite for fixed-duration waits around gestures/animations returns zero unjustified hits.
- [ ] Test setup explicitly resets app state (fresh install or clear-data) before each test class/suite, verifiable in the setup/teardown code.
