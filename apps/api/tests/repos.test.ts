import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQuery = vi.fn();
vi.mock("../src/config/db.js", () => ({
  pgPool: { query: (...args: unknown[]) => mockQuery(...args) },
  dbPing: vi.fn().mockResolvedValue(true),
}));

import * as userRepo from "../src/repositories/userRepo.js";
import * as productRepo from "../src/repositories/productRepo.js";
import * as eventRepo from "../src/repositories/eventRepo.js";
import * as purchaseRepo from "../src/repositories/purchaseRepo.js";
import * as analyticsRepo from "../src/repositories/analyticsRepo.js";

beforeEach(() => {
  mockQuery.mockReset();
});

describe("userRepo", () => {
  const fakeUser = {
    id: "u1",
    email: "a@b.com",
    password_hash: "hash",
    role: "user" as const,
    created_at: "2025-01-01T00:00:00Z",
  };

  it("findUserByEmail returns user when found", async () => {
    mockQuery.mockResolvedValue({ rowCount: 1, rows: [fakeUser] });
    const user = await userRepo.findUserByEmail("a@b.com");
    expect(user).toEqual(fakeUser);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("from users where email"),
      ["a@b.com"]
    );
  });

  it("findUserByEmail returns null when not found", async () => {
    mockQuery.mockResolvedValue({ rowCount: 0, rows: [] });
    const user = await userRepo.findUserByEmail("no@one.com");
    expect(user).toBeNull();
  });

  it("createUser inserts and returns user", async () => {
    mockQuery.mockResolvedValue({ rows: [fakeUser] });
    const user = await userRepo.createUser("a@b.com", "hash", "user");
    expect(user).toEqual(fakeUser);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("insert into users"),
      ["a@b.com", "hash", "user"]
    );
  });

  it("findUserById returns user without password_hash", async () => {
    const { password_hash: _, ...publicUser } = fakeUser;
    mockQuery.mockResolvedValue({ rowCount: 1, rows: [publicUser] });
    const user = await userRepo.findUserById("u1");
    expect(user).toEqual(publicUser);
  });
});

describe("productRepo", () => {
  const fakeProduct = {
    id: "p1",
    name: "Widget",
    price: "9.99",
    status: "active" as const,
    created_at: "2025-01-01T00:00:00Z",
  };

  it("listProducts returns total and items", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: "5" }] })
      .mockResolvedValueOnce({ rows: [fakeProduct] });
    const result = await productRepo.listProducts({ limit: 20, offset: 0 });
    expect(result.total).toBe(5);
    expect(result.items).toEqual([fakeProduct]);
  });

  it("listProducts filters by status", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: "2" }] })
      .mockResolvedValueOnce({ rows: [fakeProduct] });
    await productRepo.listProducts({ status: "active", limit: 10, offset: 0 });
    expect(mockQuery.mock.calls[0][1]).toContain("active");
  });

  it("getProductById returns product", async () => {
    mockQuery.mockResolvedValue({ rowCount: 1, rows: [fakeProduct] });
    const p = await productRepo.getProductById("p1");
    expect(p).toEqual(fakeProduct);
  });

  it("getProductById returns null when missing", async () => {
    mockQuery.mockResolvedValue({ rowCount: 0, rows: [] });
    const p = await productRepo.getProductById("missing");
    expect(p).toBeNull();
  });

  it("createProduct inserts and returns", async () => {
    mockQuery.mockResolvedValue({ rows: [fakeProduct] });
    const p = await productRepo.createProduct({ name: "Widget", price: 9.99, status: "active" });
    expect(p).toEqual(fakeProduct);
  });

  it("updateProduct builds dynamic SET clause", async () => {
    mockQuery.mockResolvedValue({ rowCount: 1, rows: [{ ...fakeProduct, name: "Updated" }] });
    const p = await productRepo.updateProduct("p1", { name: "Updated" });
    expect(p?.name).toBe("Updated");
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("update products set"),
      ["Updated", "p1"]
    );
  });

  it("deleteProduct returns true when row deleted", async () => {
    mockQuery.mockResolvedValue({ rowCount: 1 });
    expect(await productRepo.deleteProduct("p1")).toBe(true);
  });

  it("deleteProduct returns false when no rows", async () => {
    mockQuery.mockResolvedValue({ rowCount: 0 });
    expect(await productRepo.deleteProduct("missing")).toBe(false);
  });
});

describe("eventRepo", () => {
  it("insertEvent returns the new event id", async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: "e1" }] });
    const id = await eventRepo.insertEvent({
      userId: "u1",
      productId: "p1",
      type: "view",
    });
    expect(id).toBe("e1");
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("insert into events"),
      expect.arrayContaining(["u1", "p1", "view"])
    );
  });

  it("insertEventsBulk returns count", async () => {
    mockQuery.mockResolvedValue({ rowCount: 2 });
    const count = await eventRepo.insertEventsBulk([
      { userId: "u1", productId: "p1", type: "view" },
      { userId: "u1", productId: "p2", type: "click" },
    ]);
    expect(count).toBe(2);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("unnest"),
      expect.any(Array)
    );
  });

  it("insertEventsBulk returns 0 for empty array", async () => {
    const count = await eventRepo.insertEventsBulk([]);
    expect(count).toBe(0);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

describe("purchaseRepo", () => {
  it("createPurchase inserts and returns", async () => {
    const fakePurchase = {
      id: "pu1",
      user_id: "u1",
      product_id: "p1",
      qty: 2,
      amount: "19.98",
      ts: "2025-01-01T00:00:00Z",
    };
    mockQuery.mockResolvedValue({ rows: [fakePurchase] });
    const p = await purchaseRepo.createPurchase({
      userId: "u1",
      productId: "p1",
      qty: 2,
      amount: 19.98,
    });
    expect(p).toEqual(fakePurchase);
  });
});

describe("analyticsRepo", () => {
  it("topProducts aggregates from product_daily_stats", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        { product_id: "p1", views: 100, purchases: 10, revenue: "999.00" },
      ],
    });
    const result = await analyticsRepo.topProducts(7, 10);
    expect(result).toEqual([
      { product_id: "p1", views: 100, purchases: 10, revenue: 999 },
    ]);
  });

  it("productTimeseries returns daily points", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        { day: "2025-01-01", views: 50, purchases: 5, revenue: "499.50" },
      ],
    });
    const result = await analyticsRepo.productTimeseries("p1", 30);
    expect(result).toEqual([
      { day: "2025-01-01", views: 50, purchases: 5, revenue: 499.5 },
    ]);
  });

  it("userSummary returns aggregated user stats", async () => {
    mockQuery.mockResolvedValue({
      rows: [{ views: 200, purchases: 20, spend: "1500.00" }],
    });
    const result = await analyticsRepo.userSummary("u1", 30);
    expect(result).toEqual({ views: 200, purchases: 20, spend: 1500 });
  });

  it("userSummary returns zeros when no data", async () => {
    mockQuery.mockResolvedValue({ rows: [{ views: null, purchases: null, spend: null }] });
    const result = await analyticsRepo.userSummary("u1", 30);
    expect(result).toEqual({ views: 0, purchases: 0, spend: 0 });
  });
});
