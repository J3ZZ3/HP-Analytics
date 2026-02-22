-- 002_indexes.sql
CREATE INDEX IF NOT EXISTS idx_events_product_ts ON events(product_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_events_user_ts ON events(user_id, ts DESC);

CREATE INDEX IF NOT EXISTS idx_purchases_product_ts ON purchases(product_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_user_ts ON purchases(user_id, ts DESC);

CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
