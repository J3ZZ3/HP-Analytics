import type { FastifyInstance } from "fastify";
import * as service from "../services/eventService.js";

const EVENT_TYPES = ["view", "click", "add_to_cart", "remove_from_cart", "checkout_start", "search"] as const;

export async function eventsRoutes(app: FastifyInstance) {
  app.post(
    "/events",
    {
      preHandler: [app.optionalAuth],
      schema: {
        body: {
          type: "object",
          required: ["product_id", "type"],
          properties: {
            product_id: { type: "string", format: "uuid" },
            type: { type: "string", enum: [...EVENT_TYPES] },
            session_id: { type: "string" },
            ts: { type: "string" },
            meta: { type: "object", additionalProperties: true },
          },
        },
      },
    },
    async (req, reply) => {
      const body = req.body as any;
      const userId = (req as any).user?.sub as string | undefined;
      const sessionId = body.session_id || null;

      if (!userId && !sessionId) {
        return reply.code(400).send({
          error: "BAD_REQUEST",
          message: "Either a valid JWT or session_id is required",
        });
      }

      const id = await service.ingestEvent({
        userId: userId || null,
        sessionId,
        productId: body.product_id,
        type: body.type,
        ts: body.ts,
        meta: body.meta,
      });
      return reply.code(202).send({ accepted: true, id });
    },
  );

  app.post(
    "/events/bulk",
    {
      preHandler: [app.optionalAuth],
      schema: {
        body: {
          type: "object",
          required: ["events"],
          properties: {
            session_id: { type: "string" },
            events: {
              type: "array",
              minItems: 1,
              maxItems: 2000,
              items: {
                type: "object",
                required: ["product_id", "type"],
                properties: {
                  product_id: { type: "string", format: "uuid" },
                  type: { type: "string", enum: [...EVENT_TYPES] },
                  ts: { type: "string" },
                  meta: { type: "object", additionalProperties: true },
                },
              },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const body = req.body as any;
      const userId = (req as any).user?.sub as string | undefined;
      const sessionId = body.session_id || null;

      if (!userId && !sessionId) {
        return reply.code(400).send({
          error: "BAD_REQUEST",
          message: "Either a valid JWT or session_id is required",
        });
      }

      const inserted = await service.ingestEventsBulk({
        userId: userId || null,
        sessionId,
        events: body.events.map((e: any) => ({
          productId: e.product_id,
          type: e.type,
          ts: e.ts,
          meta: e.meta,
        })),
      });
      return reply.code(202).send({ accepted: true, received: body.events.length, enqueued: inserted });
    },
  );

  app.post(
    "/events/link-session",
    {
      preHandler: [app.authenticate],
      schema: {
        body: {
          type: "object",
          required: ["session_id"],
          properties: {
            session_id: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (req, reply) => {
      const { session_id } = req.body as any;
      const userId = (req as any).user?.sub as string;
      const linked = await service.linkSession(session_id, userId);
      return reply.send({ linked });
    },
  );
}
