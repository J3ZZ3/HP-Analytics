import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { hashPassword } from "../src/utils/auth.js";

const mockQuery = vi.fn();
vi.mock("../src/config/db.js", () => ({
  pgPool: { query: (...args: unknown[]) => mockQuery(...args) },
  dbPing: vi.fn().mockResolvedValue(true),
}));

vi.mock("../src/config/redis.js", async () => {
  const store = new Map<string, string>();
  return {
    redis: {
      get: vi.fn((k: string) => Promise.resolve(store.get(k) ?? null)),
      set: vi.fn((k: string, v: string) => { store.set(k, v); return Promise.resolve("OK"); }),
      del: vi.fn((...keys: string[]) => { keys.forEach(k => store.delete(k)); return Promise.resolve(keys.length); }),
      ping: vi.fn().mockResolvedValue("PONG"),
      on: vi.fn().mockReturnThis(),
      status: "ready",
      options: {},
      disconnect: vi.fn(),
      quit: vi.fn(),
      duplicate: vi.fn(),
    },
    redisConnectionOpts: { host: "localhost", port: 6379 },
    redisPing: vi.fn().mockResolvedValue(true),
  };
});

import { buildApp } from "../src/app.js";
import type { FastifyInstance } from "fastify";

const fakeProduct = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Widget",
  price: "9.99",
  status: "active",
  created_at: "2025-01-01T00:00:00Z",
};

async function getAdminToken(app: FastifyInstance): Promise<string> {
  const hash = await hashPassword("adminpass1");
  mockQuery.mockResolvedValueOnce({
    rowCount: 1,
    rows: [{ id: "admin-1", email: "admin@test.com", password_hash: hash, role: "admin", created_at: "2025-01-01T00:00:00Z" }],
  });
  const res = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: "admin@test.com", password: "adminpass1" },
  });
  return res.json().token;
}

async function getUserToken(app: FastifyInstance): Promise<string> {
  const hash = await hashPassword("userpass12");
  mockQuery.mockResolvedValueOnce({
    rowCount: 1,
    rows: [{ id: "user-1", email: "user@test.com", password_hash: hash, role: "user", created_at: "2025-01-01T00:00:00Z" }],
  });
  const res = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: "user@test.com", password: "userpass12" },
  });
  return res.json().token;
}

describe("products E2E", () => {
  let app: FastifyInstance;

  beforeEach(() => {
    mockQuery.mockReset();
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it("GET /products returns paginated list", async () => {
    app = buildApp();
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: "1" }] })
      .mockResolvedValueOnce({ rows: [fakeProduct] });

    const res = await app.inject({ method: "GET", url: "/products" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("page", 1);
    expect(body).toHaveProperty("limit", 20);
    expect(body).toHaveProperty("total", 1);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].price).toBe(9.99);
  });

  it("GET /products?status=active filters by status", async () => {
    app = buildApp();
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: "1" }] })
      .mockResolvedValueOnce({ rows: [fakeProduct] });

    const res = await app.inject({ method: "GET", url: "/products?status=active" });
    expect(res.statusCode).toBe(200);
    expect(mockQuery.mock.calls[0][1]).toContain("active");
  });

  it("POST /products requires admin role", async () => {
    app = buildApp();
    const userToken = await getUserToken(app);
    const res = await app.inject({
      method: "POST",
      url: "/products",
      headers: { authorization: `Bearer ${userToken}` },
      payload: { name: "New", price: 5.99 },
    });
    expect(res.statusCode).toBe(403);
  });

  it("POST /products creates product as admin", async () => {
    app = buildApp();
    const adminToken = await getAdminToken(app);
    mockQuery.mockResolvedValueOnce({ rows: [fakeProduct] });

    const res = await app.inject({
      method: "POST",
      url: "/products",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: "Widget", price: 9.99 },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().name).toBe("Widget");
  });

  it("POST /products returns 401 without auth", async () => {
    app = buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/products",
      payload: { name: "New", price: 5.99 },
    });
    expect(res.statusCode).toBe(401);
  });

  it("GET /products/:id returns product", async () => {
    app = buildApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [fakeProduct] });

    const res = await app.inject({
      method: "GET",
      url: `/products/${fakeProduct.id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(fakeProduct.id);
    expect(res.json().price).toBe(9.99);
  });

  it("GET /products/:id returns 404 for missing product", async () => {
    app = buildApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await app.inject({
      method: "GET",
      url: "/products/22222222-2222-2222-2222-222222222222",
    });
    expect(res.statusCode).toBe(404);
  });

  it("PATCH /products/:id updates product as admin", async () => {
    app = buildApp();
    const adminToken = await getAdminToken(app);
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ ...fakeProduct, name: "Updated Widget" }],
    });

    const res = await app.inject({
      method: "PATCH",
      url: `/products/${fakeProduct.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: "Updated Widget" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe("Updated Widget");
  });

  it("PATCH /products/:id returns 403 for non-admin", async () => {
    app = buildApp();
    const userToken = await getUserToken(app);
    const res = await app.inject({
      method: "PATCH",
      url: `/products/${fakeProduct.id}`,
      headers: { authorization: `Bearer ${userToken}` },
      payload: { name: "Hacked" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("DELETE /products/:id returns 204 as admin", async () => {
    app = buildApp();
    const adminToken = await getAdminToken(app);
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await app.inject({
      method: "DELETE",
      url: `/products/${fakeProduct.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(204);
  });

  it("DELETE /products/:id returns 404 when missing", async () => {
    app = buildApp();
    const adminToken = await getAdminToken(app);
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const res = await app.inject({
      method: "DELETE",
      url: "/products/22222222-2222-2222-2222-222222222222",
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(404);
  });
});
