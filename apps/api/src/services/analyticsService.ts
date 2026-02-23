import { cacheGetJson, cacheSetJson } from "../cache/cache.js";
import * as repo from "../repositories/analyticsRepo.js";

export async function getTopProducts(days: number, limit: number, sortBy = "views") {
  const key = `top_products:${days}:${limit}:${sortBy}`;
  const cached = await cacheGetJson<any>(key);
  if (cached) return cached;

  const items = await repo.topProducts(days, limit, sortBy);
  const payload = { days, limit, items };
  await cacheSetJson(key, payload, 60);
  return payload;
}

export async function getProductStats(
  days: number,
  sortBy: string,
  sortDir: string,
  page: number,
  limit: number,
  search?: string,
) {
  return repo.productStats(days, sortBy, sortDir, page, limit, search);
}

export async function getProductTimeseries(productId: string, days: number) {
  const points = await repo.productTimeseries(productId, days);
  return { product_id: productId, days, points };
}

export async function getOverallTimeseries(days: number) {
  const key = `overall_ts:${days}`;
  const cached = await cacheGetJson<any>(key);
  if (cached) return cached;

  const points = await repo.overallTimeseries(days);
  const payload = { days, points };
  await cacheSetJson(key, payload, 60);
  return payload;
}

export async function getOverview(days: number) {
  const key = `overview:${days}`;
  const cached = await cacheGetJson<any>(key);
  if (cached) return cached;

  const [current, previous] = await Promise.all([
    repo.overviewStats(days),
    repo.overviewStatsPrev(days),
  ]);

  const pctChange = (cur: number, prev: number) =>
    prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);

  const payload = {
    days,
    views: current.views,
    clicks: current.clicks,
    add_to_carts: current.add_to_carts,
    checkout_starts: current.checkout_starts,
    purchases: current.purchases,
    revenue: current.revenue,
    active_products: current.active_products,
    conversion_rate: current.views > 0
      ? Math.round((current.purchases / current.views) * 10000) / 100
      : 0,
    changes: {
      views: pctChange(current.views, previous.views),
      clicks: pctChange(current.clicks, previous.clicks),
      add_to_carts: pctChange(current.add_to_carts, previous.add_to_carts),
      checkout_starts: pctChange(current.checkout_starts, previous.checkout_starts),
      purchases: pctChange(current.purchases, previous.purchases),
      revenue: pctChange(current.revenue, previous.revenue),
    },
  };
  await cacheSetJson(key, payload, 60);
  return payload;
}

export async function getUserSummary(userId: string, days: number) {
  const key = `user_summary:${userId}:${days}`;
  const cached = await cacheGetJson<any>(key);
  if (cached) return cached;

  const summary = await repo.userSummary(userId, days);
  const payload = { days, ...summary };
  await cacheSetJson(key, payload, 60);
  return payload;
}
