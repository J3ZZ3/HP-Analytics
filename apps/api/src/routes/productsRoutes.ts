import type { FastifyInstance } from "fastify";
import * as service from "../services/productService.js";
import { requireRole } from "../middleware/rbac.js";
import { cacheGetJson, cacheSetJson } from "../cache/cache.js";

export async function productsRoutes(app: FastifyInstance) {
  app.get(
    "/products",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["active","inactive"] },
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 20 }
          }
        }
      }
    },
    async (req) => {
      const q = req.query as any;
      return service.listProducts({ status: q.status, page: q.page ?? 1, limit: q.limit ?? 20 });
    }
  );

  app.post(
    "/products",
    {
      preHandler: [app.authenticate],
      schema: {
        body: {
          type: "object",
          required: ["name","price"],
          properties: {
            name: { type: "string", minLength: 1 },
            price: { type: "number", minimum: 0 },
            status: { type: "string", enum: ["active","inactive"], default: "active" }
          }
        }
      }
    },
    async (req, reply) => {
      requireRole(req, "admin");
      const body = req.body as any;
      const created = await service.createProduct({ name: body.name, price: body.price, status: body.status ?? "active" });
      return reply.code(201).send(created);
    }
  );

  app.get(
    "/products/:id",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", format: "uuid" } }
        }
      }
    },
    async (req) => {
      const { id } = req.params as any;
      const key = `product:${id}`;
      const cached = await cacheGetJson<any>(key);
      if (cached) return cached;

      const prod = await service.getProduct(id);
      await cacheSetJson(key, prod, 120);
      return prod;
    }
  );

  app.patch(
    "/products/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", format: "uuid" } }
        },
        body: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 1 },
            price: { type: "number", minimum: 0 },
            status: { type: "string", enum: ["active","inactive"] }
          }
        }
      }
    },
    async (req) => {
      requireRole(req, "admin");
      const { id } = req.params as any;
      const body = req.body as any;
      return service.updateProduct(id, body);
    }
  );

  app.delete(
    "/products/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", format: "uuid" } }
        }
      }
    },
    async (req, reply) => {
      requireRole(req, "admin");
      const { id } = req.params as any;
      await service.deleteProduct(id);
      return reply.code(204).send();
    }
  );
}
