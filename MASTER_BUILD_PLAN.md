# MASTER_BUILD_PLAN.md
High-Performance Product Analytics API (HP Analytics)
Node.js + Fastify + PostgreSQL + Redis + BullMQ + Docker + Nginx

> Goal: A production-grade, high-performance REST API that demonstrates real backend engineering:
> caching, async jobs, indexing, rate limiting, observability, tests, and measurable load-test improvements.

---

## 0) Quick Start (Local)

### Requirements
- Docker + Docker Compose

### Run
```bash
cd infra
docker compose up --build
```

### URLs
- API (direct): http://localhost:8080
- API (via Nginx): http://localhost
- Health: http://localhost/health
- Docs (Swagger UI): http://localhost/docs
- OpenAPI: http://localhost/openapi.yaml

---

## 1) System Architecture

### Components
- **Client**: Postman / frontend / scripts
- **Nginx**: reverse proxy + gzip + keepalive
- **API Service** (Fastify): auth, validation, rate limit, controllers/services/repos
- **PostgreSQL**: OLTP source of truth
- **Redis**:
  - cache for hot reads
  - BullMQ backend
- **Worker Service** (BullMQ): async aggregation into stats tables
- **Observability**:
  - structured logs (Pino)
  - health/readiness endpoints
  - metrics endpoint

### Data Flow
1. Client → Nginx → API
2. Reads:
   - API checks Redis cache first
   - fallback to Postgres
3. Writes (events/purchases):
   - API writes minimal row(s) to Postgres
   - enqueue aggregation job to BullMQ
4. Worker:
   - consumes jobs
   - updates daily aggregate tables (upsert)
   - invalidates relevant cache keys

---

## 2) System Diagram (Mermaid)

```mermaid
flowchart LR
  A[Client] --> B[Nginx]
  B --> C[Fastify API]
  C --> D[(PostgreSQL)]
  C --> E[(Redis Cache)]
  C --> F[BullMQ Queue (Redis)]
  F --> G[Worker]
  G --> D
  G --> E
```

---

## 3) Folder Structure

```text
hp-analytics-api/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── plugins/
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── repositories/
│   │   │   ├── middleware/
│   │   │   ├── cache/
│   │   │   ├── queue/
│   │   │   ├── utils/
│   │   │   ├── app.ts
│   │   │   └── server.ts
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── worker/
│       ├── src/
│       │   ├── config/
│       │   ├── processors/
│       │   ├── services/
│       │   └── worker.ts
│       ├── Dockerfile
│       ├── tsconfig.json
│       └── package.json
├── infra/
│   ├── nginx/nginx.conf
│   ├── docker-compose.yml
│   └── .env.example
├── sql/
│   ├── 001_init.sql
│   └── 002_indexes.sql
├── openapi.yaml
├── architecture.md
├── README.md
└── CURSOR_PROMPT.md
```

---

## 4) Database Design

### Tables
- **users**
- **products**
- **events**
- **purchases**
- **product_daily_stats** (aggregated)
- **user_daily_stats** (aggregated)

### Indexes (critical)
- events(product_id, ts), events(user_id, ts)
- purchases(product_id, ts), purchases(user_id, ts)
- products(status)

> This starter pack includes `sql/001_init.sql` and `sql/002_indexes.sql`.

---

## 5) Performance Rules

Non-negotiables:
1. **No heavy analytics in request cycle**
2. **Async aggregation via BullMQ worker**
3. **Redis caching for hot endpoints** with TTL + invalidation
4. **Rate limiting** for login + event ingestion
5. **Measure & publish performance** (baseline vs optimized)

---

## 6) API Endpoints (Spec)

Auth:
- POST /auth/register
- POST /auth/login
- GET /auth/me

Products:
- GET /products
- POST /products (admin)
- GET /products/:id (cached)
- PATCH /products/:id (admin)
- DELETE /products/:id (admin)

Events:
- POST /events (accepted async)
- POST /events/bulk (accepted async)

Purchases:
- POST /purchases

Analytics:
- GET /analytics/products/top (cached)
- GET /analytics/products/:id/timeseries
- GET /analytics/users/me/summary (cached)

System:
- GET /health
- GET /ready
- GET /metrics
- GET /openapi.yaml

OpenAPI is included in `openapi.yaml` and served by the API at `/openapi.yaml`.

---

## 7) Testing Strategy

### Unit
- auth hashing + token creation
- cache key logic
- validation helpers

### Integration
- DB repo queries
- queue enqueue + worker processing
- aggregate upserts

### API (E2E)
- register → login → me
- admin-only product creation
- event ingestion returns 202
- analytics returns expected values after worker runs

### Load (Autocannon)
- baseline before caching/indexes
- optimized after caching/indexes
Report: RPS, avg latency, p95/p99, errors.

---

## 8) Build Roadmap (Milestones)

Milestone 1: Foundation
- Fastify app, logging, error format, swagger
- /health /ready

Milestone 2: DB & Repos
- init schema, indexes, repo layer
- integration tests

Milestone 3: Auth & RBAC
- JWT auth, role checks, tests

Milestone 4: Products + Baseline Perf
- CRUD + list + validation
- capture baseline load numbers

Milestone 5: Events + Queue
- single + bulk ingestion
- enqueue jobs, load test writes

Milestone 6: Worker + Aggregates
- aggregate rollups into stats tables
- cache invalidation hooks

Milestone 7: Redis Cache + Rate Limits
- cache hot reads, implement rate limits
- compare performance numbers

Milestone 8: Analytics + Observability
- analytics endpoints from aggregate tables
- /metrics, docs updates, final benchmarks

---

## 9) Cursor System Prompt (also in CURSOR_PROMPT.md)

Copy `CURSOR_PROMPT.md` into Cursor System Prompt.

---

## 10) Deliverables Checklist

- [ ] Docker compose starts all services
- [ ] OpenAPI available + Swagger UI at /docs
- [ ] Tests pass (unit + integration)
- [ ] Worker updates aggregates
- [ ] Redis cache improves read performance measurably
- [ ] README includes benchmark results and architecture diagram

---
