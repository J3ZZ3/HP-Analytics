import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQuery = vi.fn();
vi.mock("../src/config/db.js", () => ({
  pgPool: { query: (...args: unknown[]) => mockQuery(...args) },
}));

const mockKeys = vi.fn();
const mockDel = vi.fn();
vi.mock("../src/config/redis.js", () => ({
  redis: {
    keys: (...args: unknown[]) => mockKeys(...args),
    del: (...args: unknown[]) => mockDel(...args),
    on: vi.fn().mockReturnThis(),
    status: "ready",
    options: {},
    disconnect: vi.fn(),
    quit: vi.fn(),
  },
  redisConnectionOpts: { host: "localhost", port: 6379 },
}));

import { aggregateToday } from "../src/processors/aggregateToday.js";

describe("aggregateToday", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockKeys.mockReset();
    mockDel.mockReset();
  });

  it("runs product and user upsert queries", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    mockKeys.mockResolvedValue([]);

    await aggregateToday();

    expect(mockQuery).toHaveBeenCalledTimes(2);
    const sql1 = mockQuery.mock.calls[0][0] as string;
    const sql2 = mockQuery.mock.calls[1][0] as string;
    expect(sql1).toContain("product_daily_stats");
    expect(sql1).toContain("on conflict (product_id, day)");
    expect(sql2).toContain("user_daily_stats");
    expect(sql2).toContain("on conflict (user_id, day)");
  });

  it("invalidates top_products and user_summary cache keys", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    mockKeys
      .mockResolvedValueOnce(["top_products:7:10", "top_products:30:10"])
      .mockResolvedValueOnce(["user_summary:u1:7"]);
    mockDel.mockResolvedValue(1);

    await aggregateToday();

    expect(mockKeys).toHaveBeenCalledWith("top_products:*");
    expect(mockKeys).toHaveBeenCalledWith("user_summary:*");
    expect(mockDel).toHaveBeenCalledWith("top_products:7:10", "top_products:30:10");
    expect(mockDel).toHaveBeenCalledWith("user_summary:u1:7");
  });

  it("does not call del when no cache keys match", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    mockKeys.mockResolvedValue([]);

    await aggregateToday();

    expect(mockDel).not.toHaveBeenCalled();
  });
});
