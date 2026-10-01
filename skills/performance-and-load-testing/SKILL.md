---
name: performance-and-load-testing
description: Guides agents through load, stress, soak, and spike testing done properly with tools like k6, JMeter, Gatling, or Locust — defining SLOs and pass/fail thresholds before running a test, establishing a measurable baseline, modeling realistic traffic, and correlating results with APM/tracing data to find the actual bottleneck. Use when setting up a load test for the first time, before a release that changes traffic-sensitive code paths, when investigating a performance regression, or when reviewing an existing load-testing setup for rigor.
---

# Performance and Load Testing

## Overview

Load testing only produces a decision-useful result when pass/fail criteria and a baseline exist before the test runs — otherwise it produces a number nobody can act on. This skill covers defining SLOs up front, modeling realistic traffic instead of flat synthetic load, running the standard test types (load, stress, soak, spike) for the questions they actually answer, and tracing results back to a root cause rather than stopping at "latency went up."

## When to Use

- Setting up performance testing for a service or endpoint that has none.
- Before a release that changes a traffic-sensitive path (new query, added N+1 call, cache change, new external dependency).
- Investigating a reported slowdown or a production incident tied to load.
- Reviewing whether an existing load-testing setup has real thresholds and a repeatable baseline, or is just a one-time report.

**Do not use this skill's full process for** a quick local sanity check of a dev-only endpoint with no production traffic exposure — but do still avoid drawing scaling conclusions from that kind of ad hoc check (see Red Flags).

## The Core Process

1. **Define SLOs and pass/fail thresholds before running anything.** Pick the metrics that map to real user or business impact — typically a latency percentile (p95 or p99, not average, which hides tail latency), an error-rate ceiling, and a throughput target. Write them down as explicit numbers *before* the test executes:
   - Example: "p95 latency < 300ms, p99 < 800ms, error rate < 0.1%, sustained at 500 req/s for 15 minutes."
   - A test run without a pre-committed threshold is an exploration, not a gate — label it as such and don't let it block or pass a release.
2. **Establish a baseline before making the change under test.** Run the same test scenario against the current (pre-change) build/environment and record the same metrics. Without this, "latency is 450ms" is meaningless — 450ms might be a regression or an improvement depending on what it was before.
3. **Model realistic traffic, not flat synthetic load.** Define:
   - **Ramp pattern:** gradual ramp-up/ramp-down (e.g., 0 to peak over 2 minutes) rather than an instant step function, unless specifically testing spike behavior.
   - **Think-time:** pauses between a virtual user's requests that mirror real user pacing (a human doesn't fire requests back-to-back with zero delay).
   - **Request mix:** proportion of endpoint/action types matching production traffic (e.g., 70% reads, 20% writes, 10% search) pulled from real traffic logs/APM data, not an even split across endpoints.
4. **Choose the right test type for the question being asked:**
   - **Load test:** expected peak traffic sustained for a representative duration — answers "does it meet SLOs under normal peak?"
   - **Stress test:** traffic increased past expected peak until something breaks — answers "where is the ceiling and how does it fail (gracefully vs. catastrophically)?"
   - **Soak test:** moderate load sustained for hours — answers "do we leak memory/connections/disk over time?"
   - **Spike test:** sudden traffic jump with no ramp — answers "does autoscaling/queueing handle a burst without cascading failure?"
5. **Run the test against an environment that's representative of production** (comparable instance sizes, comparable data volume — an empty or tiny dataset changes query plans and cache behavior). Note explicitly if the environment differs and how that limits the result's validity.
6. **Correlate results with APM/tracing data, not just the load tool's own output.** When a threshold is breached, pull the corresponding window from the APM/tracing system (e.g., distributed traces, DB query time, GC pauses, connection pool saturation) to find where the time actually went — the load tool tells you *that* it's slow, tracing tells you *why*.
7. **Record the run as a repeatable baseline artifact** (config, thresholds, results, environment description) so the next run — whether a scheduled regression check or a pre-release gate — has something to compare against.
8. **Gate the release on the result if thresholds were breached**, and treat the failure like any other failing test: block, investigate, fix, re-run — not "note it and ship anyway."

## Techniques and Patterns

**Example k6 script skeleton with explicit thresholds (pass/fail defined in code, not eyeballed after):**

