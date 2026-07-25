# Lymit — General-Purpose Rate Limiter

> **A note on naming:** the product is called **Lymit** (renamed from an
> earlier working name, "JRL"). The codebase has been renamed to match:
> the auth/admin service's package is `com.lymit.auth` and its directory
> is `lymit-auth-service`; the frontend's directory is `lymit-frontend`
> and its JS namespace object is `Lymit` (e.g. `Lymit.signUp(...)`). The
> proxy engine's package, `com.rlaas.ratelimiter`, was never tied to the
> old name and needed no change.

Lymit is a Redis-backed rate limiter you drop in front of any backend API.
Register a route pointing at your real backend, attach one or more
policies to it, and traffic through `/r/{routeId}` gets allowed or denied
before it ever reaches your backend — the backend itself is never aware
Lymit exists.

---

## Table of contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Repo layout](#repo-layout)
4. [Running it locally](#running-it-locally)
5. [Deploying (Railway, or similar)](#deploying-railway-or-similar)
6. [The Redis contract](#the-redis-contract)
7. [Concepts: scope, identifier source, algorithm](#concepts-scope-identifier-source-algorithm)
8. [The four algorithms](#the-four-algorithms)
9. [API reference — rate-limiter-service](#api-reference--rate-limiter-service)
10. [API reference — auth/admin service](#api-reference--authadmin-service)
11. [End-to-End Example](#end-to-end-example)
12. [Frontend](#frontend)
13. [Observability](#observability)
14. [Known limitations](#known-limitations)
15. [Troubleshooting](#troubleshooting)
16. [Security checklist before deploying for real](#security-checklist-before-deploying-for-real)

---

## Quick Start

The fastest way to understand Lymit is to protect an existing backend API
with a route and a rate-limit policy.

### Step 1: Create an account

Create a Lymit account through the auth/admin API:

```bash
curl -X POST https://lymit-m1-production.up.railway.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "your-password"
  }'
```

The response contains a JWT token. Use this token for authenticated
management requests.

The deployed auth/admin service is available at:

```text
https://lymit-m1-production.up.railway.app
```

For production usage, use this URL instead of the local `http://localhost:8081`
address shown in local-development examples.

### Step 2: Create a route

Register the backend API you want Lymit to protect:

```bash
curl -X POST https://lymit-m1-production.up.railway.app/api/routes \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My API",
    "targetUrl": "https://api.example.com"
  }'
```

The response contains a `routeId`.

### Step 3: Create a rate-limit policy

Attach a policy to the route:

```bash
curl -X POST https://lymit-m1-production.up.railway.app/api/routes/<routeId>/policies \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "scope": "API_KEY",
    "identifierSource": "HEADER",
    "identifierValue": "X-Api-Key",
    "algorithm": "TOKEN_BUCKET",
    "algorithmConfig": "{\"limit\":100,\"windowSize\":1,\"windowUnit\":\"MINUTE\"}"
  }'
```

This example limits each API key to 100 requests per minute.

### Step 4: Send traffic through Lymit

The deployed rate-limiter proxy is available at:

```text
https://lymit-m2-production.up.railway.app
```

For production usage, use this URL instead of the local `http://localhost:8080`
address shown in local-development examples.

Instead of calling your backend directly:

```text
https://api.example.com
```

send requests through:

```text
http://localhost:8080/r/<routeId>
```

For example:

```bash
curl https://lymit-m2-production.up.railway.app/r/<routeId> \
  -H "X-Api-Key: my-api-key"
```

Lymit evaluates the request against the active policies.

If the request is allowed, Lymit forwards it to your backend.

If the request exceeds the configured rate limit, Lymit returns:

```text
429 Too Many Requests
```

### The complete flow

```text
1. Create Lymit account
        ↓
2. Create a route
        ↓
3. Attach a rate-limit policy
        ↓
4. Send requests to /r/{routeId}
        ↓
5. Lymit checks the policy
        ↓
   ┌───────────────┴───────────────┐
   ↓                               ↓
Allowed                         Denied
   ↓                               ↓
Forward to backend              429 response
```

For a detailed walkthrough, see [End-to-End Example](#end-to-end-example).

## Architecture

Three services, each doing exactly one job, talking to each other through
exactly two shared stores:

```
                                ┌───────────────────────┐
  Browser  ──────────────────▶ │       Lymit frontend    │
                                │  (static HTML/CSS/JS)  │
                                └───────────┬───────────┘
                                            │ REST + JWT
                                            ▼
                                ┌───────────────────────┐
                                │   Lymit auth/admin API  │
                                │  users, routes, policies│
                                └──────┬─────────┬───────┘
                                       │         │
                             writes    │         │  dual-write
                             (source   ▼         ▼  (cache)
                             of truth) ┌────────┐ ┌────────┐
                                       │Postgres│ │ Redis  │
                                       │(Supabase)│ (Upstash)│
                                       └────────┘ └───┬────┘
                                                       │ read-only,
                                                       │ every request
                                                       ▼
                                          ┌─────────────────────┐
      Any client  ──── /r/{routeId} ───▶ │   Lymit proxy engine  │──▶ your backend
                                          │  (the actual traffic) │
                                          └─────────────────────┘
```

- **The proxy engine** (`rate-limiter-service` on disk) is the only piece
  that sees production traffic. It reads `route:*` / `route-policies:*`
  straight from Redis and **never touches Postgres at all**. Every proxy
  instance reads the same Redis, so there's no per-instance staleness the
  way a local in-process cache would have.
- **The auth/admin API** (`lymit-auth-service` on disk) owns sign-up/sign-in
  (JWT) and the actual route/policy management. Postgres is the source of
  truth; every route/policy change is dual-written to Redis in the exact
  shape the proxy reads.
- **The frontend** (`lymit-frontend` on disk) is a static site — landing
  page, auth, and a dashboard with a live per-route status indicator.

Why split it this way: the proxy is the piece under real request load —
keeping it dependency-light (Redis only, no database round trip per
request) means it scales independently of how much admin/CRUD traffic the
other two services see.

---

## Repo layout

```
rate-limiter-service/   the proxy engine (Spring Boot, WebFlux, Redis)
lymit-auth-service/       auth + admin API (Spring Boot, Postgres + Redis)
lymit-frontend/           static frontend (no build step)
```

---

## Running it locally

### 1. Auth/admin service (start this first)

```bash
cd lymit-auth-service
export SUPABASE_DB_URL="jdbc:postgresql://db.<your-project-ref>.supabase.co:5432/postgres"
export SUPABASE_DB_USER="postgres"
export SUPABASE_DB_PASSWORD="<your-db-password>"
export JRL_JWT_SECRET="$(openssl rand -base64 64)"
mvn spring-boot:run
```
Defaults to port `8081`. Tables (`users`, `routes`, `rate_limit_policies`)
are created automatically on first run via
`spring.jpa.hibernate.ddl-auto=update`.

### 2. Proxy engine

```bash
cd rate-limiter-service
mvn spring-boot:run
```
Defaults to port `8080`. **Must point at the same Redis instance** as the
auth service — that shared Redis is the entire mechanism connecting the
two services. It never talks to Postgres.

### 3. Frontend

No build step. Open `index.html` directly, or serve the folder statically
(`npx serve .`). Point `js/config.js`'s `apiBaseUrl` at wherever the
auth/admin service is reachable.

---

## Deploying (Railway, or similar)

Lymit consists of three independently deployable components:

1. `lymit-auth-service`
2. `rate-limiter-service`
3. `lymit-frontend`

The two Spring Boot services can be deployed independently. The frontend
can be hosted on any static hosting provider.

### Deployment architecture

```text
                    Internet
                       │
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
      Frontend                 Proxy Engine
          │                         │
          │                         │
          ▼                         ▼
    Auth/Admin API ────────────► Redis
          │
          ▼
       Postgres

Auth/Admin API:
https://lymit-m1-production.up.railway.app

Proxy Engine:
https://lymit-m2-production.up.railway.app
```

### Production endpoints

| Service | URL |
|---|---|
| Auth/admin service | `https://lymit-m1-production.up.railway.app` |
| Rate-limiter proxy | `https://lymit-m2-production.up.railway.app` |

The frontend should be configured to use the auth/admin service at
`https://lymit-m1-production.up.railway.app`.

Protected backend traffic should be sent through the rate-limiter proxy at
`https://lymit-m2-production.up.railway.app/r/{routeId}`.

The auth/admin service and proxy engine must use the **same Redis instance**.

Postgres is used only by the auth/admin service.

The proxy engine does not connect to Postgres.

### Environment variables

#### Auth/admin service

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_DB_URL` | Yes | PostgreSQL JDBC connection URL |
| `SUPABASE_DB_USER` | Yes | PostgreSQL database username |
| `SUPABASE_DB_PASSWORD` | Yes | PostgreSQL database password |
| `JRL_JWT_SECRET` | Yes | Secret used to sign JWTs |
| `REDIS_URL` | Yes | Redis connection URL |

Example:

```text
SUPABASE_DB_URL=jdbc:postgresql://db.<project-ref>.supabase.co:5432/postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=<your-password>
JRL_JWT_SECRET=<your-generated-secret>
REDIS_URL=<your-redis-url>
```

> If the application configuration has also been fully renamed from JRL
> to Lymit, use the corresponding `LYMIT_*` environment variable names
> defined by the application. The names above should match the actual
> configuration keys used by the deployed code.

#### Proxy engine

| Variable | Required | Description |
|---|---|---|
| `REDIS_URL` | Yes | Must point to the same Redis instance used by the auth/admin service |
| `PORT` | Platform-dependent | HTTP port assigned by the hosting platform |

### Railway deployment

Deploy the services as separate Railway services:

```text
Railway Project
│
├── lymit-auth-service
│
├── rate-limiter-service
│
└── lymit-frontend
```

Configure the required environment variables for each service.

Both Spring Boot services bind using:

```properties
server.port=${PORT:default}
```

Railway provides the `PORT` environment variable at runtime.

### Important: shared Redis

The auth/admin service writes route and policy configuration to Redis.

The proxy engine reads that configuration from Redis.

Therefore:

```text
Auth/Admin Service
        │
        │ writes
        ▼
      Redis
        │
        │ reads
        ▼
   Proxy Engine
```

If the two services use different Redis instances, the proxy will not see
routes or policies created by the auth/admin service.

### Deployment checklist

Before testing the deployed system, verify:

- [ ] Auth/admin service is running.
- [ ] Proxy engine is running.
- [ ] Frontend points to the correct auth/admin API.
- [ ] Both Spring services use the correct `PORT` configuration.
- [ ] Auth/admin and proxy use the same Redis instance.
- [ ] Auth/admin can connect to PostgreSQL.
- [ ] JWT secret is configured through an environment variable.
- [ ] Redis credentials are not committed to source control.
- [ ] PostgreSQL credentials are not committed to source control.
- [ ] CORS allows only the required frontend origin.
- [ ] `/actuator/health` reports the expected service health.

### Verify the deployment

Check the auth/admin service:

```bash
curl https://<auth-service>/actuator/health
```

Check the proxy engine:

```bash
curl https://<proxy-service>/actuator/health
```

Then create a route through the auth/admin service and send a request
through the proxy:

```text
Auth/Admin API
    │
    │ Create route
    ▼
Redis
    │
    │ Route becomes visible
    ▼
Proxy Engine
    │
    │ GET /r/{routeId}
    ▼
Target Backend
```

If the route is created successfully but the proxy returns `404`, verify
that both services are connected to the same Redis instance.

If the deployment logs show that the application started successfully but
the public URL is unreachable, verify that the application is listening on
the platform-provided `PORT`.

## The Redis contract

This is the entire interface between the auth/admin service (writer) and
the proxy engine (reader). Nothing else connects them.

**`route:{routeId}`** — a JSON string:
```json
{
  "routeId": "11f29850-9bea-478c-8f99-2fb071a425d0",
  "customerId": "729de98e-9edf-4f71-ac5a-4b3142b6c07e",
  "targetUrl": "https://api.example.com/v1",
  "active": true
}
```

**`route-policies:{routeId}`** — a JSON array, one entry per policy on that route:
```json
[
  {
    "policyId": "00fe85c8-9ad7-4c1f-99b5-f34d150dc52f",
    "routeId": "11f29850-9bea-478c-8f99-2fb071a425d0",
    "scope": "API_KEY",
    "identifierSource": "HEADER",
    "identifierValue": "X-Api-Key",
    "active": true,
    "algorithm": "TOKEN_BUCKET",
    "algorithmConfig": "{\"limit\":100,\"windowSize\":1,\"windowUnit\":\"MINUTE\"}"
  }
]
```
Note `algorithmConfig` is a JSON **string** nested inside the JSON
(escaped), not a nested object. This is the single most common mistake
when hand-populating this data — writing it as a real nested object
instead of an escaped string silently fails to deserialize, and the proxy
treats that as "no policies," returning `403` for every request on that
route with no obvious error pointing at the cause.

Separately, and unrelated to the above: actual rate-limit counters live
under a third key pattern, **`rl:{routeId}:{policyId}:{scope}:{identifier}`**,
written only by the proxy's Lua scripts at request time, and they
self-expire via `EXPIRE` — nothing else should ever write to these.

---

## Concepts: scope, identifier source, algorithm

Every policy is built from three independent choices.

### Scope — who shares one counter

| Scope | Identifier needed? | Meaning |
|-------|--------------------|---------|
| `GLOBAL` | No | Every caller shares one counter for the whole route. |
| `IP` | No (extracted automatically) | One counter per client IP address. |
| `API_KEY` | Yes | One counter per API key value — for limiting a credential/application. |
| `USER` | Yes | One counter per user identifier — for limiting a person/account. |

**`USER` and `API_KEY` are functionally identical in the code** — both just
read a value from wherever `identifierSource`/`identifierValue` point.
The distinction between them is purely semantic, for humans reading a
policy list, not a difference the system enforces. You can legitimately
run both on the same route at once — e.g. one `API_KEY` policy limiting a
company's total usage, and a separate `USER` policy limiting each
individual person within that company — since each policy gets its own
independent counter.

### Identifier source — where to read that value from, when scope needs one

| Source | Works today? | Notes |
|--------|---------------|-------|
| `HEADER` | Yes | Most common choice. |
| `QUERY_PARAM` | Yes | |
| `COOKIE` | Yes | |
| `IP` | Yes | Same as scope `IP`, usable explicitly here too. |
| `API_KEY` | Yes | Behaves identically to `HEADER` in the code. |
| `PATH_VARIABLE` | No | Listed in the enum, but the proxy has no route-template concept for arbitrary target URLs — falls back silently to IP-based limiting if selected. |

**Important, real limitation:** there is currently no way to rate-limit by
a value inside a JSON request body (e.g. `{"userId": "abc"}`). The proxy
deliberately streams request bodies through without buffering or parsing
them, for memory efficiency on large payloads — extracting a body field
would require buffering the whole request first, which conflicts with
that design. **The workaround that works today:** send the same value as
a header alongside your JSON body (e.g. `X-User-Id: abc`), and scope on
that header instead.

### Algorithm — how the limit is actually enforced

See the next section.

---

## The four algorithms

Every algorithm implements the same interface and is dispatched via a
factory keyed off the `algorithm` enum value — adding a fifth someday is a
new class, not a rewrite of existing dispatch logic. Each runs as a single
atomic Redis Lua script, so two concurrent requests against the same
policy can never race each other.

| Algorithm | How it works | Tradeoff |
|-----------|----------------|-----------|
| **Fixed window** | A counter resets every N seconds. | Cheapest, but allows up to 2x the limit right at a window boundary (e.g. a burst at 0:59 and another at 1:00). |
| **Sliding window** | A Redis sorted set tracks exact request timestamps; only the last N seconds count. | No boundary-burst issue, more accurate, costs one sorted-set entry per allowed request within the window. |
| **Token bucket** | A bucket refills continuously up to a capacity; each request spends one token. | Lets short bursts through immediately up to capacity, then throttles to the steady refill rate. |
| **Leaky bucket** | A "level" fills by 1 per accepted request and drains continuously; requests are rejected once the level would exceed capacity. | Smooths bursts into a steady outflow rather than letting them through at once. |

### `algorithmConfig` shape

Fixed/sliding window:
```json
{"limit": 100, "windowSize": 1, "windowUnit": "MINUTE"}
```
Token/leaky bucket — either the same shape (a rate gets derived from
`limit`/`windowSize`/`windowUnit`), or explicit:
```json
{"capacity": 50, "ratePerSecond": 5}
```
`windowUnit` is one of `SECOND`, `MINUTE`, `HOUR`, `DAY`.

### Multi-policy evaluation, and the refund mechanism

When a route has multiple active policies, all of them are evaluated **in
parallel**, and the request is denied if **any** policy denies it (most
restrictive wins). Evaluating in parallel means a policy that *would*
allow the request still consumes one unit of its own quota the instant
its Lua script runs — before the system knows whether a sibling policy is
about to deny the same request. Left alone, that's a real leak: every
denied request would silently drain quota from whichever policies would
have allowed it.

To fix this, once the final decision is known, if it's a denial, every
policy that was individually allowed gets a **compensating refund call**
that undoes its own consumption (a `DECR` for fixed window, a precise
`ZREM` of the exact sorted-set entry for sliding window, a token/level
given back for the two bucket algorithms). This is a best-effort
correction, not a second atomic transaction spanning every policy — there
is a brief window where a counter reflects "consumed" before its refund
lands, and a refund call can itself fail (logged, not retried). The
alternative (checking every policy first, only committing if all agree)
would close that gap completely, at the cost of doubling Redis round
trips on every single request, even when everything would have been
allowed — this was judged not worth it for the common case.

---

## API reference — rate-limiter-service

The proxy engine exposes exactly one functional endpoint — it's a proxy,
not an admin API.

| Method | Path | Description |
|--------|------|--------------|
| `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`, `HEAD` | `/r/{routeId}` | Evaluates all active policies on `routeId`; forwards to the route's `targetUrl` if allowed, returns `429` if not. |

**Responses:**
- `200` (or whatever the backend returns) + `X-RateLimit-Limit`,
  `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers — allowed and
  proxied through. The response body is streamed back byte-for-byte,
  untouched — same content, same status code, whatever the backend sent.
- `429 Too Many Requests` + `Retry-After` header, plain-text body `Rate
  limit exceeded` — a policy denied the request. This response is always
  generated by the proxy itself and always includes `Retry-After`; if you
  see a `429` **without** that header, it likely came from the backend
  itself, not from Lymit (see [Troubleshooting](#troubleshooting)).
- `404 Not Found` — no active route exists for that `routeId` in Redis.
- `403 Forbidden`, body `Irrelevant Request` — the route exists but has
  zero policies attached.
- `502 Bad Gateway` — the rate-limit check passed, but forwarding to
  `targetUrl` itself failed (DNS, connection refused, timeout, etc).

**Operational endpoints** (Spring Boot Actuator):

| Method | Path | Description |
|--------|------|--------------|
| `GET` | `/actuator/health` | Liveness/readiness, including Redis connectivity. |
| `GET` | `/actuator/info` | Build/app info. |
| `GET` | `/actuator/metrics` | Micrometer metrics index. |
| `GET` | `/actuator/prometheus` | Prometheus-scrapeable metrics — see [Observability](#observability). |

---

## API reference — auth/admin service

Everything below except `/signup` and `/signin` requires
`Authorization: Bearer {token}`.

### Auth

| Method | Path | Auth | Body | Description |
|--------|------|------|------|--------------|
| `POST` | `/api/auth/signup` | No | `{name, email, password}` | Creates an account, returns `{token, user}`. |
| `POST` | `/api/auth/signin` | No | `{email, password}` | Returns `{token, user}`. |
| `GET`  | `/api/auth/me` | Yes | — | Current user's profile. |
| `PUT`  | `/api/auth/me` | Yes | `{name}` | Updates name (email isn't editable). |

`user` shape: `{id, customerId, name, email}`. `customerId` is the value
every route/policy is tagged with, and what the proxy's Prometheus
metrics group by.

### Routes

| Method | Path | Auth | Body | Description |
|--------|------|------|------|--------------|
| `GET`    | `/api/routes` | Yes | — | Lists your routes. |
| `POST`   | `/api/routes` | Yes | `{name, targetUrl}` | Creates a route, dual-writes to Postgres + Redis. |
| `GET`    | `/api/routes/{routeId}` | Yes | — | One route's full detail. |
| `GET`    | `/api/routes/{routeId}/status` | Yes | — | Lightweight: `{routeId, live, checkedAt}` — a **live Redis read**, not cached. |
| `PUT`    | `/api/routes/{routeId}` | Yes | `{name, targetUrl, active}` | Updates a route. |
| `DELETE` | `/api/routes/{routeId}` | Yes | — | Deletes the route and all of its policies, in both stores. |

Every route response carries two related-but-different booleans:
- **`active`** — Postgres's setting: "should this route be enabled."
- **`live`** — a fresh Redis check, done on every request: "does the
  proxy actually see this route right now." These can legitimately
  disagree: `active: true, live: false` means the dual-write to Redis
  failed silently after the Postgres write succeeded — see [Known
  limitations](#known-limitations).

Routes are scoped to the signed-in user's `customerId`. Touching another
user's route returns `404`, not `403` — doesn't reveal that the route
exists at all.

### Policies

| Method | Path | Auth | Body | Description |
|--------|------|------|------|--------------|
| `GET`    | `/api/routes/{routeId}/policies` | Yes | — | Lists policies on a route. |
| `POST`   | `/api/routes/{routeId}/policies` | Yes | see below | Creates a policy — all fields settable. |
| `PUT`    | `/api/routes/{routeId}/policies/{policyId}` | Yes | see below | Updates a policy — **restricted fields**. |
| `DELETE` | `/api/routes/{routeId}/policies/{policyId}` | Yes | — | Deletes a policy. |

**Create** — full body:
```json
{
  "scope": "API_KEY",
  "identifierSource": "HEADER",
  "identifierValue": "X-Api-Key",
  "algorithm": "TOKEN_BUCKET",
  "algorithmConfig": "{\"limit\":100,\"windowSize\":1,\"windowUnit\":\"MINUTE\"}"
}
```

**Update** — deliberately narrower, only three fields accepted:
```json
{
  "algorithm": "TOKEN_BUCKET",
  "algorithmConfig": "{\"limit\":200,\"windowSize\":1,\"windowUnit\":\"MINUTE\"}",
  "active": false
}
```
`scope`, `identifierSource`, and `identifierValue` **cannot be changed
after creation.** This isn't an oversight — those three fields are baked
into the proxy's Redis counter key
(`rl:{routeId}:{policyId}:{scope}:{identifier}`), so editing them in place
would silently orphan whatever count was accruing under the old key. To
change who a policy applies to, delete it and create a new one.

Both create and update validate `algorithmConfig` server-side before
writing anything to Postgres or Redis — a malformed value is a `400`, not
a policy the proxy has to silently skip later.

---

## End-to-End Example

This example shows how to use Lymit to protect an API with a token-bucket
rate limit.

### Scenario

Assume you have an API:

```text
https://api.example.com/users
```

You want to allow each API key to make up to 100 requests per minute.

### Step 1: Register the backend

Create a route pointing to your backend:

```json
{
  "name": "Users API",
  "targetUrl": "https://api.example.com/users"
}
```

Lymit creates a route with a unique `routeId`:

```text
11f29850-9bea-478c-8f99-2fb071a425d0
```

### Step 2: Attach a policy

Create an API-key-based token-bucket policy:

```json
{
  "scope": "API_KEY",
  "identifierSource": "HEADER",
  "identifierValue": "X-Api-Key",
  "algorithm": "TOKEN_BUCKET",
  "algorithmConfig": "{\"limit\":100,\"windowSize\":1,\"windowUnit\":\"MINUTE\"}"
}
```

The API key is extracted from:

```http
X-Api-Key: abc123
```

The resulting request flow is:

```text
Client
  │
  │ X-Api-Key: abc123
  │
  │ GET /r/11f29850-9bea-478c-8f99-2fb071a425d0
  ▼
┌───────────────────────┐
│        Lymit          │
│                       │
│  API_KEY: abc123      │
│  Token Bucket         │
│  100 requests/minute  │
└───────────┬───────────┘
            │
            │ Allowed
            ▼
https://api.example.com/users
```

### Step 3: Send a request

```bash
curl \
  "https://lymit-m2-production.up.railway.app/r/11f29850-9bea-478c-8f99-2fb071a425d0" \
  -H "X-Api-Key: abc123"
```

Lymit evaluates the request and, if allowed, forwards it to the backend.

The backend response is returned to the client.

The client also receives rate-limit headers such as:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: <reset-value>
```

### Step 4: Exceed the limit

Once the API key exceeds the configured limit, Lymit rejects the request
before it reaches the backend.

The response is:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: <retry-value>
```

with the body:

```text
Rate limit exceeded
```

The complete flow is:

```text
                    Request
                       │
                       ▼
              ┌────────────────┐
              │      Lymit      │
              │                │
              │ Extract API Key│
              │       ↓        │
              │ Check Redis     │
              │       ↓        │
              │ Token Bucket    │
              └───────┬────────┘
                      │
             ┌────────┴────────┐
             │                 │
          Allowed            Denied
             │                 │
             ▼                 ▼
       Your Backend          HTTP 429
             │
             ▼
       Backend Response
             │
             ▼
           Client
```

This means the backend does not need to implement rate-limiting logic itself.
Lymit handles the rate-limit decision before forwarding the request.

## Frontend

| Page | Purpose |
|------|---------|
| `index.html` | Landing page, live token-bucket animation as the hero. |
| `pages/signup.html`, `pages/signin.html` | Real auth against the backend. |
| `pages/dashboard.html` | Route list with a live green/red status dot (polled from `/status` every 8s), create/delete. |
| `pages/route.html?id=...` | Edit a route, force a live-status recheck, manage its policies — editing a policy visibly disables scope/identifier fields, matching the backend's restriction exactly. |
| `pages/profile.html` | Name/email/customerId, sign out. |

The dashboard's green/red dot is deliberately a **live** check, not an
assumption — it's what surfaces a silently-failed dual-write instead of
hiding it.

---

## Observability

Prometheus metrics exposed at `/actuator/prometheus` on the proxy engine,
tagged by `customerId` (deliberately **not** `routeId`, to avoid unbounded
metric cardinality if a customer registers hundreds of routes):

| Metric | Meaning |
|--------|----------|
| `rate_limiter_requests_total` | Tagged by `customerId`, `outcome` (`allowed`, `denied`, `no_policies`, `not_found`, `allowed_fail_open`, `denied_fail_closed`). |
| `rate_limiter_redis_failures_total` | Incremented whenever the circuit breaker's fallback fires — a real signal Redis is unhealthy. |
| `rate_limiter_upstream_errors_total` | Incremented when forwarding to a backend fails (DNS, connection refused, etc). |

---

## Known limitations

- **The Postgres/Redis dual-write isn't transactional.** If the Redis
  write fails after Postgres commits, the two stores disagree until
  something notices — there's no outbox/retry/reconciliation job.
  Failures are logged loudly; nothing auto-heals yet.
- **JWTs aren't revocable.** Signing out only forgets the token
  client-side; a token issued before sign-out stays valid until it
  naturally expires.
- **No rate limiting on the auth endpoints themselves.**
- **`PATH_VARIABLE` as an identifier source doesn't actually work** — see
  the concepts section above.
- **No way to rate-limit by a JSON request body field** — see the
  concepts section above for the header-based workaround.
- **The frontend only checks auth once per page load** — a token
  expiring mid-session surfaces as an error message on the next action,
  not an automatic redirect to sign-in.
- **Refund on multi-policy denial isn't perfectly atomic** — see "the
  refund mechanism" above.
- No DB migration tool (Flyway/Liquibase) — schema is managed via
  `ddl-auto=update`, fine at this stage, not how you'd manage a real
  production schema.

---

## Troubleshooting

Real issues found and fixed while building and testing this project —
kept here since they're the kind of thing that reappears.

**"I hit `/r/{routeId}` and get 404, even though I manually entered the
route and policy data into Redis."**
Almost always `algorithmConfig` stored as a nested JSON object instead of
an escaped string — see [The Redis contract](#the-redis-contract). Second
most common cause: the deployed proxy is pointed at a *different* Redis
instance than the one you're inspecting.

**"Deploy logs look completely clean — 'Started ... in N seconds' — but
the public URL doesn't respond at all (502 Bad Gateway)."**
Check for a hardcoded `server.port` instead of `${PORT:default}` — see
[Deploying](#deploying-railway-or-similar). The container is genuinely
fine; the platform's edge proxy just can't reach the port it's listening
on.

**"I get a 429, but it looks different from what I expected — no
`Retry-After` header, `Content-Type: text/html`, weird headers I don't
recognize."**
That 429 likely isn't from Lymit — it came through untouched from your
actual backend, which is throttling you itself (this happened testing
against Webhook.site, which has its own rate limits). Lymit's own 429
always includes `Retry-After` and is always plain text. Check
`X-RateLimit-Remaining` on the same response — if it's greater than 0,
Lymit allowed the request; the denial happened downstream.

**"The backend returns real content directly, but through the proxy the
response body is empty (0 bytes), even though the status is 200 and
headers look normal."**
This was a real bug, since fixed: `WebClient`'s `exchangeToMono` requires
the response body to be fully consumed inside the function passed to it,
or the underlying connection can be released back to the pool before
anything downstream actually reads the body — producing exactly this
symptom (correct status/headers, silently empty body), non-deterministically.
Fixed by fully joining the response body (`DataBufferUtils.join`) before
returning from that function. If you're running an older build and see
this, update to the current `ProxyService`.

**"Testing against a full website (not an API) gives me broken/empty-
looking pages."**
Expected, not a bug: full websites redirect, compress responses, and load
assets via paths relative to their own domain — none of which a
request-response API proxy is built to handle. Test against a plain JSON
endpoint (e.g. `https://httpbin.org/get`) instead.

