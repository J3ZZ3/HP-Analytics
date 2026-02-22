import { pgPool } from "../config/db.js";

export async function insertEvent(data: { userId: string | null; productId: string; type: "view"|"click"; ts?: string; meta?: any; }): Promise<string> {
  const res = await pgPool.query<{ id: string }>(
    "insert into events(user_id, product_id, type, ts, meta) values ($1,$2,$3, coalesce($4::timestamptz, now()), $5::jsonb) returning id",
    [data.userId, data.productId, data.type, data.ts || null, JSON.stringify(data.meta || {})]
  );
  return res.rows[0].id;
}

export async function insertEventsBulk(rows: Array<{ userId: string | null; productId: string; type: "view"|"click"; ts?: string; meta?: any; }>): Promise<number> {
  if (rows.length === 0) return 0;
  // Simple bulk insert using unnest
  const userIds = rows.map(r => r.userId);
  const productIds = rows.map(r => r.productId);
  const types = rows.map(r => r.type);
  const tss = rows.map(r => r.ts || null);
  const metas = rows.map(r => JSON.stringify(r.meta || {}));

  await pgPool.query(
    `insert into events(user_id, product_id, type, ts, meta)
     select u, p, t, coalesce(ts::timestamptz, now()), m::jsonb
     from unnest($1::uuid[], $2::uuid[], $3::text[], $4::text[], $5::text[]) as x(u,p,t,ts,m)`,
    [userIds, productIds, types, tss, metas]
  );
  return rows.length;
}
