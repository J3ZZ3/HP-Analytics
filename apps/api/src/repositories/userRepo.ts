import { pgPool } from "../config/db.js";

export type DbUser = {
  id: string;
  email: string;
  password_hash: string;
  role: "user" | "admin";
  created_at: string;
};

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const res = await pgPool.query<DbUser>(
    "select id, email, password_hash, role, created_at from users where email=$1 limit 1",
    [email]
  );
  return res.rowCount ? res.rows[0] : null;
}

export async function createUser(email: string, passwordHash: string, role: "user" | "admin" = "user"): Promise<DbUser> {
  const res = await pgPool.query<DbUser>(
    "insert into users(email, password_hash, role) values ($1,$2,$3) returning id, email, password_hash, role, created_at",
    [email, passwordHash, role]
  );
  return res.rows[0];
}

export async function findUserById(id: string): Promise<Omit<DbUser, "password_hash"> | null> {
  const res = await pgPool.query<Omit<DbUser, "password_hash">>(
    "select id, email, role, created_at from users where id=$1 limit 1",
    [id]
  );
  return res.rowCount ? res.rows[0] : null;
}
