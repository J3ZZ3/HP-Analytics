import { pgPool } from "../config/db.js";

export type DbPurchase = {
  id: string;
  user_id: string;
  product_id: string;
  qty: number;
  amount: string;
  ts: string;
};

export async function createPurchase(data: { userId: string; productId: string; qty: number; amount: number; }): Promise<DbPurchase> {
  const res = await pgPool.query<DbPurchase>(
    "insert into purchases(user_id, product_id, qty, amount) values ($1,$2,$3,$4) returning id, user_id, product_id, qty, amount, ts",
    [data.userId, data.productId, data.qty, data.amount]
  );
  return res.rows[0];
}
