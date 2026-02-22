# Load Testing

Uses [autocannon](https://github.com/mcollina/autocannon) for HTTP benchmarking.

## Prerequisites
- Docker Compose running all services (`cd infra && docker compose up --build`)
- Node.js on host

## Quick Run

```bash
# From repo root, via Nginx:
npx autocannon -c 200 -d 20 http://localhost/health

# Direct to API (bypass Nginx):
npx autocannon -c 200 -d 20 http://localhost:8080/health
```

## Full Suite
```bash
bash loadtest/run.sh
```

## Endpoints to Benchmark
| Endpoint | Type | Cached? |
|---|---|---|
| `GET /health` | Liveness | No |
| `GET /products` | List | No |
| `GET /products/:id` | Single | Yes (Redis) |
| `GET /analytics/products/top` | Aggregate | Yes (Redis 60s TTL) |
| `GET /metrics` | System | No |

## Comparing Baseline vs Optimized
1. Disable Redis cache (set TTL to 0 or comment out cache reads) and run benchmarks
2. Re-enable cache and run same benchmarks
3. Compare RPS, avg latency, p95, p99
