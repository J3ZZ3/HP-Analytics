import { Client } from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  const statements = [
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS description text;",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url text;",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS category text;",
    "CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);",
    "ALTER TABLE events ADD COLUMN IF NOT EXISTS session_id text;",
    "CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id) WHERE session_id IS NOT NULL;",
    "ALTER TABLE events DROP CONSTRAINT IF EXISTS events_type_check;",
    "ALTER TABLE events ADD CONSTRAINT events_type_check CHECK (type IN ('view', 'click', 'add_to_cart', 'remove_from_cart', 'checkout_start', 'search'));",
    "ALTER TABLE product_daily_stats ADD COLUMN IF NOT EXISTS clicks int NOT NULL DEFAULT 0;",
    "ALTER TABLE product_daily_stats ADD COLUMN IF NOT EXISTS add_to_carts int NOT NULL DEFAULT 0;",
    "ALTER TABLE product_daily_stats ADD COLUMN IF NOT EXISTS checkout_starts int NOT NULL DEFAULT 0;",
  ];

  for (const sql of statements) {
    await client.query(sql);
  }

  await client.end();
  console.log("Railway migrations 003/004/005 applied successfully");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
