# FairDrop Presentation Guide

## Core problem

FairDrop sells 500 limited seats while thousands of legitimate users and bots may compete for them.

The system ensures that request speed, refreshing, duplicate requests, and bot automation cannot create extra queue priority or duplicate tickets.

## User flow

```text
Login
  -> Join Drop
  -> Enter Fair Queue
  -> Check Queue Status
  -> Become Eligible
  -> Claim Allocation
  -> Receive Ticket
```

Each participant receives a stable FIFO queue sequence. Refreshing, reopening the page, or joining repeatedly does not improve that sequence.

## How FairDrop prevents bots from receiving tickets

1. Every action passes through the Abuse Engine.
2. Excessive requests, duplicate attempts, token replay, and ownership mismatches are detected.
3. Suspicious traffic can receive `429` throttling or `403` blocking.
4. A claimant must have valid participation and queue records.
5. Only queue positions within the available capacity are eligible.
6. Redis Lua scripts reserve seats atomically.
7. MongoDB stores the durable allocation.
8. Unique constraints prevent duplicate allocations and overselling.

Therefore, repeatedly refreshing or sending requests faster does not create a better position or an additional ticket.

## How the simulator works

The simulator creates lightweight identities such as `sim-user-000001`. It does not create thousands of browsers or Clerk accounts.

Bounded workers send real actions through the existing FairDrop services, MongoDB Atlas, and Upstash Redis. The configured request rate is a maximum target; the actual rate depends on real datastore latency and capacity.

The simulation stops when:

- every virtual-user workflow finishes;
- the configured duration expires;
- an administrator clicks **Stop simulation**; or
- an unrecoverable simulator failure occurs.

Afterward, aggregate metrics are calculated and the isolated simulator drop and temporary data are cleaned up.

## Simulator scenarios

- **Normal Traffic:** Join drop, enter queue, check status, recover session, and claim allocation.
- **Request Flood:** Repeated joins and status requests at high frequency.
- **Bot Swarm:** Coordinated aggressive virtual users competing for seats.
- **Duplicate Attempts:** Repeated drop joins, queue joins, and allocation claims.
- **Token Replay:** Reused, malformed, expired, or cross-user queue tokens.
- **Queue Manipulation:** Repeated attempts to gain queue priority.
- **Mixed Attack:** A configurable combination of all traffic profiles.

## Pages to present

| Page | What to demonstrate |
|---|---|
| `/queue` | Stable FIFO position that survives refreshes and repeated joins |
| `/admin/simulator` | Run virtual users and show real progress, RPS, latency, throttling, and allocations |
| `/admin/threats` | Show suspicious, throttled, and blocked traffic |
| `/admin/fairness` | Show participation, queue, retry, and normal-versus-attack fairness metrics |
| `/admin/experiments` | Run baseline-versus-FairDrop experiments |
| `/admin/reports` | Present the final comparison and integrity results |
| `/ticket` | Show a ticket after a valid successful allocation |

## Recommended presentation flow

1. Explain the problem: 500 seats and potentially 50,000 competing users.
2. Show the public flow from login to queue and ticket.
3. Refresh `/queue` and demonstrate that the position remains unchanged.
4. Open `/admin/simulator` and run a controlled mixed attack.
5. Explain that these are real service operations from lightweight virtual users.
6. Open `/admin/threats` and explain throttling and blocking.
7. Open `/admin/fairness` and explain how legitimate and attack traffic are measured.
8. Open `/admin/experiments` and run a small baseline-versus-FairDrop experiment.
9. Open `/admin/reports` and show latency, queue, allocation, abuse, and integrity results.

## Recommended demo test case

Open `/admin/simulator` and enter:

| Configuration | Value |
|---|---:|
| Virtual users | `100` |
| Duration | `60` seconds |
| Concurrency | `100` |
| Request rate | `250` requests/second |
| Seed | `12345` |
| Scenario | `MIXED_ATTACK` |

Leave the mixed-distribution field blank to use the default distribution, or enter:

```json
{
  "NORMAL_TRAFFIC": 65,
  "REQUEST_FLOOD": 10,
  "BOT_SWARM": 10,
  "DUPLICATE_ATTEMPTS": 5,
  "TOKEN_REPLAY": 5,
  "QUEUE_MANIPULATION": 5
}
```

Click **Start Simulation** and verify:

- the run reaches a terminal status;
- progress, real requests, actual RPS, and P95 latency appear;
- attack attempts are measured;
- duplicate queue entries remain zero;
- duplicate allocations remain zero;
- overselling remains zero;
- temporary simulator data is cleaned up.

## Optional 5,000-user stress test

Use this only after verifying that the Upstash quota and MongoDB capacity are available:

| Configuration | Value |
|---|---:|
| Virtual users | `5000` |
| Duration | `300` seconds |
| Concurrency | `500` |
| Request rate | `2000` requests/second |
| Seed | `12345` |
| Scenario | `MIXED_ATTACK` |

A healthy result should have no unexpected server errors, duplicate queue entries, duplicate allocations, or overselling. Actual RPS may remain below the configured target because the simulator exercises real remote services.

Do not run the 5,000- or 50,000-user workload while the Upstash request quota is exhausted. Redis-unavailable errors and resulting `5xx` responses would make the result invalid.

## Closing statement

> FairDrop combines stable FIFO queueing, abuse detection, signed queue tokens, atomic Redis allocation, and durable MongoDB records so bots cannot gain priority through speed or retries, while duplicate tickets and overselling remain prevented.
