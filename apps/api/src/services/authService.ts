import { ApiError } from "../utils/errors.js";
import { hashPassword, verifyPassword } from "../utils/auth.js";
import { createUser, findUserByEmail } from "../repositories/userRepo.js";
import type { FastifyInstance } from "fastify";

export async function register(app: FastifyInstance, email: string, password: string) {
  const existing = await findUserByEmail(email);
  if (existing) throw new ApiError(409, "CONFLICT", "Email already exists");

  const passwordHash = await hashPassword(password);
  const user = await createUser(email, passwordHash, "user");
  const token = app.jwt.sign({ sub: user.id, role: user.role, email: user.email });

  return { token, user: { id: user.id, email: user.email, role: user.role, created_at: user.created_at } };
}

export async function login(app: FastifyInstance, email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user) throw new ApiError(401, "UNAUTHORIZED", "Invalid credentials");

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) throw new ApiError(401, "UNAUTHORIZED", "Invalid credentials");

  const token = app.jwt.sign({ sub: user.id, role: user.role, email: user.email });
  return { token, user: { id: user.id, email: user.email, role: user.role, created_at: user.created_at } };
}
