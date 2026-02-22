import { buildApp } from "./app.js";
import { env } from "./config/env.js";

console.log("[boot] REDIS_URL set:", !!process.env.REDIS_URL, "| REDIS_HOST:", process.env.REDIS_HOST ?? "(unset)", "| REDIS_PORT:", process.env.REDIS_PORT ?? "(unset)");

const app = buildApp();

app.listen({ port: env.PORT, host: "0.0.0.0" })
  .then(() => app.log.info({ port: env.PORT }, "API listening"))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });

// Graceful shutdown
const shutdown = async () => {
  try {
    await app.close();
  } finally {
    process.exit(0);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
