import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { env } from "./config/env.js";
import { registerCore } from "./plugins/core.js";
import { authRoutes } from "./routes/authRoutes.js";
import { productsRoutes } from "./routes/productsRoutes.js";
import { eventsRoutes } from "./routes/eventsRoutes.js";
import { purchasesRoutes } from "./routes/purchasesRoutes.js";
import { analyticsRoutes } from "./routes/analyticsRoutes.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  const allowedOrigins = env.CORS_ORIGINS
    ? env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
    : [];

  app.register(cors, {
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
  });

  app.register(jwt, { secret: env.JWT_SECRET });

  app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS
  });

  app.get("/health", async () => ({ status: "ok" }));

  app.register(registerCore);

  app.register(authRoutes);
  app.register(productsRoutes);
  app.register(eventsRoutes);
  app.register(purchasesRoutes);
  app.register(analyticsRoutes);

  return app;
}
