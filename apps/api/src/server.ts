import { buildApp } from "./app.js";
import { env } from "./config/env.js";

console.log("[boot] ENV:", JSON.stringify({
  REDIS_URL: !!process.env.REDIS_URL,
  DATABASE_URL: !!process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT ?? "(unset)",
  envCount: Object.keys(process.env).length,
}));

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
