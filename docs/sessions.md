# Reliable sessions and recovery

## Purpose

FairDrop application sessions provide short-lived server-side recovery references for an authenticated user. They make browser refreshes, reconnects, tabs, and devices recoverable without treating browser memory as authoritative.

**Session expiration is not data expiration.** Participation, queue entries, positions, allocations, fairness snapshots, and independently managed abuse state are never deleted when a FairDrop session expires.

## Clerk and FairDrop responsibilities

Clerk remains the only authentication system. FairDrop does not store passwords or reproduce Clerk sessions. After Clerk authenticates a user, FairDrop stores an application session bound to that Clerk user ID and references the current durable state.

The Redis session contains a random server-generated opaque ID, owner Clerk ID, optional active drop ID, participant/queue/allocation references, timestamps, and `ACTIVE` status. It contains no Clerk secret, queue signing secret, credentials, tokens, or passwords.

## Storage, TTL, and cookie transport

Active sessions are stored only in Upstash Redis at:

```text
fairdrop:{environment}:session:{sessionId}
```

`FAIRDROP_SESSION_TTL_SECONDS` configures the TTL. It defaults to 1,800 seconds and accepts 1 second through 24 hours (short values are useful only for controlled tests). Redis TTL performs cleanup; no permanent session history or cleanup worker is created.

`GET /api/session` refreshes the TTL because recovery is a meaningful application action. There is no polling loop, heartbeat endpoint, WebSocket, or SSE stream.

The opaque identifier is transported only in the `fairdrop_session` cookie. It is `HttpOnly`, `SameSite=Lax`, scoped to `/`, and marked `Secure` in production. Session content is not stored in the cookie and the ID is not returned to JavaScript. The endpoint is read/recovery-oriented; state-changing drop, queue, and allocation routes continue to rely on their existing Clerk/API protections.

## Recovery flow

`GET /api/session` authenticates with Clerk, applies the existing Phase 4 request protection, reads the opaque session if present, checks ownership, then reconstructs current state from MongoDB in this order:

1. Participation for the authenticated user.
2. Durable queue entry for that participant.
3. Durable allocation for that participant.
4. Drop context, including historical inactive drops.

The service writes only the refreshed Redis session. It never posts a drop join, queue join, or allocation claim. Queue position is always the immutable durable queue sequence, and an allocation always returns the same durable seat.

If a session has stale references, the references are overwritten with the authoritative durable values. A foreign, expired, malformed, or deleted session is never exposed; a new opaque session is created after state recovery.

## Tabs, devices, and expiration

Tabs and devices may receive separate valid sessions. They resolve the same Clerk-bound durable participant, queue entry, queue sequence, position, and allocation. Session creation cannot create durable drop/queue/allocation records, so concurrent recovery is safe.

If a Redis session disappears or expires, the next authenticated recovery creates a replacement session from MongoDB. If the drop is closed, its historical participation, queue, and allocation remain readable to the owner; recovery does not reopen it or make a new allocation.

## Failure and consistency model

Redis is required to read/create the active application session. If Redis or MongoDB is unavailable, recovery returns `503 SESSION_UNAVAILABLE`; it never fabricates a durable state. Redis session loss does not affect MongoDB records. If durable records conflict, only a consistent participant → queue → allocation chain is returned, and session references are repaired rather than invented.

The service retrieves only the current user’s records and performs no global scans. The current implementation intentionally has no real-time updates; users recover state on page load or another meaningful request.

## Known limitations and future work

Session recovery is not a simulator, Experiment Engine, dashboard, ticket-purchase flow, payment flow, cancellation workflow, transfer workflow, or real-time transport. Later phases can add carefully rate-limited realtime state delivery without changing the durable recovery invariants.
