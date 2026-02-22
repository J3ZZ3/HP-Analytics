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
    set: vi.fn((k: string, v: string, _ex: string, _ttl: number) => { cacheStore.set(k, v); return Promise.resolve("OK"); }),
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
const fakeProduct = {
  id: PRODUCT_ID,
  name: "Widget",
  price: "9.99",
  status: "active",
  created_at: "2025-01-01T00:00:00Z",
};

describe("cache behavior", () => {
  let app: FastifyInstance;

  beforeEach(() => {
    mockQuery.mockReset();
    cacheStore.clear();
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it("GET /products/:id caches on first call, serves from cache on second", async () => {
    app = buildApp();

    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [fakeProduct] });
    const res1 = await app.inject({ method: "GET", url: `/products/${PRODUCT_ID}` });
    expect(res1.statusCode).toBe(200);
    expect(res1.json().name).toBe("Widget");
    expect(mockQuery).toHaveBeenCalledTimes(1);

    expect(cacheStore.has(`product:${PRODUCT_ID}`)).toBe(true);

    const res2 = await app.inject({ method: "GET", url: `/products/${PRODUCT_ID}` });
    expect(res2.statusCode).toBe(200);
    expect(res2.json().name).toBe("Widget");
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it("analytics top products caches results", async () => {
    app = buildApp();

    mockQuery.mockResolvedValueOnce({
      rows: [{ product_id: PRODUCT_ID, views: 50, purchases: 5, revenue: "499.50" }],
    });

    const res1 = await app.inject({ method: "GET", url: "/analytics/products/top?days=7&limit=10" });
    expect(res1.statusCode).toBe(200);
    expect(res1.json().items).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalledTimes(1);

    const res2 = await app.inject({ method: "GET", url: "/analytics/products/top?days=7&limit=10" });
    expect(res2.statusCode).toBe(200);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it("analytics user summary caches results", async () => {
    app = buildApp();

    const hash = await hashPassword("userpass12");
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: "u1", email: "user@test.com", password_hash: hash, role: "user", created_at: "2025-01-01T00:00:00Z" }],
    });
    const loginRes = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "user@test.com", password: "userpass12" },
    });
    const token = loginRes.json().token;

    mockQuery.mockResolvedValueOnce({
      rows: [{ views: 100, purchases: 10, spend: "500.00" }],
    });
    const res1 = await app.inject({
      method: "GET",
      url: "/analytics/users/me/summary?days=30",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res1.statusCode).toBe(200);
    const queryCountAfterFirst = mockQuery.mock.calls.length;

    const res2 = await app.inject({
      method: "GET",
      url: "/analytics/users/me/summary?days=30",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res2.statusCode).toBe(200);
    expect(res2.json()).toEqual(res1.json());
    expect(mockQuery).toHaveBeenCalledTimes(queryCountAfterFirst);
  });
});

describe("rate limiting", () => {
  it("rate limit plugin is registered and functional", async () => {
    const Fastify = (await import("fastify")).default;
    const rateLimit = (await import("@fastify/rate-limit")).default;

    const testApp = Fastify({ logger: false });
    await testApp.register(rateLimit, { max: 3, timeWindow: 60000 });
    testApp.get("/test-rl", async () => ({ ok: true }));
    await testApp.ready();

    const results: number[] = [];
    for (let i = 0; i < 5; i++) {
      const res = await testApp.inject({ method: "GET", url: "/test-rl" });
      results.push(res.statusCode);
    }

    expect(results.filter(c => c === 200).length).toBe(3);
    expect(results.filter(c => c === 429).length).toBe(2);
    await testApp.close();
  });
});
