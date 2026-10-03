# FairDrop fairness measurement

## Purpose and boundary

Phase 5 is a read-only measurement framework for behavioral access and system outcomes. It produces explainable indicators from trusted server-side observations. It does not profile protected characteristics, score people, decide whether an outcome is fair, allocate seats, or modify an existing queue position.

This is deliberately not an AI fairness score. A numerical difference is evidence to inspect in context, not a verdict.

Each `FairnessObservation` represents one de-duplicated subject in one bounded experiment/drop window. The observation is assembled on the server from existing Drop, Queue, and Abuse outcomes. Clients cannot submit their own group, queue position, or metric result.

## Behavioral groups

The five groups exactly mirror Phase 4 classifications: `NORMAL`, `LOW_RISK`, `SUSPICIOUS`, `THROTTLED`, and `BLOCKED`. They are behavioral/access classifications derived by the Abuse Engine, never demographics or identity attributes. Classification and enforcement are separate: a `SUSPICIOUS` user can have no throttle, while a user can be measured as having experienced throttling or a block.

## Snapshot and storage

`createFairnessSnapshot` requires an `experimentId`, `dropId`, chronological `startedAt` and `endedAt`, and trusted observations. Its output includes the total population, each group population, all metrics, explicit numerator/denominator metadata, the ISO time window, interpretation, and limitations.

`saveFairnessSnapshot` is a server-only Mongo helper. It upserts one aggregate snapshot per experiment in `fairnessSnapshots`; it is not an API route. The record contains no raw subject IDs, Clerk IDs, queue tokens, or per-request event history. Redis remains the source of high-frequency short-lived Phase 4 counters/state. Mongo is used only for durable summarized measurements.

Because Phase 4 signals are short-lived, a later protected experiment/aggregation service must capture the trusted behavioral outcomes it needs during its chosen window. This phase intentionally does not invent a historical group for Mongo records that were created before measurement was enabled.

## Available metrics

All rates expose `numerator`, `denominator`, `sampleSize`, a reliability label, and a Wilson 95% confidence interval when the denominator is non-zero. The Wilson interval estimates uncertainty for a measured proportion; it is not proof of causality or correctness.

| Metric | Definition and formula | Population / denominator | Interpretation and limitation |
| --- | --- | --- | --- |
| Participation rate | successful participants / join attempts | All recorded drop join attempts | Measures join completion. Retries affect its attempt-based denominator. |
| Queue entry rate | queued participants / successful participants | Successful drop participants | Measures access after joining, not universal fairness. |
| Queue access rate by class | queued group participants / successful group participants | Successful participants in each behavioral group | Observed group difference can reflect behavior and enforcement. |
| Throttle rate | users experiencing throttle / measured users | Unique measured users, overall or group | Exposure to enforcement, not whether a decision was correct. |
| Block rate | users experiencing block / measured users | Unique measured users, overall or group | Exposure to enforcement, not legitimacy or proportionality. |
| Duplicate attempt rate | duplicate attempts / (join attempts + queue attempts) | Relevant attempts, not people | One user may contribute many attempts. |
| Invalid token rate | invalid validations / token validations | Queue-token validation attempts | Breaks out malformed, expired, signature failure, ownership mismatch, and drop mismatch; categories do not establish intent. |

All metrics apply only to the snapshot's `startedAt`–`endedAt` ISO time window. If a denominator is zero, a metric is explicitly `UNAVAILABLE` with `null` values—never `NaN`, `Infinity`, or a made-up percentage.

## Queue-position analysis

For valid successful queue entries, the engine reports minimum, maximum, mean, median/P50, P90, P95, and P99. Percentiles use linear interpolation over sorted values: at percentile `p`, the engine interpolates at array index `(n - 1) × p`. A mean alone is not relied on.

Normalized position is `position / totalQueueSizeAtEntry`. Lower values represent an earlier relative position and allow comparisons across differently sized queues. The comparison output reports both the difference in median normalized position and the ratio, always naming `NORMAL` as the reference group. It also compares queue entry rates as a difference and a rate ratio. These comparisons are descriptive, not automatic labels such as fair/unfair, good/bad, advantage/disadvantage.

## Retry resilience

For every recorded repeat of a valid queue request, the engine compares the first valid queue identity, position, and sequence with the returned retry result. It reports unchanged identity/position/sequence rates and counts any lower (improved) position or sequence. The expected invariant is unchanged values and zero improvements. This measure covers only retries captured by the trusted input.

## Throttle and block impact

When comparable server-collected intervals are supplied, the engine reports mean request rate before/during throttle and request counts before/during/after block expiry, plus the observed during-window change. Its wording is intentionally descriptive: an observed reduction does not show that enforcement caused it without a suitable experiment design and comparable intervals.

## Sample size and uncertainty

Rates with fewer than 10 denominator observations are `LOW` reliability; 10–29 are `LIMITED`; 30 or more are `STANDARD`. These labels only flag sample-size limitations, not a fairness result. Small samples should not produce dramatic conclusions. Distribution metrics report their own sample size and are unavailable when no valid positions exist.

Input validation rejects negative counts, impossible queue positions, invalid timestamps, duplicate subjects, invalid token totals greater than validations, and queue outcomes that contradict participation. This prevents misleading arithmetic.

## Allocation metrics: waiting for Phase 6

Without allocation inputs, `allocationMetrics` is exactly `NOT_AVAILABLE_UNTIL_PHASE_6` and every allocation value is `null`. No value is fabricated in Phase 5.

Phase 6 can call `calculateAllocationMetrics` with trusted `AllocationOutcome` values (`eligible`, `allocated`, group, optional seat ID/timestamp) and a capacity. That interface will measure allocation rate, allocation rate by group, duplicate seat-assignment rate, oversell rate, and seat distribution. It does not allocate, reserve, lock, or select seats.

## Future experiments

A later protected Experiment Engine can collect bounded, trusted observations, create a snapshot, and save the aggregate with the server-only store. It can compare baseline and FairDrop experiments by their explicitly named populations and windows. Phase 5 creates no dashboard, public endpoint, live chart, WebSocket, SSE stream, simulator, or experiment-management workflow.
