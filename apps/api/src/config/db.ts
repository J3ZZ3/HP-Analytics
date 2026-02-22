import { Pool } from "pg";
import { env } from "../config/env.js";

export const pgPool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
});

export async function dbPing(): Promise<boolean> {
  try {
    const res = await pgPool.query("select 1 as ok");
    return res.rows?.[0]?.ok === 1;
  } catch {
    return false;
  }
}
