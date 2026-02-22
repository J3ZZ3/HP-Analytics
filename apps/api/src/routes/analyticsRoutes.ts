import type { FastifyInstance } from "fastify";
import * as svc from "../services/analyticsService.js";

export async function analyticsRoutes(app: FastifyInstance) {
  app.get(
    "/analytics/products/top",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            days: { type: "integer", minimum: 1, maximum: 90, default: 7 },
            limit: { type: "integer", minimum: 1, maximum: 50, default: 10 }
          }
        }
      }
    },
    async (req) => {
      const q = req.query as any;
      return svc.getTopProducts(q.days ?? 7, q.limit ?? 10);
    }
  );

  app.get(
    "/analytics/products/:id/timeseries",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", format: "uuid" } }
        },
        querystring: {
          type: "object",
          properties: { days: { type: "integer", minimum: 1, maximum: 365, default: 30 } }
        }
      }
    },
    async (req) => {
      const { id } = req.params as any;
      const q = req.query as any;
      return svc.getProductTimeseries(id, q.days ?? 30);
    }
  );

  app.get(
    "/analytics/users/me/summary",
    {
      preHandler: [app.authenticate],
      schema: {
        querystring: {
          type: "object",
          properties: { days: { type: "integer", minimum: 1, maximum: 365, default: 30 } }
        }
      }
    },
    async (req) => {
      const q = req.query as any;
      const userId = (req as any).user?.sub as string;
      return svc.getUserSummary(userId, q.days ?? 30);
    }
  );
}
