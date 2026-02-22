import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { hashPassword, verifyPassword } from "../src/utils/auth.js";

describe("password hashing (unit)", () => {
  it("hashPassword returns a bcrypt hash", async () => {
    const hash = await hashPassword("mysecretpw");
    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(hash.length).toBeGreaterThan(50);
  });

  it("verifyPassword returns true for correct password", async () => {
    const hash = await hashPassword("correcthorse");
    expect(await verifyPassword("correcthorse", hash)).toBe(true);
  });

  it("verifyPassword returns false for wrong password", async () => {
    const hash = await hashPassword("correcthorse");
    expect(await verifyPassword("wrongpassword", hash)).toBe(false);
  });
});

describe("RBAC middleware (unit)", () => {
  it("requireRole throws 401 when no user on request", async () => {
    const { requireRole } = await import("../src/middleware/rbac.js");
    const fakeReq = {} as any;
    expect(() => requireRole(fakeReq, "admin")).toThrow();
  });

  it("requireRole throws 403 when role does not match", async () => {
    const { requireRole } = await import("../src/middleware/rbac.js");
    const fakeReq = { user: { role: "user" } } as any;
    expect(() => requireRole(fakeReq, "admin")).toThrow();
  });

  it("requireRole does not throw when role matches", async () => {
    const { requireRole } = await import("../src/middleware/rbac.js");
    const fakeReq = { user: { role: "admin" } } as any;
    expect(() => requireRole(fakeReq, "admin")).not.toThrow();
  });
});

const mockQuery = vi.fn();
vi.mock("../src/config/db.js", () => ({
  pgPool: { query: (...args: unknown[]) => mockQuery(...args) },
  dbPing: vi.fn().mockResolvedValue(true),
}));

vi.mock("../src/config/redis.js", async () => {
  const mockRedis = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
    ping: vi.fn().mockResolvedValue("PONG"),
    on: vi.fn().mockReturnThis(),
    connect: vi.fn().mockResolvedValue(undefined),
    status: "ready",
    options: {},
    disconnect: vi.fn(),
    quit: vi.fn(),
    duplicate: vi.fn(),
  };
  return {
    redis: mockRedis,
    redisConnectionOpts: { host: "localhost", port: 6379 },
    redisPing: vi.fn().mockResolvedValue(true),
  };
});

import { buildApp } from "../src/app.js";
import type { FastifyInstance } from "fastify";

describe("auth E2E", () => {
  let app: FastifyInstance;

  beforeEach(() => {
    mockQuery.mockReset();
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it("POST /auth/register creates user and returns token", async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          id: "u-new",
          email: "new@test.com",
          password_hash: "hashed",
          role: "user",
          created_at: "2025-01-01T00:00:00Z",
        }],
      });

    app = buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "new@test.com", password: "password123" },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toHaveProperty("token");
    expect(body.user.email).toBe("new@test.com");
    expect(body.user.role).toBe("user");
    expect(body.user).not.toHaveProperty("password_hash");
  });

  it("POST /auth/register returns 409 for duplicate email", async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: "u1",
        email: "dup@test.com",
        password_hash: "h",
        role: "user",
        created_at: "2025-01-01T00:00:00Z",
      }],
    });

    app = buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "dup@test.com", password: "password123" },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe("CONFLICT");
  });

  it("POST /auth/login returns token for valid credentials", async () => {
    const hash = await hashPassword("password123");
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: "u1",
        email: "user@test.com",
        password_hash: hash,
        role: "user",
        created_at: "2025-01-01T00:00:00Z",
      }],
    });

    app = buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "user@test.com", password: "password123" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("token");
    expect(body.user.email).toBe("user@test.com");
  });

  it("POST /auth/login returns 401 for wrong password", async () => {
    const hash = await hashPassword("correctpassword");
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: "u1",
        email: "user@test.com",
        password_hash: hash,
        role: "user",
        created_at: "2025-01-01T00:00:00Z",
      }],
    });

    app = buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "user@test.com", password: "wrongpassword" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("UNAUTHORIZED");
  });

  it("POST /auth/login returns 401 for unknown email", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    app = buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "nobody@test.com", password: "password123" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("GET /auth/me returns 401 without token", async () => {
    app = buildApp();
    const res = await app.inject({ method: "GET", url: "/auth/me" });
    expect(res.statusCode).toBe(401);
  });

  it("GET /auth/me returns user with valid token", async () => {
    const hash = await hashPassword("password123");
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: "u1",
          email: "me@test.com",
          password_hash: hash,
          role: "user",
          created_at: "2025-01-01T00:00:00Z",
        }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: "u1", email: "me@test.com", role: "user", created_at: "2025-01-01T00:00:00Z" }],
      });

    app = buildApp();
    const loginRes = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "me@test.com", password: "password123" },
    });
    const token = loginRes.json().token;

    const meRes = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(meRes.statusCode).toBe(200);
    expect(meRes.json().email).toBe("me@test.com");
  });
});
