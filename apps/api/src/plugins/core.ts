import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import { ApiError, isApiError } from "../utils/errors.js";
import { env } from "../config/env.js";
import { dbPing } from "../config/db.js";
import { redisPing } from "../config/redis.js";
import fs from "node:fs";
import path from "node:path";

export const registerCore = fp(async function registerCore(app: FastifyInstance) {
  // Decorator for auth
  app.decorate("authenticate", async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: "UNAUTHORIZED", message: "Invalid or missing token" });
    }
  });

  // Swagger / OpenAPI docs (Fastify-generated for routes) + serve static openapi.yaml file for reference
  await app.register(swagger, {
    openapi: {
      info: { title: "HP Analytics API", version: "1.0.0" },
    }
  });

  await app.register(swaggerUI, { routePrefix: "/docs" });

  // Readiness
  app.get("/ready", { logLevel: "warn" }, async (req, reply) => {
    const [dbOk, redisOk] = await Promise.all([dbPing(), redisPing()]);
    if (!dbOk || !redisOk) return reply.code(503).send({ ready: false, db: dbOk, redis: redisOk });
    return { ready: true, db: dbOk, redis: redisOk };
  });

  // Simple metrics (extend later)
  app.get("/metrics", async () => {
    return {
      uptime_seconds: process.uptime(),
      node_env: env.NODE_ENV,
      timestamp: new Date().toISOString()
    };
  });

  // Serve the repository OpenAPI file
  app.get("/openapi.yaml", { schema: { hide: true } }, async (req, reply) => {
    const filePath = path.resolve("/app/openapi.yaml");
    if (!fs.existsSync(filePath)) {
      return reply.code(404).send("openapi.yaml not found in container");
    }
    reply.header("content-type", "application/yaml");
    return reply.send(fs.readFileSync(filePath, "utf-8"));
  });

  // Global error handler
  app.setErrorHandler((err: any, req, reply) => {
    if (isApiError(err)) {
      return reply.code(err.statusCode).send({ error: err.code, message: err.message, details: err.details });
    }

    if ((err as any).validation || (err as any).code === "FST_ERR_VALIDATION") {
      const details = (err as any).validation ?? (err as any).validationContext ?? err.message;
      return reply.code(400).send({ error: "BAD_REQUEST", message: "Validation failed", details });
    }

    req.log.error({ err }, "Unhandled error");
    return reply.code(500).send({ error: "INTERNAL", message: "Internal server error" });
  });
});

declare module "fastify" {
  interface FastifyInstance {
    authenticate: any;
  }
}
