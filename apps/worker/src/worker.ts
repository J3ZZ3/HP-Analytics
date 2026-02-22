import { Worker } from "bullmq";
import { redisConnectionOpts } from "./config/redis.js";
import { aggregateToday } from "./processors/aggregateToday.js";

new Worker(
  "analytics",
  async (job) => {
    await aggregateToday();
    return { ok: true, name: job.name };
  },
  { connection: redisConnectionOpts }
);

console.log("[worker] listening on queue: analytics");
