import IORedis from "ioredis";
import { env } from "../config/env.js";

export const redis = new IORedis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: 2,
});

export const redisConnectionOpts = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
} as const;

export async function redisPing(): Promise<boolean> {
  try {
    const res = await redis.ping();
    return res === "PONG";
  } catch {
    return false;
  }
}
