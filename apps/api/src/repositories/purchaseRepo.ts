import { pgPool } from "../config/db.js";

export type DbPurchase = {
  id: string;
  user_id: string;
  product_id: string;
  qty: number;
  amount: string;
  ts: string;
};

export type DbPurchaseWithProduct = DbPurchase & {
  product_name: string;
  product_image_url: string | null;
  product_price: string;
};

export async function createPurchase(data: {
  userId: string;
  productId: string;
  qty: number;
  amount: number;
}): Promise<DbPurchase> {
  const res = await pgPool.query<DbPurchase>(
    "INSERT INTO purchases(user_id, product_id, qty, amount) VALUES ($1,$2,$3,$4) RETURNING id, user_id, product_id, qty, amount, ts",
    [data.userId, data.productId, data.qty, data.amount],
  );
  return res.rows[0];
}

export async function getUserPurchases(params: {
  userId: string;
  sortBy: string;
  sortDir: string;
  limit: number;
  offset: number;
}): Promise<{ total: number; items: DbPurchaseWithProduct[] }> {
  const ALLOWED_SORT = ["ts", "amount"] as const;
  const sortCol = ALLOWED_SORT.includes(params.sortBy as any) ? params.sortBy : "ts";
  const sortDir = params.sortDir === "asc" ? "ASC" : "DESC";

  const totalRes = await pgPool.query<{ count: string }>(
    "SELECT count(*)::text AS count FROM purchases WHERE user_id = $1",
    [params.userId],
  );
  const total = Number(totalRes.rows[0]?.count || 0);

  const itemsRes = await pgPool.query<DbPurchaseWithProduct>(
    `SELECT pu.id, pu.user_id, pu.product_id, pu.qty, pu.amount, pu.ts,
            coalesce(p.name, pu.product_id::text) AS product_name,
            p.image_url AS product_image_url,
            coalesce(p.price, 0) AS product_price
       FROM purchases pu
       LEFT JOIN products p ON p.id = pu.product_id
      WHERE pu.user_id = $1
      ORDER BY pu.${sortCol} ${sortDir}
      LIMIT $2 OFFSET $3`,
    [params.userId, params.limit, params.offset],
  );

  return { total, items: itemsRes.rows };
}
