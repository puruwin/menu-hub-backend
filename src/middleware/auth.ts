import jwt from "jsonwebtoken";
import type { FastifyRequest, FastifyReply } from "fastify";
import { JWT_SECRET } from "../config/constants";

// Extender el tipo de request para incluir el usuario
declare module 'fastify' {
  interface FastifyRequest {
    user?: any;
  }
}

// Middleware para proteger rutas
export async function authGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const auth = request.headers.authorization;
    if (!auth || typeof auth !== 'string') {
      throw new Error("No auth header");
    }

    const token = auth.split(" ")[1];
    if (!token) {
      throw new Error("No token");
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    request.user = decoded;
  } catch (err) {
    reply.status(401).send({ error: "No autorizado" });
  }
}

