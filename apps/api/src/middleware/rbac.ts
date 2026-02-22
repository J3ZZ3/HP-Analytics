import { FastifyRequest } from "fastify";
import { ApiError } from "../utils/errors.js";

export type Role = "user" | "admin";

export function requireRole(req: FastifyRequest, role: Role) {
  // @fastify/jwt attaches user to request after verify()
  const user = (req as any).user as { role?: Role } | undefined;
  if (!user?.role) throw new ApiError(401, "UNAUTHORIZED", "Not authenticated");
  if (user.role !== role) throw new ApiError(403, "FORBIDDEN", "Insufficient permissions");
}
