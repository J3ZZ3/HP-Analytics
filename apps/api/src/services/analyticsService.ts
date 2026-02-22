import { cacheGetJson, cacheSetJson } from "../cache/cache.js";
import * as repo from "../repositories/analyticsRepo.js";

export async function getTopProducts(days: number, limit: number) {
  const key = `top_products:${days}:${limit}`;
  const cached = await cacheGetJson<any>(key);
  if (cached) return cached;

  const items = await repo.topProducts(days, limit);
  const payload = { days, limit, items };
  await cacheSetJson(key, payload, 60);
  return payload;
}

export async function getProductTimeseries(productId: string, days: number) {
  const points = await repo.productTimeseries(productId, days);
  return { product_id: productId, days, points };
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
