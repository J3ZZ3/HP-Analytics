import { pgPool } from "../config/db.js";

export type DbProduct = {
  id: string;
  name: string;
  price: string; // numeric comes as string
  status: "active" | "inactive";
  description: string | null;
  image_url: string | null;
  category: string | null;
  created_at: string;
};

const SELECT_COLS = "id, name, price, status, description, image_url, category, created_at";

export async function listProducts(params: {
  status?: string;
  search?: string;
  category?: string;
  min_price?: number;
  max_price?: number;
  sort_by?: string;
  sort_dir?: string;
  limit: number;
  offset: number;
}): Promise<{ total: number; items: DbProduct[] }> {
  const where: string[] = [];
  const values: any[] = [];

  if (params.status) {
    values.push(params.status);
    where.push(`status = $${values.length}`);
  }
  if (params.search) {
    values.push(`%${params.search}%`);
    where.push(`name ILIKE $${values.length}`);
  }
  if (params.category) {
    values.push(params.category);
    where.push(`category = $${values.length}`);
  }
  if (params.min_price !== undefined) {
    values.push(params.min_price);
    where.push(`price >= $${values.length}`);
  }
  if (params.max_price !== undefined) {
    values.push(params.max_price);
    where.push(`price <= $${values.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const totalRes = await pgPool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM products ${whereSql}`,
    values,
  );
  const total = Number(totalRes.rows[0]?.count || 0);

  const ALLOWED_SORT = ["name", "price", "created_at"] as const;
  const sortCol = ALLOWED_SORT.includes(params.sort_by as any) ? params.sort_by! : "created_at";
  const sortDir = params.sort_dir === "asc" ? "ASC" : "DESC";

  values.push(params.limit);
  values.push(params.offset);

  const itemsRes = await pgPool.query<DbProduct>(
    `SELECT ${SELECT_COLS} FROM products ${whereSql} ORDER BY ${sortCol} ${sortDir} LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );

  return { total, items: itemsRes.rows };
}

export async function getProductById(id: string): Promise<DbProduct | null> {
  const res = await pgPool.query<DbProduct>(
    `SELECT ${SELECT_COLS} FROM products WHERE id=$1 LIMIT 1`,
    [id],
  );
  return res.rowCount ? res.rows[0] : null;
}

export async function createProduct(data: {
  name: string;
  price: number;
  status: "active" | "inactive";
  description?: string;
  image_url?: string;
  category?: string;
}): Promise<DbProduct> {
  const res = await pgPool.query<DbProduct>(
    `INSERT INTO products(name, price, status, description, image_url, category)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING ${SELECT_COLS}`,
    [data.name, data.price, data.status, data.description || null, data.image_url || null, data.category || null],
  );
  return res.rows[0];
}

export async function updateProduct(
  id: string,
  patch: Partial<{
    name: string;
    price: number;
    status: "active" | "inactive";
    description: string;
    image_url: string;
    category: string;
  }>,
): Promise<DbProduct | null> {
  const fields: string[] = [];
  const values: any[] = [];
  if (patch.name !== undefined) { values.push(patch.name); fields.push(`name=$${values.length}`); }
  if (patch.price !== undefined) { values.push(patch.price); fields.push(`price=$${values.length}`); }
  if (patch.status !== undefined) { values.push(patch.status); fields.push(`status=$${values.length}`); }
  if (patch.description !== undefined) { values.push(patch.description); fields.push(`description=$${values.length}`); }
  if (patch.image_url !== undefined) { values.push(patch.image_url); fields.push(`image_url=$${values.length}`); }
  if (patch.category !== undefined) { values.push(patch.category); fields.push(`category=$${values.length}`); }
  if (!fields.length) return getProductById(id);

  values.push(id);
  const res = await pgPool.query<DbProduct>(
    `UPDATE products SET ${fields.join(", ")} WHERE id=$${values.length} RETURNING ${SELECT_COLS}`,
    values,
  );
  return res.rowCount ? res.rows[0] : null;
}

export async function deleteProduct(id: string): Promise<boolean> {
  const res = await pgPool.query("DELETE FROM products WHERE id=$1", [id]);
  return (res.rowCount || 0) > 0;
}

export async function listCategories(): Promise<string[]> {
  const res = await pgPool.query<{ category: string }>(
    "SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category",
  );
  return res.rows.map((r) => r.category);
}
