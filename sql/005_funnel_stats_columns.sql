-- 005_funnel_stats_columns.sql
-- Add funnel counters to product_daily_stats for expanded event analytics.
ALTER TABLE product_daily_stats ADD COLUMN IF NOT EXISTS clicks int NOT NULL DEFAULT 0;
ALTER TABLE product_daily_stats ADD COLUMN IF NOT EXISTS add_to_carts int NOT NULL DEFAULT 0;
ALTER TABLE product_daily_stats ADD COLUMN IF NOT EXISTS checkout_starts int NOT NULL DEFAULT 0;
