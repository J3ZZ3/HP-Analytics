import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { hashPassword } from "../src/utils/auth.js";

const mockQuery = vi.fn();
vi.mock("../src/config/db.js", () => ({
  pgPool: { query: (...args: unknown[]) => mockQuery(...args) },
  dbPing: vi.fn().mockResolvedValue(true),
}));

const cacheStore = new Map<string, string>();
vi.mock("../src/config/redis.js", () => ({
  redis: {
    get: vi.fn((k: string) => Promise.resolve(cacheStore.get(k) ?? null)),
    set: vi.fn((k: string, v: string) => { cacheStore.set(k, v); return Promise.resolve("OK"); }),
    del: vi.fn((...keys: string[]) => { keys.forEach(k => cacheStore.delete(k)); return Promise.resolve(keys.length); }),
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
}));

vi.mock("../src/queue/analyticsQueue.js", () => ({
  analyticsQueue: { add: vi.fn().mockResolvedValue({}) },
}));

import { buildApp } from "../src/app.js";
import type { FastifyInstance } from "fastify";

const PRODUCT_ID = "11111111-1111-1111-1111-111111111111";

async function getUserToken(app: FastifyInstance): Promise<string> {
  const hash = await hashPassword("userpass12");
  mockQuery.mockResolvedValueOnce({
    rowCount: 1,
    rows: [{ id: "u1", email: "user@test.com", password_hash: hash, role: "user", created_at: "2025-01-01T00:00:00Z" }],
  });
  const res = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: "user@test.com", password: "userpass12" },
  });
  return res.json().token;
}

describe("analytics E2E", () => {
  let app: FastifyInstance;

  beforeEach(() => {
    mockQuery.mockReset();
    cacheStore.clear();
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it("GET /analytics/products/top returns top products", async () => {
    app = buildApp();
    mockQuery.mockResolvedValueOnce({
      rows: [
        { product_id: PRODUCT_ID, views: 100, purchases: 10, revenue: "999.00" },
        { product_id: "22222222-2222-2222-2222-222222222222", views: 50, purchases: 5, revenue: "250.00" },
      ],
    });

    const res = await app.inject({
      method: "GET",
      url: "/analytics/products/top?days=7&limit=10",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.days).toBe(7);
    expect(body.limit).toBe(10);
    expect(body.items).toHaveLength(2);
    expect(body.items[0]).toEqual({
      product_id: PRODUCT_ID,
      views: 100,
      purchases: 10,
      revenue: 999,
    });
  });

  it("GET /analytics/products/:id/timeseries returns daily points", async () => {
    app = buildApp();
    mockQuery.mockResolvedValueOnce({
      rows: [
        { day: "2025-01-01", views: 30, purchases: 3, revenue: "150.00" },
        { day: "2025-01-02", views: 20, purchases: 2, revenue: "100.00" },
      ],
    });

    const res = await app.inject({
      method: "GET",
      url: `/analytics/products/${PRODUCT_ID}/timeseries?days=30`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.product_id).toBe(PRODUCT_ID);
    expect(body.days).toBe(30);
    expect(body.points).toHaveLength(2);
    expect(body.points[0]).toEqual({
      day: "2025-01-01",
      views: 30,
      purchases: 3,
      revenue: 150,
    });
  });

  it("GET /analytics/users/me/summary returns user summary", async () => {
    app = buildApp();
    const token = await getUserToken(app);

    mockQuery.mockResolvedValueOnce({
      rows: [{ views: 200, purchases: 20, spend: "1500.00" }],
    });

    const res = await app.inject({
      method: "GET",
      url: "/analytics/users/me/summary?days=30",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.days).toBe(30);
    expect(body.views).toBe(200);
    expect(body.purchases).toBe(20);
    expect(body.spend).toBe(1500);
  });

  it("GET /analytics/users/me/summary returns 401 without auth", async () => {
    app = buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/analytics/users/me/summary",
    });
    expect(res.statusCode).toBe(401);
  });
});

describe("purchase amount uses real product price", () => {
  let app: FastifyInstance;

  beforeEach(() => {
    mockQuery.mockReset();
    cacheStore.clear();
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it("POST /purchases calculates amount from product price * qty", async () => {
    app = buildApp();
    const token = await getUserToken(app);

    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: PRODUCT_ID, name: "Widget", price: "25.50", status: "active", created_at: "2025-01-01T00:00:00Z" }],
    });

    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: "pu-1",
        user_id: "u1",
        product_id: PRODUCT_ID,
        qty: 3,
        amount: "76.50",
        ts: "2025-01-01T00:00:00Z",
      }],
    });

    const res = await app.inject({
      method: "POST",
      url: "/purchases",
      headers: { authorization: `Bearer ${token}` },
      payload: { product_id: PRODUCT_ID, qty: 3 },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().amount).toBe(76.5);

    const insertCall = mockQuery.mock.calls.find(
      (c: any[]) => typeof c[0] === "string" && c[0].includes("insert into purchases")
    );
    expect(insertCall).toBeDefined();
    expect(insertCall![1]).toContain(76.5);
  });
});
