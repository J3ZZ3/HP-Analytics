import type { FastifyInstance } from "fastify";
import * as service from "../services/purchaseService.js";
import * as productService from "../services/productService.js";

export async function purchasesRoutes(app: FastifyInstance) {
  app.get(
    "/purchases/me",
    {
      preHandler: [app.authenticate],
      schema: {
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
            sort_by: { type: "string", enum: ["ts", "amount"], default: "ts" },
            sort_dir: { type: "string", enum: ["asc", "desc"], default: "desc" },
          },
        },
      },
    },
    async (req) => {
      const userId = (req as any).user?.sub as string;
      const q = req.query as any;
      return service.getUserPurchases({
        userId,
        sortBy: q.sort_by ?? "ts",
        sortDir: q.sort_dir ?? "desc",
        page: q.page ?? 1,
        limit: q.limit ?? 20,
      });
    },
  );

  app.post(
    "/purchases",
    {
      preHandler: [app.authenticate],
      schema: {
        body: {
          type: "object",
          required: ["product_id"],
          properties: {
            product_id: { type: "string", format: "uuid" },
            qty: { type: "integer", minimum: 1, default: 1 },
          },
        },
      },
    },
    async (req, reply) => {
      const body = req.body as any;
      const userId = (req as any).user?.sub as string;
      const qty = body.qty ?? 1;
      const product = await productService.getProduct(body.product_id);
      const amount = qty * product.price;
      const purchase = await service.createPurchase({ userId, productId: body.product_id, qty, amount });
      return reply.code(201).send(purchase);
    },
  );
}
