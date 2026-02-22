import IORedis from "ioredis";
import { env } from "./env.js";

function parseRedisOpts() {
  if (env.REDIS_URL) {
    const parsed = new URL(env.REDIS_URL);
    return {
      host: parsed.hostname,
      port: Number(parsed.port) || 6379,
      ...(parsed.password ? { password: decodeURIComponent(parsed.password) } : {}),
      ...(parsed.username && parsed.username !== "default" ? { username: parsed.username } : {}),
    };
  }
  return { host: env.REDIS_HOST, port: env.REDIS_PORT };
}

const opts = parseRedisOpts();

export const redis = new IORedis({ ...opts, maxRetriesPerRequest: null });

export const redisConnectionOpts = { ...opts, maxRetriesPerRequest: null as null };
