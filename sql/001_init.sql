-- 001_init.sql
-- Basic schema for HP Analytics

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  price numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('view','click')),
  ts timestamptz NOT NULL DEFAULT now(),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty int NOT NULL DEFAULT 1 CHECK (qty >= 1),
  amount numeric(12,2) NOT NULL DEFAULT 0,
  ts timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_daily_stats (
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  day date NOT NULL,
  views int NOT NULL DEFAULT 0,
  purchases int NOT NULL DEFAULT 0,
  revenue numeric(12,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, day)
);

CREATE TABLE IF NOT EXISTS user_daily_stats (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day date NOT NULL,
  views int NOT NULL DEFAULT 0,
  purchases int NOT NULL DEFAULT 0,
  spend numeric(12,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
