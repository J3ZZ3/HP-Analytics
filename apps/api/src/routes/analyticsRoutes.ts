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
            limit: { type: "integer", minimum: 1, maximum: 50, default: 10 },
            sort_by: { type: "string", enum: ["views", "clicks", "add_to_carts", "checkout_starts", "purchases", "revenue"], default: "views" },
          }
        }
      }
    },
    async (req) => {
      const q = req.query as any;
      return svc.getTopProducts(q.days ?? 7, q.limit ?? 10, q.sort_by ?? "views");
    }
  );

  app.get(
    "/analytics/products/stats",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            days: { type: "integer", minimum: 1, maximum: 90, default: 30 },
            sort_by: { type: "string", enum: ["views", "clicks", "add_to_carts", "checkout_starts", "purchases", "revenue"], default: "views" },
            sort_dir: { type: "string", enum: ["asc", "desc"], default: "desc" },
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
            search: { type: "string" },
          }
        }
      }
    },
    async (req) => {
      const q = req.query as any;
      return svc.getProductStats(
        q.days ?? 30,
        q.sort_by ?? "views",
        q.sort_dir ?? "desc",
        q.page ?? 1,
        q.limit ?? 20,
        q.search || undefined,
      );
    }
  );

  app.get(
    "/analytics/overview",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            days: { type: "integer", minimum: 1, maximum: 90, default: 7 }
          }
        }
      }
    },
    async (req) => {
      const q = req.query as any;
      return svc.getOverview(q.days ?? 7);
    }
  );

  app.get(
    "/analytics/timeseries",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            days: { type: "integer", minimum: 1, maximum: 90, default: 30 }
          }
        }
      }
    },
    async (req) => {
      const q = req.query as any;
      return svc.getOverallTimeseries(q.days ?? 30);
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
