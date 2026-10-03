# Fair Queue Engine

## Architecture and lifecycle

Phase 3 uses an explainable first-valid-entry ordering rule. An authenticated Clerk user must already have a durable participation for the active drop. Their queue identity is `dropId + participantId`.

For a new queue entry, Upstash atomically checks the participant entry hash and increments the drop sequence in one Lua script. Concurrent duplicate requests therefore receive the same reservation. MongoDB then persists the durable queue entry, and Redis finalizes the ordered-set membership. A response is successful only after both durable persistence and Redis finalization succeed.

MongoDB enforces unique indexes for `dropId + participantId` and `dropId + sequence`. Duplicate-key races return the existing entry.

## Position

Phase 3 exposes the immutable server-generated sequence as `position`. It does not compact positions when entries leave. Refreshing, reconnecting, or sending repeated requests returns the same durable queue entry and cannot improve its position.

## Redis keys

```text
fairdrop:{environment}:queue:sequence:{dropId}
fairdrop:{environment}:queue:entry:{dropId}:{participantId}
fairdrop:{environment}:queue:order:{dropId}
```

- `sequence` is an atomic `INCR` counter.
- `entry` is a hash containing the minimal queue state: queue entry ID, drop ID, participant ID, sequence, status, and server join time.
- `order` is a sorted set scored by sequence. It supports ordered access and constant-time queue-size retrieval without scanning MongoDB.

No credentials, Clerk tokens, signing secrets, or browser-provided position values are stored.

## Idempotency and failures

Redis reserves a sequence before MongoDB persistence. If MongoDB temporarily fails, retrying reuses that reservation. Redis is never treated as proof of durable success, and no response invents a fallback position when Redis is unavailable. An existing MongoDB entry can rebuild its Redis lookup and ordering state.

## Queue token

The server issues an HMAC-SHA256 token containing version, drop ID, participant ID, queue entry ID, issue time, and expiry. It contains no position or secret. Status requests verify its signature, expiry, authenticated participant, drop, and queue entry. Full replay detection is intentionally deferred.

Configure a private `QUEUE_TOKEN_SECRET` of at least 32 characters in `.env.local` and in the deployment platform. Never use a `NEXT_PUBLIC_` prefix.

## Current limitations

- Phase 3 does not remove or advance entries, compact positions, or allocate seats.
- Recovery after complete loss of the Redis sequence counter requires an operational reconciliation step that is not part of this phase.
- Tokens expire after 24 hours; an idempotent queue join issues a fresh token for the same entry.
- There is no bot detection, rate limiting, replay detection, behavioral scoring, or advanced fairness score.

Phase 4 can add abuse controls and replay detection without changing the durable queue identity or ordering rule.
