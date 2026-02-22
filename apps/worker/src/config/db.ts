import { Pool } from "pg";
import { env } from "./env.js";

export const pgPool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 5
});
