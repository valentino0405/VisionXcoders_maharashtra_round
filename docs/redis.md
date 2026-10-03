# Upstash Redis

FairDrop uses Upstash Redis because its HTTP-based, connectionless client is well suited to Next.js and serverless deployments. It provides managed Redis without requiring Docker or a local Redis server.

## Setup

Create or select a Redis database in the [Upstash Console](https://console.upstash.com/). In the database's REST API section, copy the REST URL and REST token into the project root's `.env.local` file:

```dotenv
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Restart the Next.js development server after changing environment variables. Test connectivity with:

```text
GET /api/health/redis
```

A successful check returns HTTP 200 with `{ "redis": "ok" }`. A failed check returns HTTP 500 with `{ "redis": "error" }` without exposing credentials.

## Key naming convention

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

## Security

- Keep the REST URL and token server-side and never prefix them with `NEXT_PUBLIC_`.
- Do not commit `.env.local` or include credentials in logs, browser responses, or client components.
- Configure the same environment variable names in the deployment platform's protected server-side settings.
- Rotate the REST token in Upstash immediately if it is ever exposed.
