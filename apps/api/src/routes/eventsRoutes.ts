import type { FastifyInstance } from "fastify";
import * as service from "../services/eventService.js";

export async function eventsRoutes(app: FastifyInstance) {
  app.post(
    "/events",
    {
      preHandler: [app.authenticate],
      schema: {
        body: {
          type: "object",
          required: ["product_id","type"],
          properties: {
            product_id: { type: "string", format: "uuid" },
            type: { type: "string", enum: ["view","click"] },
            ts: { type: "string" },
            meta: { type: "object", additionalProperties: true }
          }
        }
      }
    },
    async (req, reply) => {
      const body = req.body as any;
      const userId = (req as any).user?.sub as string;
      const id = await service.ingestEvent({ userId, productId: body.product_id, type: body.type, ts: body.ts, meta: body.meta });
      return reply.code(202).send({ accepted: true, id });
    }
  );

  app.post(
    "/events/bulk",
    {
      preHandler: [app.authenticate],
      schema: {
        body: {
          type: "object",
          required: ["events"],
          properties: {
            events: {
              type: "array",
              minItems: 1,
              maxItems: 2000,
              items: {
                type: "object",
                required: ["product_id","type"],
                properties: {
                  product_id: { type: "string", format: "uuid" },
                  type: { type: "string", enum: ["view","click"] },
                  ts: { type: "string" },
                  meta: { type: "object", additionalProperties: true }
                }
              }
            }
          }
        }
      }
    },
    async (req, reply) => {
      const body = req.body as any;
      const userId = (req as any).user?.sub as string;
      const inserted = await service.ingestEventsBulk({
        userId,
        events: body.events.map((e: any) => ({ productId: e.product_id, type: e.type, ts: e.ts, meta: e.meta })),
      });
      return reply.code(202).send({ accepted: true, received: body.events.length, enqueued: inserted });
    }
  );
}
