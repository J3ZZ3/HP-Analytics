import { Queue } from "bullmq";
import { redisConnectionOpts } from "../config/redis.js";

export const analyticsQueue = new Queue("analytics", {
  connection: redisConnectionOpts,
});
