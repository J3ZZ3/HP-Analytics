import { redis } from "../config/redis.js";

export async function cacheGetJson<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export async function cacheSetJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

export async function cacheDel(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await redis.del(...keys);
}