```js
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  scenarios: {
    ramping_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },   // ramp-up
        { duration: '15m', target: 100 },  // sustained peak
        { duration: '2m', target: 0 },     // ramp-down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<800'],
    http_req_failed: ['rate<0.001'],
  },
};

export default function () {
  const res = http.get('https://staging.example.com/api/search?q=shoes');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(Math.random() * 3 + 1); // think-time
}
```

**Realistic request mix (weighted scenarios instead of one flat script):**

| Endpoint | Share of traffic | Notes |
|---|---|---|
| GET /product/:id | 45% | Read-heavy, cacheable |
| GET /search | 25% | Read, uncacheable, DB-heavy |
| POST /cart | 15% | Write |
| POST /checkout | 5% | Write, external payment dependency |
| GET /account | 10% | Read, auth-gated |

Build this as separate scenarios/weights in the load tool rather than one script hitting a single endpoint — a single-endpoint test never reveals contention effects (e.g., checkout writes blocking search reads on the same connection pool).

**Correlating with APM after a threshold breach — checklist:**
- Pull the trace waterfall for the slowest percentile of requests in the breached window; identify the single largest span (DB query, external API call, serialization, queueing).
- Check DB connection pool utilization and query plan changes during the run, not just after.
- Check for GC pause spikes or CPU throttling on the app server during the same window.
- If containerized/autoscaled, check whether scaling events lagged the traffic ramp (a stress/spike test specifically exists to catch this).

**Baseline comparison table (kept per release or per major change):**

| Run | Date | p95 | p99 | Error rate | Environment | Result |
|---|---|---|---|---|---|---|
| Baseline (pre-change) | 2026-08-01 | 210ms | 640ms | 0.02% | staging, prod-sized | pass |
| Candidate (post-change) | 2026-09-20 | 340ms | 910ms | 0.05% | staging, prod-sized | fail (p95, p99 both breach) |

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We'll load test right before launch if there's time" | Load testing that's scheduled as a "nice to have" gets cut under deadline pressure, which means the first real load test happens in production, with real users as the test subjects. |
| "If it handles 10 concurrent users in dev it'll scale fine" | Dev-scale checks don't exercise connection pool limits, cache eviction under real data volume, autoscaling behavior, or contention between endpoints — none of which show up until traffic and data are closer to production scale. |
| "The load test passed once, we don't need to run it again" | A single passing run isn't a standing guarantee — the next dependency bump, schema change, or traffic pattern shift can silently regress it. Load testing needs to be a repeatable, re-run gate, not a one-time certificate. |
| "Average latency looks fine, ship it" | Averages hide tail latency; a p95/p99 breach can mean a meaningful fraction of real users have a bad experience even while the average looks healthy. |
| "The load test failed but it's probably just the test environment being slow" | That's a hypothesis, not a finding — correlate with APM/tracing data before dismissing a threshold breach, since "probably the environment" is exactly the kind of assumption that lets a real regression ship. |

## Red Flags

- A load test run with no pass/fail threshold decided in advance — results are discussed only after the fact, with no pre-committed number to compare against.
- Load testing done exactly once, ever, with no repeatable baseline or scheduled re-run.
- Performance regressions caught only in production because there is no pre-release load gate in the pipeline.
- Synthetic load that hits a single endpoint at a flat, unrealistic rate with no think-time or ramp pattern.
- Load test "passed" but the investigation stopped at the load tool's summary output, with no correlation against APM/tracing data when a threshold was close to breaching.
- Environment used for the load test is meaningfully smaller or has far less data volume than production, with no caveat noted on the result.

## Verification

- [ ] SLO thresholds (latency percentile, error rate, throughput) were written down and committed before the test ran, and are visible in the test config or scenario definition (e.g., k6 `thresholds`, JMeter assertions).
- [ ] A baseline run exists (pre-change or previous release) with the same scenario and thresholds, available for comparison.
- [ ] The traffic model includes a ramp pattern, think-time, and a request mix reflecting real production traffic proportions (with a source cited: APM data, access logs, or analytics).
- [ ] The test type (load/stress/soak/spike) matches the question being asked, and is named as such in the report.
- [ ] Any threshold breach was investigated with APM/tracing data, and the root cause (not just the symptom) is documented.
- [ ] The run's config, thresholds, and results are saved as a repeatable artifact for the next comparison, not just reported verbally or in a chat message.
