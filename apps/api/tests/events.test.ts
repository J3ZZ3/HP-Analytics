import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { hashPassword } from "../src/utils/auth.js";

const mockQuery = vi.fn();
vi.mock("../src/config/db.js", () => ({
  pgPool: { query: (...args: unknown[]) => mockQuery(...args) },
  dbPing: vi.fn().mockResolvedValue(true),
}));

vi.mock("../src/config/redis.js", () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
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

const mockQueueAdd = vi.fn().mockResolvedValue({});
vi.mock("../src/queue/analyticsQueue.js", () => ({
  analyticsQueue: { add: (...args: unknown[]) => mockQueueAdd(...args) },
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

describe("events E2E", () => {
  let app: FastifyInstance;

  beforeEach(() => {
    mockQuery.mockReset();
    mockQueueAdd.mockClear();
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it("POST /events returns 202 with event id", async () => {
    app = buildApp();
    const token = await getUserToken(app);
    mockQuery.mockResolvedValueOnce({ rows: [{ id: "ev-1" }] });

    const res = await app.inject({
      method: "POST",
      url: "/events",
      headers: { authorization: `Bearer ${token}` },
      payload: { product_id: PRODUCT_ID, type: "view" },
    });

    expect(res.statusCode).toBe(202);
    const body = res.json();
    expect(body.accepted).toBe(true);
    expect(body.id).toBe("ev-1");
    expect(mockQueueAdd).toHaveBeenCalledWith("aggregate_event", expect.objectContaining({ eventId: "ev-1" }), expect.any(Object));
  });

  it("POST /events requires authentication", async () => {
    app = buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/events",
      payload: { product_id: PRODUCT_ID, type: "view" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("POST /events validates event type", async () => {
    app = buildApp();
    const token = await getUserToken(app);

    const res = await app.inject({
      method: "POST",
      url: "/events",
      headers: { authorization: `Bearer ${token}` },
      payload: { product_id: PRODUCT_ID, type: "invalid_type" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST /events/bulk returns 202 with counts", async () => {
    app = buildApp();
    const token = await getUserToken(app);
    mockQuery.mockResolvedValueOnce({ rowCount: 2 });

    const res = await app.inject({
      method: "POST",
      url: "/events/bulk",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        events: [
          { product_id: PRODUCT_ID, type: "view" },
          { product_id: PRODUCT_ID, type: "click" },
        ],
      },
    });

    expect(res.statusCode).toBe(202);
    const body = res.json();
    expect(body.accepted).toBe(true);
    expect(body.received).toBe(2);
    expect(body.enqueued).toBe(2);
    expect(mockQueueAdd).toHaveBeenCalledWith("aggregate_bulk", expect.objectContaining({ count: 2 }), expect.any(Object));
  });

  it("POST /events/bulk rejects empty events array", async () => {
    app = buildApp();
    const token = await getUserToken(app);

    const res = await app.inject({
      method: "POST",
      url: "/events/bulk",
      headers: { authorization: `Bearer ${token}` },
      payload: { events: [] },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("purchases E2E", () => {
  let app: FastifyInstance;

  beforeEach(() => {
    mockQuery.mockReset();
    mockQueueAdd.mockClear();
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it("POST /purchases creates purchase and enqueues job", async () => {
    app = buildApp();
    const token = await getUserToken(app);

    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: PRODUCT_ID, name: "Widget", price: "100.00", status: "active", created_at: "2025-01-01T00:00:00Z" }],
    });

    const fakePurchase = {
      id: "pu-1",
      user_id: "u1",
      product_id: PRODUCT_ID,
      qty: 2,
      amount: "200.00",
      ts: "2025-01-01T00:00:00Z",
    };
    mockQuery.mockResolvedValueOnce({ rows: [fakePurchase] });

    const res = await app.inject({
      method: "POST",
      url: "/purchases",
      headers: { authorization: `Bearer ${token}` },
      payload: { product_id: PRODUCT_ID, qty: 2 },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBe("pu-1");
    expect(body.amount).toBe(200);
    expect(mockQueueAdd).toHaveBeenCalledWith("aggregate_purchase", expect.objectContaining({ purchaseId: "pu-1" }), expect.any(Object));
  });

  it("POST /purchases requires authentication", async () => {
    app = buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/purchases",
      payload: { product_id: PRODUCT_ID },
    });
    expect(res.statusCode).toBe(401);
  });

  it("POST /purchases requires product_id", async () => {
    app = buildApp();
    const token = await getUserToken(app);

    const res = await app.inject({
      method: "POST",
      url: "/purchases",
      headers: { authorization: `Bearer ${token}` },
      payload: { qty: 1 },
    });
    expect(res.statusCode).toBe(400);
  });
});
