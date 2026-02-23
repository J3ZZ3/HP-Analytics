import { pgPool } from "../config/db.js";

export type EventType = "view" | "click" | "add_to_cart" | "remove_from_cart" | "checkout_start" | "search";

export interface EventInput {
  userId: string | null;
  sessionId: string | null;
  productId: string;
  type: EventType;
  ts?: string;
  meta?: any;
}

export async function insertEvent(data: EventInput): Promise<string> {
  const res = await pgPool.query<{ id: string }>(
    `INSERT INTO events(user_id, session_id, product_id, type, ts, meta)
     VALUES ($1, $2, $3, $4, coalesce($5::timestamptz, now()), $6::jsonb)
     RETURNING id`,
    [data.userId, data.sessionId, data.productId, data.type, data.ts || null, JSON.stringify(data.meta || {})],
  );
  return res.rows[0].id;
}

export async function insertEventsBulk(rows: EventInput[]): Promise<number> {
  if (rows.length === 0) return 0;
  const userIds = rows.map((r) => r.userId);
  const sessionIds = rows.map((r) => r.sessionId);
  const productIds = rows.map((r) => r.productId);
  const types = rows.map((r) => r.type);
  const tss = rows.map((r) => r.ts || null);
  const metas = rows.map((r) => JSON.stringify(r.meta || {}));

  await pgPool.query(
    `INSERT INTO events(user_id, session_id, product_id, type, ts, meta)
     SELECT u, s, p, t, coalesce(ts::timestamptz, now()), m::jsonb
     FROM unnest($1::uuid[], $2::text[], $3::uuid[], $4::text[], $5::text[], $6::text[]) AS x(u, s, p, t, ts, m)`,
    [userIds, sessionIds, productIds, types, tss, metas],
  );
  return rows.length;
}

export async function linkSession(sessionId: string, userId: string): Promise<number> {
  const res = await pgPool.query(
    "UPDATE events SET user_id = $1 WHERE session_id = $2 AND user_id IS NULL",
    [userId, sessionId],
  );
  return res.rowCount || 0;
}
