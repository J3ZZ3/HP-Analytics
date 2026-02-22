# High-Performance Product Analytics API

Production-grade backend demonstrating performance engineering:
- Fastify 5 + JSON schema validation
- PostgreSQL with optimized indexes
- Redis caching (TTL + invalidation)
- BullMQ async aggregation jobs
- Rate limiting (IP-based)
- Docker + Nginx (gzip, keepalive)
- Comprehensive tests (Vitest)
- Load testing (Autocannon)

## Architecture

```
Client -> Nginx (:80) -> Fastify API (:8080) -> PostgreSQL
                                              -> Redis (cache + BullMQ)
                                              -> BullMQ -> Worker -> PostgreSQL + Redis
```

**Data flow:**
- **Reads**: API checks Redis cache first, falls back to Postgres
- **Writes**: API writes to Postgres, enqueues aggregation job to BullMQ
- **Worker**: Consumes jobs, upserts daily aggregate tables, invalidates cache

## Quick start
```bash
cd infra
docker compose up --build
```

## Endpoints
- Health: `GET /health`
- Ready: `GET /ready`
- Metrics: `GET /metrics`
- Swagger UI: `GET /docs`
- OpenAPI: `GET /openapi.yaml`

### Auth
- `POST /auth/register` - Create account
- `POST /auth/login` - Get JWT token
- `GET /auth/me` - Current user (auth required)

### Products
- `GET /products` - List (paginated, filterable)
- `POST /products` - Create (admin only)
- `GET /products/:id` - Get by ID (cached)
- `PATCH /products/:id` - Update (admin only)
- `DELETE /products/:id` - Delete (admin only)

### Events
- `POST /events` - Ingest single event (202 async)
- `POST /events/bulk` - Ingest up to 2000 events (202 async)

### Purchases
- `POST /purchases` - Create purchase (amount from real product price)

### Analytics
- `GET /analytics/products/top` - Top products (cached 60s)
- `GET /analytics/products/:id/timeseries` - Daily breakdown
- `GET /analytics/users/me/summary` - User stats (cached 60s)

## Tests

```bash
# API tests (68 tests)
cd apps/api && npm test

# Worker tests (3 tests)
cd apps/worker && npm test
```

Test coverage:
- **Unit**: password hashing, RBAC middleware
- **Repository**: all 5 repos (user, product, event, purchase, analytics)
- **E2E**: auth flow (register/login/me/401/403), product CRUD, event ingestion, purchases, analytics endpoints
- **Cache**: hit/miss behavior for product, top products, user summary
- **Rate limiting**: 429 response after limit exceeded

## Load testing

```bash
npx autocannon -c 200 -d 20 http://localhost/health
```

See `loadtest/README.md` for full benchmarking guide.

## Architecture details

See `architecture.md` and `MASTER_BUILD_PLAN.md`.
