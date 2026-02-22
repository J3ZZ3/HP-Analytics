# architecture.md

## High-Performance Product Analytics API

### Components
- Nginx reverse proxy (gzip, keepalive)
- Fastify API service
- PostgreSQL database
- Redis (cache + BullMQ backend)
- Worker service for async aggregation

### Key Performance Patterns
- Async aggregation: writes enqueue jobs; worker updates aggregates.
- Cache hot reads: product-by-id, top-products, user-summary.
- Rate limiting: protect login and write-heavy endpoints.
- Indexed queries: events/purchases by (product_id, ts) and (user_id, ts).
- Observability: health/readiness endpoints, structured logs, metrics.

### Cache Keys (suggested)
- `product:{id}`
- `top_products:{days}:{limit}`
- `user_summary:{userId}:{days}`

### Invalidation Strategy
- Product update/delete: invalidate `product:{id}`
- Worker updates stats: invalidate `top_products:*` and affected `user_summary:*` keys (or use short TTL)

### Scaling (10x traffic)
- Run multiple API replicas behind Nginx/ingress
- Redis cluster
- Postgres read replicas for read-heavy product listing
- Consider partitioning events by time if huge
- Introduce CDN + caching headers for immutable data
