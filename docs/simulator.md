# Adversarial simulator

## Architecture and isolation

Phase 8 simulates **virtual users**, not browsers or real people. `runSimulation` assigns compact deterministic virtual identities such as `sim-user-000001`, schedules finite action plans through a bounded worker pool, and aggregates results without retaining a per-request history.

Each production-style run creates a unique temporary `fairdrop-sim-{run}` drop with capacity 500. It uses the existing Drop, Queue, Abuse, Token, Allocation, and Session services directly behind an admin-only server boundary. It never creates Clerk accounts or MongoDB user documents and never consumes `fairdrop-demo`. On completion, cancellation, or failure it removes the temporary drop, simulated participations, queues, allocations, sessions, queue Redis keys, allocation keys, participant keys, and simulator-created abuse keys. Only aggregate `simulationRuns` results remain in MongoDB.

## Configuration and safety

`virtualUsers` supports 1–50,000. Development safety limits are: 500 workers, 300 seconds, 2,000 requests/sec, burst size 100, and jitter up to 10 seconds. Invalid requests are rejected with `SIMULATION_LIMIT_EXCEEDED`; simulations are always finite. The default admin form starts at 100 users rather than a destructive maximum.

A seed deterministically assigns virtual-user profiles and jitter decisions. Reproducibility applies to the simulator schedule and profile assignment; real Redis/Mongo latency and Phase 4 timing can still vary.

## Scenarios

`NORMAL_TRAFFIC`, `REQUEST_FLOOD`, `BOT_SWARM`, `DUPLICATE_ATTEMPTS`, `TOKEN_REPLAY`, `QUEUE_MANIPULATION`, and configurable `MIXED_ATTACK` are supported. Mixed mode defaults to 65% normal, 10% flood, 10% swarm, and 5% each duplicate/token/manipulation traffic. Token replay uses the real signed-token verifier and Phase 4 events; it does not bypass security.

## Workers and metrics

At most `maxConcurrency` workers run. Workers take a shared rate slot before each action, so the simulator never creates 50,000 timers or `Promise.all(50_000)` requests. Metrics are real action outcomes: endpoint/profile traffic, response classes, 429/403 enforcement, latency average/P50/P95/P99/max, duplicate/invalid-token/ownership signals, queue joins/failures, allocation attempts/results, and errors.

The run result also records the configured request-rate target, actual completed-action rate, elapsed time, worker and in-flight peaks, scheduled-action delay, completed/timed-out/cancelled/failed workflows, and aggregate action latency by phase. A configured rate is a ceiling, not a promise: real MongoDB, Upstash, and abuse-control latency can make the measured rate lower. Queue-status polling is read-first; its Redis mirror is repaired only when the queue ordering entry is absent.

## Admin API and UI

All endpoints require Clerk authentication plus a fail-closed `FAIRDROP_ADMIN_CLERK_IDS` server allowlist:

- `POST /api/admin/simulator/start`
- `GET /api/admin/simulator/runs`
- `GET /api/admin/simulator/{runId}`
- `POST /api/admin/simulator/{runId}/stop`

`/admin/simulator` exposes users, duration, concurrency, request rate, seed, scenario, and an optional mixed-distribution JSON field. It polls a run every two seconds only while it is active. There are no WebSockets or SSE.

## Running tests

```text
npm run test:simulator        # 100 and 1,000 virtual-user scenarios
npm run test:simulator:large  # controlled 5,000 virtual-user scenario
```

For manual isolated workloads, open `/admin/simulator`, select the intended scenario, and enter 100, 1,000, 10,000, 25,000, or 50,000 virtual users. Start at 100 and increase concurrency/request rate only after observing Redis, MongoDB, and host capacity. 50,000 virtual users are configurable, but should be run only in a controlled environment with appropriate Redis/Mongo capacity.

## Known limitations

The in-process run manager is suitable for a single development/server instance. A restart, serverless timeout, or multi-instance deployment cannot resume the active worker pool; a durable distributed job runner is deliberately deferred. A seeded run reproduces virtual-user assignment and scheduling decisions, but real datastore latency and enforcement timing are naturally variable. The automated large test is 5,000 virtual users; 50,000 is an explicitly configured operational run, not a routine test command.
