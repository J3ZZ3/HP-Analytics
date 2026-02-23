-- 004_session_tracking.sql
-- Add session tracking for anonymous visitors and expand event types

ALTER TABLE events ADD COLUMN IF NOT EXISTS session_id text;

CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id) WHERE session_id IS NOT NULL;

-- Drop old CHECK constraint and add expanded one
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_type_check;
ALTER TABLE events ADD CONSTRAINT events_type_check
  CHECK (type IN ('view', 'click', 'add_to_cart', 'remove_from_cart', 'checkout_start', 'search'));

-- Allow null user_id for anonymous events (already nullable from 001_init.sql)
