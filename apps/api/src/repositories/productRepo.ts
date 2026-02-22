import { pgPool } from "../config/db.js";

export type DbProduct = {
  id: string;
  name: string;
  price: string; // numeric comes as string
  status: "active" | "inactive";
  created_at: string;
};

export async function listProducts(params: { status?: string; limit: number; offset: number; }): Promise<{ total: number; items: DbProduct[]; }> {
  const where: string[] = [];
  const values: any[] = [];
  if (params.status) {
    values.push(params.status);
    where.push(`status = $${values.length}`);
  }
  const whereSql = where.length ? `where ${where.join(" and ")}` : "";

  const totalRes = await pgPool.query<{ count: string }>(
    `select count(*)::text as count from products ${whereSql}`,
    values
  );
  const total = Number(totalRes.rows[0]?.count || 0);

  values.push(params.limit);
  values.push(params.offset);

  const itemsRes = await pgPool.query<DbProduct>(
    `select id, name, price, status, created_at from products ${whereSql} order by created_at desc limit $${values.length-1} offset $${values.length}`,
    values
  );

  return { total, items: itemsRes.rows };
}

export async function getProductById(id: string): Promise<DbProduct | null> {
  const res = await pgPool.query<DbProduct>(
    "select id, name, price, status, created_at from products where id=$1 limit 1",
    [id]
  );
  return res.rowCount ? res.rows[0] : null;
}

export async function createProduct(data: { name: string; price: number; status: "active"|"inactive"; }): Promise<DbProduct> {
  const res = await pgPool.query<DbProduct>(
    "insert into products(name, price, status) values ($1,$2,$3) returning id, name, price, status, created_at",
    [data.name, data.price, data.status]
  );
  return res.rows[0];
}

export async function updateProduct(id: string, patch: Partial<{ name: string; price: number; status: "active"|"inactive"; }>): Promise<DbProduct | null> {
  const fields: string[] = [];
  const values: any[] = [];
  if (patch.name !== undefined) { values.push(patch.name); fields.push(`name=$${values.length}`); }
  if (patch.price !== undefined) { values.push(patch.price); fields.push(`price=$${values.length}`); }
  if (patch.status !== undefined) { values.push(patch.status); fields.push(`status=$${values.length}`); }
  if (!fields.length) return getProductById(id);

  values.push(id);
  const res = await pgPool.query<DbProduct>(
    `update products set ${fields.join(", ")} where id=$${values.length} returning id, name, price, status, created_at`,
    values
  );
  return res.rowCount ? res.rows[0] : null;
}

export async function deleteProduct(id: string): Promise<boolean> {
  const res = await pgPool.query("delete from products where id=$1", [id]);
  return (res.rowCount || 0) > 0;
}
