import type { FastifyInstance } from "fastify";
import { register, login } from "../services/authService.js";
import { findUserById } from "../repositories/userRepo.js";

export async function authRoutes(app: FastifyInstance) {
  app.post(
    "/auth/register",
    {
      schema: {
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8 }
          }
        }
      }
    },
    async (req, reply) => {
      const body = req.body as any;
      const result = await register(app, body.email, body.password);
      return reply.code(201).send(result);
    }
  );

  app.post(
    "/auth/login",
    {
      schema: {
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string" }
          }
        }
      }
    },
    async (req) => {
      const body = req.body as any;
      return login(app, body.email, body.password);
    }
  );

  app.get(
    "/auth/me",
    { preHandler: [app.authenticate] },
    async (req) => {
      const userId = (req as any).user?.sub as string;
      const user = await findUserById(userId);
      return user;
    }
  );
}
