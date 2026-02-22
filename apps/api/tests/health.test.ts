import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "../src/app.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;

afterEach(async () => {
  if (app) await app.close();
});

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    app = buildApp();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });
});

describe("GET /metrics", () => {
  it("returns uptime, node_env, and timestamp", async () => {
    app = buildApp();
    const res = await app.inject({ method: "GET", url: "/metrics" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("uptime_seconds");
    expect(typeof body.uptime_seconds).toBe("number");
    expect(body).toHaveProperty("node_env");
    expect(body).toHaveProperty("timestamp");
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });
});

describe("GET /ready", () => {
  it("returns 200 when DB and Redis are reachable", async () => {
    const dbMod = await import("../src/config/db.js");
    const redisMod = await import("../src/config/redis.js");
    vi.spyOn(dbMod, "dbPing").mockResolvedValue(true);
    vi.spyOn(redisMod, "redisPing").mockResolvedValue(true);

    app = buildApp();
    const res = await app.inject({ method: "GET", url: "/ready" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ready: true, db: true, redis: true });

    vi.restoreAllMocks();
  });

  it("returns 503 when DB is down", async () => {
    const dbMod = await import("../src/config/db.js");
    const redisMod = await import("../src/config/redis.js");
    vi.spyOn(dbMod, "dbPing").mockResolvedValue(false);
    vi.spyOn(redisMod, "redisPing").mockResolvedValue(true);

    app = buildApp();
    const res = await app.inject({ method: "GET", url: "/ready" });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ ready: false, db: false, redis: true });

    vi.restoreAllMocks();
  });

  it("returns 503 when Redis is down", async () => {
    const dbMod = await import("../src/config/db.js");
    const redisMod = await import("../src/config/redis.js");
    vi.spyOn(dbMod, "dbPing").mockResolvedValue(true);
    vi.spyOn(redisMod, "redisPing").mockResolvedValue(false);

    app = buildApp();
    const res = await app.inject({ method: "GET", url: "/ready" });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ ready: false, db: true, redis: false });

    vi.restoreAllMocks();
  });
});

describe("error handler", () => {
  it("returns structured 400 for validation errors", async () => {
    app = buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "not-an-email", password: "short" },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body).toHaveProperty("error", "BAD_REQUEST");
    expect(body).toHaveProperty("message");
    expect(body).toHaveProperty("details");
  });

  it("returns 404 for unknown routes", async () => {
    app = buildApp();
    const res = await app.inject({ method: "GET", url: "/nonexistent" });
    expect(res.statusCode).toBe(404);
  });
});
