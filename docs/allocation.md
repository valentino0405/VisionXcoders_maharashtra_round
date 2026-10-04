# Atomic seat allocation

## Phase 6 rule

FairDrop uses the immutable Phase 3 queue sequence as the allocation cohort. For a drop capacity of `N`, only queue sequences `1..N` are eligible. A participant at sequence `N + 1` cannot obtain a seat by claiming earlier or clicking faster than an eligible participant. For `fairdrop-demo`, the effective capacity is capped at 500, so only sequences 1–500 can allocate.

Seat identity is deterministic, not random: sequence `1` maps to `fairdrop-demo-seat-001`, sequence `500` maps to `fairdrop-demo-seat-500`. This is a queue allocation model, not a lottery or AI selection process.

## Claim flow

`POST /api/allocation/claim` accepts only `{ "dropId": "fairdrop-demo" }`. Clerk supplies the authenticated user identity. The server reads the participation and durable queue entry, derives the participant, queue sequence, allocation ID, and seat ID, evaluates Phase 4 abuse controls, then performs the allocation. Clients cannot provide allocation identity, queue data, seat data, or eligibility.

The endpoint returns `201` for a newly durable allocation and `200` with the identical allocation for a normal idempotent retry. It returns a conflict for a non-participant, missing queue entry, inactive drop, sequence beyond capacity, sold-out/conflict state, and `503` if Redis is unavailable before a new reservation can be made.

## Atomicity and durability

Redis is the atomic coordination layer. One Lua script atomically checks an existing participant reservation, verifies `queueSequence <= capacity`, verifies the deterministic seat is unreserved, and writes both participant and seat reservation hashes. It never uses a separate read/increment/write sequence.

MongoDB is the durable allocation truth. After Redis reserves a seat, the service upserts an `ALLOCATED` record. If Mongo persistence fails, the Redis reservation remains tied to the same participant and seat, so a retry persists that exact reservation rather than selecting another seat. If Redis finalization fails after Mongo succeeds, the durable result still remains idempotent and a retry safely repairs the Redis mirror.

MongoDB enforces unique `allocationId`, `(dropId, participantId)`, `(dropId, seatId)`, and `(dropId, queueEntryId)`. These constraints protect the durable layer even if a Redis key is lost or a process races unexpectedly.

## Redis keys

```text
fairdrop:{environment}:allocation:participant:{dropId}:{participantId}
fairdrop:{environment}:allocation:seat:{dropId}:{seatId}
```

The participant hash contains only allocation ID, drop/participant/queue identity, queue sequence, deterministic seat ID, allocation status, and timestamp. It never contains Clerk secrets, tokens, Upstash credentials, or queue signing secrets. A counter is unnecessary because the immutable sequence directly selects the deterministic seat.

## Explicit boundaries

This phase does not implement payment, checkout, ticket issuance, transfers, cancellation, refunds, seat release, waitlist advancement, random winner selection, an allocation dashboard, or a simulator. It does not change queue entries, queue sequences, or Phase 4 classifications.
