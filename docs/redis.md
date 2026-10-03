# Redis key naming convention

FairDrop Redis keys must use this structure:

```text
fairdrop:{environment}:{resource-type}:{identifier}
```

- `fairdrop` is the application namespace.
- `{environment}` separates deployments, such as `development`, `staging`, and `production`.
- `{resource-type}` identifies the kind of data stored by a future feature.
- `{identifier}` is the feature-specific unique identifier, such as a drop, session, seat, resource, or experiment ID.

Namespacing prevents collisions between FairDrop and other applications using the same Redis service. The environment segment also prevents test or development data from affecting production data. Future phases must construct keys with all four segments and use one stable resource-type name per feature.

Reserved patterns for future phases are:

```text
fairdrop:{environment}:queue:{dropId}
fairdrop:{environment}:session:{sessionId}
fairdrop:{environment}:ratelimit:{identifier}
fairdrop:{environment}:reservation:{seatId}
fairdrop:{environment}:lock:{resource}
fairdrop:{environment}:experiment:{experimentId}
```

These patterns are documentation only. Phase 1 does not create any of these keys or implement the associated systems.
