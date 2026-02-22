import { Pool } from "pg";
import bcrypt from "bcrypt";

const DATABASE_URL = process.env.DATABASE_URL || "";
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const ADMIN_EMAIL = "jesse.mashoana@gmail.com";
const ADMIN_PASSWORD = "password123!";

async function seed() {
  const pool = new Pool({ connectionString: DATABASE_URL, max: 2 });

  try {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    const res = await pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, 'admin')
       ON CONFLICT (email) DO UPDATE SET role = 'admin', password_hash = $2
       RETURNING id, email, role, created_at`,
      [ADMIN_EMAIL, passwordHash],
    );

    const user = res.rows[0];
    console.log("Super admin ready:");
    console.log(`  ID:    ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role:  ${user.role}`);
  } catch (err) {
    console.error("Failed to seed admin:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
