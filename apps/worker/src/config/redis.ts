import IORedis from "ioredis";
import { env } from "./env.js";

export const redis = new IORedis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: null,
});

export const redisConnectionOpts = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: null,
} as const;
