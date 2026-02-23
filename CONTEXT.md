# HP-Analytics — Full Project Context

> Last updated: 2026-02-23
> Owner: Logan Jesse (jesse.mashoana@gmail.com)
> GitHub: https://github.com/J3ZZ3/HP-Analytics.git (branch: `main`)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Directory Structure](#3-directory-structure)
4. [Tech Stack](#4-tech-stack)
5. [Database Schema](#5-database-schema)
6. [API Endpoints](#6-api-endpoints)
7. [Frontend Types](#7-frontend-types)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Frontend Admin Dashboard](#9-frontend-admin-dashboard)
10. [Service Map (Interactive Monitoring UI)](#10-service-map-interactive-monitoring-ui)
11. [Analytics & Mock Data](#11-analytics--mock-data)
12. [Worker (BullMQ)](#12-worker-bullmq)
13. [Deployment (Railway)](#13-deployment-railway)
14. [Environment Variables](#14-environment-variables)
15. [Docker / Local Development](#15-docker--local-development)
16. [Git Status & Uncommitted Changes](#16-git-status--uncommitted-changes)
17. [E-Commerce Integration Plan](#17-e-commerce-integration-plan)
18. [Known Issues & Gotchas](#18-known-issues--gotchas)
19. [E-Commerce Integration Readiness Plan](#19-e-commerce-integration-readiness-plan-original)
20. [Suggested Next Improvements](#20-suggested-next-improvements)

---

## 1. Project Overview

**HP-Analytics** is a high-performance product analytics backend + admin dashboard for tracking e-commerce user behavior (views, clicks, add-to-cart, purchases, searches) and providing real-time analytics to business admins.

The system is designed to also power a **separate e-commerce website** (different repo, frontend-only) that will call this API directly for:
- Displaying products (with search, filter, sort, categories)
- Tracking anonymous + authenticated user events (view, click, add_to_cart, remove_from_cart, checkout_start, search)
- Recording purchases
- Session linking (anonymous → logged-in user)

The **admin dashboard** (this repo's `frontend/`) is for internal use only — no public registration. Admins manage products, view analytics, monitor system health.

---

## 2. Architecture

```
┌──────────┐     ┌──────────────┐     ┌──────────┐
│  Nginx   │────▶│  Fastify API │────▶│ Postgres │
│  (proxy) │     │  (port 8080) │     │  (5432)  │
└──────────┘     └──────┬───────┘     └──────────┘
                        │
                        ├──▶ Redis (6379) ──▶ BullMQ queue
                        │
                        └──▶ Worker (BullMQ consumer)
                             Aggregates daily stats
```

**Key patterns:**
- Fastify with JSON Schema validation on every route
- JWT authentication with role-based access (admin / user)
- `optionalAuth` decorator for anonymous event tracking
- Redis caching (`cacheGetJson` / `cacheSetJson`) for analytics endpoints
- BullMQ job queue: API enqueues `aggregate-today` jobs → Worker processes them
- Worker runs `aggregateToday()`: upserts `product_daily_stats` and `user_daily_stats`, then invalidates Redis cache
- Rate limiting via `@fastify/rate-limit`
- Swagger UI at `/docs`

---

## 3. Directory Structure

```
hp-analytics/
├── apps/
│   ├── api/                         # Fastify REST API
│   │   ├── Dockerfile
│   │   ├── package.json             # hp-api
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── app.ts              # Fastify builder (cors, jwt, rate-limit, routes)
│   │   │   ├── server.ts           # Entry point (app.listen)
│   │   │   ├── config/
│   │   │   │   ├── env.ts          # Environment vars
│   │   │   │   ├── db.ts           # PostgreSQL pool (pg)
│   │   │   │   └── redis.ts        # ioredis + parseRedisOpts (supports REDIS_URL)
│   │   │   ├── plugins/
│   │   │   │   └── core.ts         # authenticate, optionalAuth, swagger, /ready, /metrics, error handler
│   │   │   ├── routes/
│   │   │   │   ├── authRoutes.ts
│   │   │   │   ├── productsRoutes.ts
│   │   │   │   ├── eventsRoutes.ts
│   │   │   │   ├── purchasesRoutes.ts
│   │   │   │   └── analyticsRoutes.ts
│   │   │   ├── services/           # Business logic
│   │   │   ├── repositories/       # SQL / data-access
│   │   │   ├── middleware/
│   │   │   │   └── rbac.ts         # requireRole(req, "admin")
│   │   │   ├── cache/
│   │   │   │   └── cache.ts        # cacheGetJson, cacheSetJson
│   │   │   ├── queue/
│   │   │   │   └── analyticsQueue.ts # BullMQ queue
│   │   │   ├── utils/
│   │   │   │   ├── errors.ts       # ApiError class
│   │   │   │   └── auth.ts
│   │   │   └── scripts/
│   │   │       └── seed-admin.ts   # Seeds super admin user
│   │   └── tests/                  # Vitest tests
│   │
│   └── worker/                     # BullMQ worker
│       ├── Dockerfile
│       ├── package.json            # hp-worker
│       ├── src/
│       │   ├── worker.ts           # Worker entry (connects to queue)
│       │   ├── config/             # db.ts, redis.ts, env.ts
│       │   └── processors/
│       │       └── aggregateToday.ts  # SQL upsert daily stats + invalidate cache
│       └── tests/
│
├── frontend/                       # React admin dashboard (Vite + Tailwind + shadcn)
│   ├── .env                        # VITE_API_URL, VITE_MOCK
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx                # React root (AuthProvider, QueryClientProvider, ToastProvider)
│       ├── App.tsx                 # Routes
│       ├── index.css               # Tailwind base styles
│       ├── api/                    # Axios API clients
│       │   ├── client.ts           # Axios instance + JWT interceptor
│       │   ├── auth.ts
│       │   ├── events.ts
│       │   ├── products.ts
│       │   ├── purchases.ts
│       │   ├── analytics.ts
│       │   └── system.ts           # /health, /ready, /metrics
│       ├── components/
│       │   ├── layout/             # AppLayout, Sidebar
│       │   ├── ui/                 # button, input, card, badge, select, dialog, skeleton (shadcn)
│       │   ├── charts/             # ProductBarList, DailyConversionChart, ViewsPurchasesChart, RevenueAreaChart, TimeseriesChart
│       │   ├── map/                # ServiceMap, ServiceNode, ConnectionLine (interactive system monitor)
│       │   └── ProtectedRoute.tsx
│       ├── context/
│       │   ├── AuthContext.tsx      # JWT auth state
│       │   └── ToastContext.tsx
│       ├── lib/utils.ts            # cn() helper (clsx + tailwind-merge)
│       ├── mocks/
│       │   └── analyticsMock.ts    # 250-product mock data generator with power-law distribution
│       ├── pages/
│       │   ├── LoginPage.tsx       # Login only (no register), show/hide password toggle
│       │   ├── DashboardPage.tsx   # Overview with ServiceMap
│       │   ├── ProductsPage.tsx    # CRUD table with category, description, image_url
│       │   ├── ProductDetailPage.tsx
│       │   ├── AnalyticsPage.tsx   # Charts + KPIs + product rankings (top N selector)
│       │   ├── UsersPage.tsx
│       │   └── ProfilePage.tsx
│       └── types/index.ts          # All TypeScript interfaces
│
├── sql/                            # Database migrations (run in order)
│   ├── 001_init.sql
│   ├── 002_indexes.sql
│   ├── 003_product_fields.sql
│   └── 004_session_tracking.sql
│
├── infra/
│   ├── docker-compose.yml          # postgres, redis, api, worker, nginx
│   ├── .env.example
│   └── nginx/nginx.conf
│
├── loadtest/                       # Autocannon load testing
├── openapi.yaml                    # Static OpenAPI spec
├── README.md
├── architecture.md
├── CURSOR_PROMPT.md                # AI coding rules
└── MASTER_BUILD_PLAN.md            # Full build plan
```

---

## 4. Tech Stack

### Backend (apps/api)
| Library | Version | Purpose |
|---------|---------|---------|
| fastify | ^5.7.4 | HTTP framework |
| @fastify/cors | ^11.2.0 | CORS handling |
| @fastify/jwt | ^10.0.0 | JWT auth |
| @fastify/rate-limit | ^10.3.0 | Rate limiting |
| @fastify/swagger + swagger-ui | ^9.7.0 / ^5.2.5 | API docs at /docs |
| pg | ^8.11.5 | PostgreSQL client |
| ioredis | ^5.4.1 | Redis client |
| bullmq | ^5.12.0 | Job queue |
| bcrypt | ^5.1.1 | Password hashing |
| pino | ^9.0.0 | Logging |
| tsx | ^4.19.1 | Dev runner |
| typescript | ^5.6.3 | |
| vitest | ^2.1.8 | Testing |

### Worker (apps/worker)
| Library | Version | Purpose |
|---------|---------|---------|
| bullmq | ^5.12.0 | Queue consumer |
| ioredis | ^5.4.1 | Redis |
| pg | ^8.11.5 | PostgreSQL |

### Frontend (frontend/)
| Library | Version | Purpose |
|---------|---------|---------|
| react | ^19.2.0 | UI |
| react-dom | ^19.2.0 | |
| react-router-dom | ^7.13.0 | Routing |
| @tanstack/react-query | ^5.90.21 | Data fetching + caching |
| axios | ^1.13.5 | HTTP client |
| recharts | ^3.7.0 | Charts |
| framer-motion | ^12.34.3 | Animations (service map) |
| lucide-react | ^0.575.0 | Icons |
| clsx + tailwind-merge | | Class merging |
| tailwindcss | ^4.2.0 | Styling |
| vite | ^7.3.1 | Build tool |

---

## 5. Database Schema

### Tables (after all migrations)

**users**
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default uuid_generate_v4() |
| email | text | NOT NULL, UNIQUE |
| password_hash | text | NOT NULL |
| role | text | NOT NULL, default 'user', CHECK (user, admin) |
| created_at | timestamptz | NOT NULL, default now() |

**products**
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| name | text | NOT NULL |
| price | numeric(12,2) | NOT NULL, default 0 |
| status | text | NOT NULL, default 'active', CHECK (active, inactive) |
| description | text | nullable (added 003) |
| image_url | text | nullable (added 003) |
| category | text | nullable (added 003), indexed |
| created_at | timestamptz | NOT NULL |

**events**
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | nullable FK → users(id) ON DELETE SET NULL |
| product_id | uuid | NOT NULL FK → products(id) ON DELETE CASCADE |
| type | text | NOT NULL, CHECK (view, click, add_to_cart, remove_from_cart, checkout_start, search) |
| session_id | text | nullable (added 004), indexed where not null |
| ts | timestamptz | NOT NULL, default now() |
| meta | jsonb | NOT NULL, default '{}' |

**purchases**
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | NOT NULL FK → users(id) ON DELETE CASCADE |
| product_id | uuid | NOT NULL FK → products(id) ON DELETE CASCADE |
| qty | int | NOT NULL, default 1, CHECK >= 1 |
| amount | numeric(12,2) | NOT NULL, default 0 |
| ts | timestamptz | NOT NULL, default now() |

**product_daily_stats**
| Column | Type | Constraints |
|--------|------|-------------|
| product_id | uuid | FK, part of PK |
| day | date | part of PK |
| views | int | default 0 |
| purchases | int | default 0 |
| revenue | numeric(12,2) | default 0 |

**user_daily_stats**
| Column | Type | Constraints |
|--------|------|-------------|
| user_id | uuid | FK, part of PK |
| day | date | part of PK |
| views | int | default 0 |
| purchases | int | default 0 |
| spend | numeric(12,2) | default 0 |

### Indexes
- `idx_events_product_ts` on events(product_id, ts DESC)
- `idx_events_user_ts` on events(user_id, ts DESC)
- `idx_events_session` on events(session_id) WHERE session_id IS NOT NULL
- `idx_purchases_product_ts` on purchases(product_id, ts DESC)
- `idx_purchases_user_ts` on purchases(user_id, ts DESC)
- `idx_products_status` on products(status)
- `idx_products_category` on products(category)

---

## 6. API Endpoints

### System
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Returns `{ status: "ok" }` |
| GET | `/ready` | None | DB + Redis ping. 503 if either down |
| GET | `/metrics` | None | Uptime, node_env, timestamp |
| GET | `/docs` | None | Swagger UI |
| GET | `/openapi.yaml` | None | Static OpenAPI spec file |

### Auth
| Method | Path | Auth | Body / Params | Response |
|--------|------|------|---------------|----------|
| POST | `/auth/register` | None | `{ email, password }` (min 8 chars) | 201 `{ token, user }` |
| POST | `/auth/login` | None | `{ email, password }` | `{ token, user }` |
| GET | `/auth/me` | JWT | — | User object |

### Products
| Method | Path | Auth | Params | Response |
|--------|------|------|--------|----------|
| GET | `/products` | None | QS: `status`, `search`, `category`, `min_price`, `max_price`, `sort_by`, `sort_dir`, `page`, `limit` | Paginated product list |
| GET | `/products/categories` | None | — | `{ categories: string[] }` |
| GET | `/products/:id` | None | — | Single product |
| POST | `/products` | JWT + admin | `{ name, price, status?, description?, image_url?, category? }` | 201 created |
| PATCH | `/products/:id` | JWT + admin | Partial fields | Updated product |
| DELETE | `/products/:id` | JWT + admin | — | 204 |

### Events
| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/events` | optionalAuth | `{ product_id, type, session_id?, ts?, meta? }`. Must have JWT or session_id | 202 `{ accepted, id }` |
| POST | `/events/bulk` | optionalAuth | `{ session_id?, events: [{ product_id, type, ts?, meta? }] }` (1-2000). Must have JWT or session_id | 202 `{ accepted, received, enqueued }` |
| POST | `/events/link-session` | JWT | `{ session_id }` | `{ linked: number }` |

**Event types:** `view`, `click`, `add_to_cart`, `remove_from_cart`, `checkout_start`, `search`

### Purchases
| Method | Path | Auth | Body / Params | Response |
|--------|------|------|---------------|----------|
| POST | `/purchases` | JWT | `{ product_id, qty? }` | 201 purchase |
| GET | `/purchases/me` | JWT | QS: `page`, `limit`, `sort_by` (ts/amount), `sort_dir` | Paginated user purchase history (with product info) |

### Analytics
| Method | Path | Auth | Params | Response |
|--------|------|------|--------|----------|
| GET | `/analytics/overview` | None | QS: `days` (1-90, default 7) | Overview (views, purchases, revenue, conversion_rate, changes) |
| GET | `/analytics/timeseries` | None | QS: `days` (1-90, default 30) | Daily timeseries points |
| GET | `/analytics/products/top` | None | QS: `days`, `limit` (1-50), `sort_by` (views/purchases/revenue) | Top products array |
| GET | `/analytics/products/stats` | None | QS: `days`, `sort_by`, `sort_dir`, `page`, `limit` (1-100), `search` | Paginated product stats |
| GET | `/analytics/products/:id/timeseries` | None | QS: `days` (1-365) | Single product timeseries |
| GET | `/analytics/users/me/summary` | JWT | QS: `days` (1-365) | User analytics summary |

---

## 7. Frontend Types

All defined in `frontend/src/types/index.ts`:

```typescript
interface User { id: string; email: string; role: string; created_at?: string }
interface AuthResponse { token: string; user: User }

interface Product {
  id: string; name: string; price: number; status: string;
  description?: string | null; image_url?: string | null; category?: string | null;
  created_at?: string;
}
interface ProductListResponse { page: number; limit: number; total: number; items: Product[] }
interface ProductListParams {
  page?: number; limit?: number; status?: string; search?: string;
  category?: string; min_price?: number; max_price?: number;
  sort_by?: string; sort_dir?: string;
}
interface ProductCreateRequest { name: string; price: number; status?: string; description?: string; image_url?: string; category?: string }
interface ProductUpdateRequest { name?: string; price?: number; status?: string; description?: string; image_url?: string; category?: string }
interface CategoriesResponse { categories: string[] }

type EventType = "view" | "click" | "add_to_cart" | "remove_from_cart" | "checkout_start" | "search"
interface EventCreateRequest { product_id: string; type: EventType; session_id?: string; ts?: string; meta?: Record<string, unknown> }
interface AcceptedResponse { accepted: boolean; id?: string }
interface BulkAcceptedResponse { accepted: boolean; received: number; enqueued: number }

interface Purchase { id: string; user_id: string; product_id: string; qty: number; amount: number; ts: string }
interface PurchaseWithProduct extends Purchase { product_name: string; product_image_url: string | null; product_price: number }
interface PurchaseHistoryResponse { page: number; limit: number; total: number; items: PurchaseWithProduct[] }

interface TopProductItem { product_id: string; product_name: string; views: number; purchases: number; revenue: number }
interface TopProductsResponse { days: number; limit: number; items: TopProductItem[] }
interface TimeseriesPoint { day: string; views: number; purchases: number; revenue: number }
interface ProductTimeseriesResponse { product_id: string; days: number; points: TimeseriesPoint[] }
interface UserSummaryResponse { days: number; views: number; purchases: number; spend: number }

type ProductSortBy = "views" | "purchases" | "revenue"
type SortDir = "asc" | "desc"
interface ProductStatsParams { days?: number; sort_by?: ProductSortBy; sort_dir?: SortDir; page?: number; limit?: number; search?: string }
interface ProductStatsResponse { total: number; page: number; limit: number; items: TopProductItem[] }

interface OverviewResponse { days: number; views: number; purchases: number; revenue: number; active_products: number; conversion_rate: number; changes: { views: number; purchases: number; revenue: number } }
interface OverallTimeseriesResponse { days: number; points: TimeseriesPoint[] }

interface HealthResponse { status: string }
interface ReadyResponse { ready: boolean; db: boolean; redis: boolean }
interface MetricsResponse { uptime_seconds: number; node_env: string; timestamp: string }
```

---

## 8. Authentication & Authorization

- **JWT-based**: Login returns `{ token, user }`. Token stored in `localStorage`. Axios interceptor adds `Authorization: Bearer <token>` to all requests.
- **Roles**: `user` and `admin`. RBAC middleware `requireRole(req, "admin")` protects product mutation and user management routes.
- **optionalAuth**: Used on event routes. Tries JWT verify silently — if no token, request continues as anonymous. Routes then enforce "must have JWT user OR session_id".
- **Session linking**: `POST /events/link-session` updates all events with a given `session_id` to the authenticated user_id (for when anonymous user logs in).
- **Super admin**: Seeded via `npm run seed:admin` (in apps/api). Current credentials:
  - Email: `jesse.mashoana@gmail.com`
  - Password: `password123!`
  - Role: `admin`
- **No public registration**: The frontend's `/register` route redirects to `/login`. The `POST /auth/register` API endpoint exists but is not exposed in the admin UI.
- **401 interceptor**: Frontend Axios interceptor clears localStorage and redirects to `/login` on any 401 response.

---

## 9. Frontend Admin Dashboard

### Routes
| Path | Page | Description |
|------|------|-------------|
| `/login` | LoginPage | Login form with show/hide password toggle. No register link |
| `/` | DashboardPage | Overview cards + ServiceMap |
| `/products` | ProductsPage | Product CRUD table (name, price, status, category). Create/edit dialog with description, image_url, category fields |
| `/products/:id` | ProductDetailPage | Single product details + timeseries chart |
| `/analytics` | AnalyticsPage | KPI cards (views, purchases, revenue, conversion), timeseries charts, product rankings (top N with views/purchases/revenue tabs) |
| `/users` | UsersPage | User management |
| `/profile` | ProfilePage | Current user profile |

### Key UI Components
- **AppLayout**: Sidebar navigation + main content area
- **Sidebar**: Nav links with icons (lucide-react)
- **ProductBarList**: Ranked list with progress bars, used for product rankings (top N selector: 5/10/20/50)
- **Charts**: DailyConversionChart, ViewsPurchasesChart, RevenueAreaChart, TimeseriesChart (all Recharts)
- **ServiceMap**: Interactive sci-fi system monitoring map (see section 10)
- **UI primitives**: shadcn/ui components (button, input, card, badge, select, dialog, skeleton)

### Data fetching
- All API calls go through `frontend/src/api/client.ts` (Axios instance with base URL from `VITE_API_URL`)
- React Query (`@tanstack/react-query`) for caching and auto-refetch
- Mock mode: When `VITE_MOCK=true`, analytics page uses generated mock data from `analyticsMock.ts` instead of API calls

---

## 10. Service Map (Interactive Monitoring UI)

Located in `frontend/src/components/map/`. Three files:

### ServiceMap.tsx
- Renders 4 service nodes: API Server (center), PostgreSQL, Redis, Worker
- Connections between nodes with animated data flow
- Fetches live health from `/health`, `/ready`, `/metrics` endpoints
- Interactive: zoom-to-cursor (mouse wheel), pan (click+drag), keyboard controls (+/- zoom, 0 reset, Esc close inspector)
- Inspector panel: Click any node to see detailed info (status, latency, uptime, etc.)
- Visual layers: animated particle background, drifting nebula effect, foreground grid
- Alert sweep animation when any service is unhealthy
- Bottom status bar + zoom HUD + keyboard shortcut legend

### ServiceNode.tsx
- Clickable node with Framer Motion animations
- API Server node is larger (hub)
- Scan ring pulse when status is "degraded" or "down"
- Hover tooltip with detailed info
- Corner ticks and inner bevels for premium look

### ConnectionLine.tsx
- Custom SVG with linearGradient, feGaussianBlur, marker (arrowheads)
- Multiple overlaid layers: soft under-glow, main gradient line with arrow, animated dashed "data stream"
- Moving "packet" circle along the line
- Dynamic thickness and speed based on service intensity
- Label capsule with intent glyph (e.g., "⇢", "⤓")

---

## 11. Analytics & Mock Data

### analyticsMock.ts
- `MOCK_ENABLED`: reads `import.meta.env.VITE_MOCK`
- Generates 250 unique products using combinatorial names
- Power-law distribution for views: `80 + 45000 * Math.pow(raw / 10000, 3)` — ensures top products have visibly different metrics
- Prices skewed with randomization; conversion rate inversely correlated with price
- Mock functions: `mockOverview()`, `mockTimeseries()`, `mockTopProducts()`, `mockProductStats()`, `mockAllProducts()`

### AnalyticsPage.tsx
- KPI cards: total views, purchases, revenue, conversion rate (with period-over-period change indicators)
- Timeseries charts: views + purchases overlay, revenue area chart, daily conversion line chart
- Product rankings: Tabbed (views / purchases / revenue) with top N selector (5/10/20/50)
- Product stats table: Paginated, searchable
- All `useQuery` calls have `enabled: !MOCK_ENABLED`

---

## 12. Worker (BullMQ)

**Entry**: `apps/worker/src/worker.ts`
- Connects to Redis and registers BullMQ worker on `analytics` queue
- Processes `aggregate-today` jobs

**aggregateToday.ts**:
1. Upserts `product_daily_stats`: counts views, purchases, revenue per product for today
2. Upserts `user_daily_stats`: counts views, purchases, spend per user for today
3. Invalidates Redis cache keys: `top_products:*`, `user_summary:*`

**Queue producer**: `apps/api/src/queue/analyticsQueue.ts` — API enqueues jobs after event/purchase ingestion

---

## 13. Deployment (Railway)

### Services on Railway
| Service | Type | Notes |
|---------|------|-------|
| API | Dockerfile (`apps/api/Dockerfile`) | Public domain: `https://hp-analytics.up.railway.app` |
| Worker | Dockerfile (`apps/worker/Dockerfile`) | No public networking needed. Root dir set to `/apps/worker/` |
| Postgres | Railway managed | Internal: `postgres.railway.internal:5432` |
| Redis | Railway managed | Internal: `redis.railway.internal:6379` |

### Railway environment variables (on API + Worker services)
```
DATABASE_URL=postgresql://postgres:HRnmyvRYtFPDmpORTJWyAzdcVfhsSIGZ@postgres.railway.internal:5432/railway
REDIS_URL=redis://default:bcRrlZADQPXtSEQMDXPcemfmmCOzWaXQ@redis.railway.internal:6379
JWT_SECRET=GingerJesus69
NODE_ENV=production
PORT=8080
```

### Railway Postgres external connection (for migrations/debugging)
```
URL: postgresql://postgres:HRnmyvRYtFPDmpORTJWyAzdcVfhsSIGZ@centerbeam.proxy.rlwy.net:56479/railway
psql: PGPASSWORD=HRnmyvRYtFPDmpORTJWyAzdcVfhsSIGZ psql -h centerbeam.proxy.rlwy.net -U postgres -p 56479 -d railway
```

### Deploying
- Push to `main` branch on GitHub → Railway auto-deploys
- API Dockerfile context is repo root, dockerfile at `apps/api/Dockerfile`
- Worker root directory is `/apps/worker/`, dockerfile is relative to worker context

### Super admin seeded?
Yes. Run against Railway DB:
```bash
DATABASE_URL="postgresql://postgres:HRnmyvRYtFPDmpORTJWyAzdcVfhsSIGZ@centerbeam.proxy.rlwy.net:56479/railway" npx tsx apps/api/src/scripts/seed-admin.ts
```

### SQL migrations run?
Migrations 001 and 002 were run automatically by Docker Compose init. Migrations 003, 004, and 005 need to be run manually on Railway's Postgres:
```sql
-- Run these on the Railway database
-- 003_product_fields.sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category text;
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- 004_session_tracking.sql
ALTER TABLE events ADD COLUMN IF NOT EXISTS session_id text;
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id) WHERE session_id IS NOT NULL;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_type_check;
ALTER TABLE events ADD CONSTRAINT events_type_check
  CHECK (type IN ('view', 'click', 'add_to_cart', 'remove_from_cart', 'checkout_start', 'search'));

-- 005_funnel_stats_columns.sql
ALTER TABLE product_daily_stats ADD COLUMN IF NOT EXISTS clicks int NOT NULL DEFAULT 0;
ALTER TABLE product_daily_stats ADD COLUMN IF NOT EXISTS add_to_carts int NOT NULL DEFAULT 0;
ALTER TABLE product_daily_stats ADD COLUMN IF NOT EXISTS checkout_starts int NOT NULL DEFAULT 0;
```

---

## 14. Environment Variables

### Backend (apps/api)
| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 8080 | Server port |
| NODE_ENV | development | |
| DATABASE_URL | "" | PostgreSQL connection string |
| REDIS_URL | "" | Full Redis URL (takes precedence) |
| REDIS_HOST | localhost | Fallback if no REDIS_URL |
| REDIS_PORT | 6379 | Fallback if no REDIS_URL |
| JWT_SECRET | change_me | JWT signing secret |
| RATE_LIMIT_MAX | 100 | Requests per window |
| RATE_LIMIT_WINDOW_MS | 60000 | Rate limit window (ms) |
| CORS_ORIGINS | "" | Comma-separated allowed origins. Empty = allow all |

### Worker (apps/worker)
Same DB/Redis env vars. No PORT or CORS needed.

### Frontend (frontend/)
| Variable | Current Value | Description |
|----------|--------------|-------------|
| VITE_API_URL | https://hp-analytics.up.railway.app | Backend API base URL |
| VITE_MOCK | true | When "true", analytics page uses mock data |

---

## 15. Docker / Local Development

### Quick start (local)
```bash
cd infra
docker compose up --build
```
This starts: Postgres (5432), Redis (6379), API (8080), Worker, Nginx (80)

SQL files in `sql/` are auto-mounted as Postgres init scripts.

### Frontend dev
```bash
cd frontend
npm install
npm run dev     # Vite dev server at http://localhost:5173
```

### API dev (without Docker)
```bash
cd apps/api
npm install
# Set DATABASE_URL and REDIS_URL in environment
npm run dev     # tsx watch on port 8080
```

### Worker dev
```bash
cd apps/worker
npm install
npm run dev
```

### Seed admin
```bash
cd apps/api
DATABASE_URL="your_connection_string" npm run seed:admin
```

### Run tests
```bash
cd apps/api && npm test
cd apps/worker && npm test
```

---

## 16. Git Status & Uncommitted Changes

**Last commit**: `9981b39` — "Add CORS support and admin seed script"

**Uncommitted modified files** (staged for commit):
```
M apps/api/src/app.ts                        # CORS_ORIGINS support
M apps/api/src/config/env.ts                 # Added CORS_ORIGINS
M apps/api/src/plugins/core.ts               # Added optionalAuth decorator
M apps/api/src/repositories/analyticsRepo.ts
M apps/api/src/repositories/eventRepo.ts     # session_id, expanded event types, linkSession
M apps/api/src/repositories/productRepo.ts   # description, image_url, category, search/filter/sort
M apps/api/src/repositories/purchaseRepo.ts  # getUserPurchases with product JOIN
M apps/api/src/routes/analyticsRoutes.ts
M apps/api/src/routes/eventsRoutes.ts        # optionalAuth, session_id, link-session endpoint
M apps/api/src/routes/productsRoutes.ts      # categories endpoint, new query params, new body fields
M apps/api/src/routes/purchasesRoutes.ts     # GET /purchases/me endpoint
M apps/api/src/services/analyticsService.ts
M apps/api/src/services/eventService.ts
M apps/api/src/services/productService.ts
M apps/api/src/services/purchaseService.ts
M infra/.env.example                         # CORS_ORIGINS example
```

**Untracked new files**:
```
?? frontend/                                 # Entire admin frontend (new)
?? sql/003_product_fields.sql               # Product enrichment migration
?? sql/004_session_tracking.sql             # Session tracking migration
```

**IMPORTANT**: These changes have NOT been committed or pushed. The deployed Railway API is still running the code from commit `9981b39`. The e-commerce readiness changes (optionalAuth, session tracking, product enrichment, purchase history, expanded event types) exist only locally.

---

## 17. E-Commerce Integration Plan

The backend was enhanced to support a **separate e-commerce frontend** (different repo). Here's what was built and what remains:

### What's ready (locally, not yet deployed)
- **Product catalog API**: Search, filter by category/price, sort — `GET /products` with full query params
- **Categories endpoint**: `GET /products/categories`
- **Product enrichment**: description, image_url, category fields on products
- **Anonymous event tracking**: `optionalAuth` + `session_id` on event routes
- **Expanded event types**: view, click, add_to_cart, remove_from_cart, checkout_start, search
- **Session linking**: `POST /events/link-session` to merge anonymous session to user after login
- **Purchase history**: `GET /purchases/me` with product info and pagination
- **Flexible CORS**: `CORS_ORIGINS` env var for restricting allowed origins

### What the e-commerce frontend needs to implement
- Generate a `session_id` (UUID) on first visit, store in localStorage
- Send `session_id` with all event tracking calls
- On user login, call `POST /events/link-session` to merge session
- Use `GET /products` with search/filter/sort for browsing
- Use `POST /events` or `POST /events/bulk` for tracking
- Use `POST /purchases` for checkout
- Use `GET /purchases/me` for order history
- Handle JWT auth (login/register flows)

### What's NOT yet built
- Funnel analytics (multi-step conversion tracking)
- Webhook notifications
- Real-time event feed (WebSocket)
- CSV/PDF export for analytics
- A/B test tracking
- Search analytics aggregation
- User invitation system (admin invites users)
- First-login password change flow

---

## 18. Known Issues & Gotchas

1. **Uncommitted changes**: All e-commerce readiness work (optionalAuth, session tracking, product enrichment, etc.) is local only. Must commit and push to deploy.

2. **SQL migrations 003 + 004 + 005**: Must be run manually on Railway Postgres before deploying the updated API code. The Railway Postgres doesn't auto-run new SQL files.

3. **Worker Dockerfile context**: The worker Dockerfile assumes `apps/worker` as build context (copies `package.json`, `src` from current dir). On Railway, the root directory is set to `/apps/worker/`. If the Dockerfile dropdown on Railway shows `apps/api/Dockerfile`, it needs to be changed — but Railway's UI only offers a dropdown (not free text). The workaround was setting root directory to `/apps/worker/` which makes Railway look for `Dockerfile` in that directory.

4. **CORS**: Currently set to `origin: true` (allow all) on deployed version. The local version supports `CORS_ORIGINS` env var. When deploying the updated code, set `CORS_ORIGINS` on Railway to include the e-commerce frontend's domain.

5. **Mock mode**: Frontend has `VITE_MOCK=true`. Set to `false` when you want to use the real API for analytics.

6. **No root package.json**: Each app has its own package.json. There's no monorepo tooling (no turborepo/nx/lerna). Each app is managed independently.

7. **Redis connection**: Uses `REDIS_URL` if provided (Railway format), falls back to `REDIS_HOST`/`REDIS_PORT`. The URL parser handles password extraction from the connection string.

---

## 19. E-Commerce Integration Readiness Plan (Original)

This is the full original plan (`e-commerce_integration_readiness_0eebc2d4.plan.md`). Status annotations show what was implemented vs what remains.

### Current State Summary

The system today has: JWT auth (register/login), product CRUD (admin-only), event ingestion (view/click, JWT required), purchase recording (JWT required), analytics (overview, timeseries, top products, product stats), Redis caching, BullMQ worker for aggregation, Docker deployment with Nginx.

**The core problem: the backend was built assuming all users are logged-in admin/dashboard users.** An e-commerce site needs to track anonymous browsers, send events from client-side JS without a JWT, and record purchases server-to-server.

### Phase 1 — Required for E-Commerce Integration

#### 1. API Key Authentication System — NOT DONE

**Why:** The e-commerce site's frontend JS cannot use JWT (anonymous visitors have no account). It needs an API key to authenticate tracking requests.

**Backend changes needed:**
- New table `api_keys` (id, name, key_hash, key_prefix, permissions, active, created_at, last_used_at)
- New file: `apps/api/src/middleware/apiKeyAuth.ts` — middleware that validates `X-API-Key` header, rate-limits per key
- New routes in `apps/api/src/routes/apiKeyRoutes.ts`:
  - `POST /api-keys` (admin) — create key, return plaintext once
  - `GET /api-keys` (admin) — list keys (prefix only, not full key)
  - `DELETE /api-keys/:id` (admin) — revoke key
- SQL migration: `sql/005_api_keys.sql`

**Admin dashboard changes needed:**
- New page: "Integrations" or "API Keys" — create, list, revoke keys; copy key on creation
- Add to sidebar under Admin section

**Note:** Currently the system uses `optionalAuth` (JWT optional) instead of API keys. This works but API keys would be more appropriate for server-to-server and client-side tracking from the e-commerce site.

#### 2. Anonymous Event Tracking — DONE (locally, not deployed)

Implemented via `optionalAuth` decorator + `session_id` field:
- `session_id` column added to `events` table (migration 004)
- Event routes accept JWT OR `session_id`
- `user_id` is null for anonymous events

#### 3. Expanded Event Types — MOSTLY DONE (local, not deployed)

**Done:** Event types expanded to: `view`, `click`, `add_to_cart`, `remove_from_cart`, `checkout_start`, `search`

**Still not done:**
- `wishlist` and `checkout_complete` event types not added
- `remove_from_cart` and `search` are still not represented in `product_daily_stats` columns

#### 4. Server-to-Server Purchase Recording — NOT DONE

**What's done:** `GET /purchases/me` endpoint for user purchase history

**NOT done:**
- No API key auth on purchase routes (still JWT-only)
- No `order_id` column on purchases table
- No `amount_override` support (for discounts/coupons)
- No `POST /purchases/bulk` for multi-item orders
- No way for e-commerce backend to record purchases on behalf of a user

#### 5. CORS Configuration — DONE (locally, not deployed)

`CORS_ORIGINS` env var reads comma-separated origins. Falls back to `origin: true` if empty.

#### 6. Integration Documentation — NOT DONE

**Needed:**
- `docs/INTEGRATION.md` with:
  - How to obtain an API key from the admin dashboard
  - REST endpoint reference for events and purchases
  - Copy-paste JS snippet for tracking (auto session_id, batching, page unload flush)
  - Server-side examples (Node.js) for recording purchases after payment

### Phase 2 — Important Improvements

#### 7. Funnel Analytics — NOT DONE

- New endpoint needed: `GET /analytics/funnel?days=30`
- Returns step counts: `{ view: N, click: N, add_to_cart: N, checkout_start: N, purchase: N }`
- Needs expanded `product_daily_stats` columns first
- Admin dashboard: new funnel chart component

#### 8. Session Attribution — DONE (locally, not deployed)

`POST /events/link-session` endpoint:
- JWT required (authenticated user calling it)
- Body: `{ session_id }`
- Updates all events with that `session_id` to set `user_id` to the authenticated user

#### 9. Product Detail Enrichment — DONE (locally, not deployed)

- `description`, `image_url`, `category` columns added to products (migration 003)
- Product CRUD routes updated
- Admin forms updated with new fields
- `sku` field was NOT added (not in the implemented version)

#### 10. Webhook Notifications — NOT DONE

- New table `webhooks` (id, url, events, secret, active)
- Admin UI to manage webhooks
- Worker emits webhook calls on configured triggers

### Phase 3 — Nice to Have (ALL NOT DONE)

- Real-time event feed (WebSocket for live event stream on admin dashboard)
- CSV/PDF export of analytics data
- A/B test tracking (variant field on events)
- Search analytics (track what users search for)

### Data Flow After Full Integration

```mermaid
sequenceDiagram
    participant Browser as E-Commerce Browser
    participant EcomAPI as E-Commerce Backend
    participant HpAPI as HP Analytics API
    participant Queue as BullMQ
    participant Worker as Worker
    participant DB as PostgreSQL
    participant Admin as Admin Dashboard

    Note over Browser: Anonymous visitor
    Browser->>HpAPI: POST /events (X-API-Key, session_id)
    HpAPI->>DB: Insert event
    HpAPI->>Queue: Enqueue aggregation job

    Note over Browser: Customer logs in
    EcomAPI->>HpAPI: POST /events/link-session (session_id, user_id)

    Note over Browser: Customer buys
    EcomAPI->>HpAPI: POST /purchases (X-API-Key, user_id, product_id, order_id)
    HpAPI->>DB: Insert purchase
    HpAPI->>Queue: Enqueue aggregation job

    Worker->>Queue: Process jobs
    Worker->>DB: Update daily stats

    Admin->>HpAPI: GET /analytics/* (JWT)
    HpAPI->>DB: Query aggregated stats
    HpAPI-->>Admin: Analytics data
```

### Implementation Status Summary

| Item | Status | Notes |
|------|--------|-------|
| 1. API Keys | NOT DONE | No API key system. Using optionalAuth (JWT optional) as workaround |
| 2. Anonymous Tracking | DONE (local) | optionalAuth + session_id. Not committed/deployed |
| 3. Event Types | PARTIAL | Types expanded, and local code now aggregates `clicks`, `add_to_carts`, `checkout_starts`; `wishlist`/`checkout_complete` and extra rollups still pending |
| 4. Purchase Enhancements | PARTIAL | GET /purchases/me done. No API key auth, order_id, bulk, or amount_override |
| 5. CORS Config | DONE (local) | CORS_ORIGINS env var. Not committed/deployed |
| 6. Integration Docs | NOT DONE | No docs/INTEGRATION.md |
| 7. Funnel Analytics | NOT DONE | Needs expanded daily stats first |
| 8. Session Attribution | DONE (local) | POST /events/link-session. Not committed/deployed |
| 9. Product Enrichment | DONE (local) | description, image_url, category. No sku. Not committed/deployed |
| 10. Webhooks | NOT DONE | No webhook system |
| Phase 3 items | NOT DONE | WebSocket, export, A/B, search analytics |

### Recommended Implementation Order (remaining items)

1. **API key system** (everything server-to-server depends on this)
2. **Expand product_daily_stats** + update worker aggregation for new event types
3. **Purchase enhancements** (API key auth, order_id, bulk, amount_override)
4. **Funnel analytics** endpoint + chart
5. **Integration documentation** (docs/INTEGRATION.md)
6. **Webhooks**
7. Phase 3 nice-to-haves

---

## 20. Suggested Next Improvements

### High Priority
1. **Commit and deploy all local changes** — Push the e-commerce readiness code
2. **Run SQL migrations 003 + 004 + 005** on Railway Postgres
3. **User invitation system** — Admin can invite users with email, invited user sets password on first login
4. **First-login password change** — Force password reset on initial admin login
5. **Funnel analytics** — Track conversion funnel (view → add_to_cart → checkout_start → purchase)

### Medium Priority
6. **Real-time dashboard** — WebSocket or SSE for live event stream on the admin dashboard
7. **CSV/PDF export** — Export analytics data and product reports
8. **Notification system** — Email/webhook alerts for anomalies (traffic spikes, conversion drops)
9. **Product image upload** — File upload to S3/Cloudinary instead of manual URL entry
10. **Dark mode toggle** — Frontend theme switching
11. **Dashboard customization** — Drag-and-drop widget layout for the main dashboard

### Lower Priority
12. **A/B test tracking** — Experiment variants in events
13. **Search analytics** — Aggregate search queries, show popular searches, zero-result queries
14. **Audit log** — Track all admin actions (product changes, user management)
15. **API key authentication** — For server-to-server integration (e-commerce backend → analytics API)
16. **Rate limit per API key** — Different limits for different integrations
17. **Batch analytics queries** — GraphQL or composite endpoints for fewer round trips
18. **Test coverage** — Expand vitest tests for new endpoints
19. **CI/CD pipeline** — GitHub Actions for test + lint on PR
