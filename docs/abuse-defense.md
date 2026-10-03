# Abuse and Bot Defense

FairDrop Phase 4 uses deterministic behavioral rules to limit abusive traffic on the drop and queue critical path. It does not claim to identify every bot and does not use AI, machine learning, demographic data, or an arbitrary bot probability.

## Signals and policy

All thresholds are centralized in `lib/abuse-policy.ts`. They are initial development values, not scientifically optimal limits.

| Signal | Window / threshold | Meaning |
| --- | --- | --- |
| Overall burst | More than 20 requests in 10 seconds | Short request burst |
| Overall rate | More than 60 requests in 60 seconds | Sustained request volume |
| Drop joins | More than 5 in 60 seconds | Excessive drop-entry attempts |
| Queue joins | More than 5 in 60 seconds | Excessive queue-entry attempts |
| Queue status | More than 60 in 60 seconds | Excessive status polling |
| Duplicate joins | 4 suspicious, 10 throttle, 25 block | Repeated idempotent drop/queue joins |
| Invalid tokens | 3 suspicious, 10 throttle, 20 block | Failed signature, malformed, or expired tokens |
| Token ownership mismatch | 2 suspicious, 6 throttle, 12 block | Cross-participant or cross-drop token use |
| Invalid requests | 4 suspicious, 10 throttle, 20 block | Malformed request bursts |
| Requests while throttled | 5 | Escalates a throttle to a temporary block |

One duplicate, invalid request, expired token, refresh, or normal retry does not block a user.

## Classifications and enforcement

- `NORMAL`: no active abnormal signal; request is allowed.
- `LOW_RISK`: a mild signal exists; request is allowed.
- `SUSPICIOUS`: explicit repeated or combined signals exist; request is normally allowed and recorded.
- `THROTTLED`: a configured rate/event limit was crossed; request receives HTTP 429 and `Retry-After` for 30 seconds.
- `BLOCKED`: severe repeated events or five requests while throttled; request receives HTTP 403 for 300 seconds.

Enforcement never changes a durable queue entry, sequence, or position.

## Redis state

```text
fairdrop:{environment}:ratelimit:user:{clerkId}:short
fairdrop:{environment}:ratelimit:user:{clerkId}:minute
fairdrop:{environment}:ratelimit:{action}:{clerkId}:{dropId|global}
fairdrop:{environment}:abuse:user:{clerkId}:signals
fairdrop:{environment}:abuse:throttle:{clerkId}
fairdrop:{environment}:abuse:block:{clerkId}
```

Request counters use 10- or 60-second TTLs. Aggregated signals expire after 300 seconds, throttles after 30 seconds, and blocks after 300 seconds. Two Lua scripts atomically increment counters, set initial expirations, evaluate active enforcement, and prevent concurrency bypasses. Redis stores aggregate counters rather than an unlimited event history.

## Failure behavior

Abuse evaluation fails open if Redis is unavailable: the request continues without a new abuse decision and a safe server log is emitted. This avoids falsely blocking legitimate users during an infrastructure outage. Existing drop and queue correctness rules still enforce their own MongoDB and Redis requirements independently.

## Identity and privacy

Authenticated Clerk ID is the primary identity. Drop, participant, and queue-entry identity are taken only from server-owned state. Client-provided classifications, counters, identities, or positions are ignored. IP enforcement is not used because this project does not currently establish a deployment-independent trusted client-IP source; arbitrary forwarding headers are not trusted.

## Known limitations

- Thresholds require tuning with controlled measurements.
- Distributed attackers using many valid accounts are not solved by per-user counters alone.
- Full queue-token replay detection is not implemented.
- No permanent bans or admin abuse dashboard exist.
- The system is behavioral abuse detection, not proof that a user is human or automated.

Phase 5 may consume aggregate measurements for fairness analysis, but it must not reinterpret these deterministic security classifications as AI-generated bot probabilities.
