import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { JWT_SECRET, JWT_EXPIRATION } from "../config/constants";
import { authGuard } from "../middleware/auth";
import { prisma } from "../config/database";

export async function authRoutes(server: FastifyInstance) {
  // Login
  server.post("/auth/login", async (request: FastifyRequest, reply: FastifyReply) => {
    const { username, password } = request.body as {
      username: string;
      password: string;
    };

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return reply.status(401).send({ error: "Usuario no encontrado" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return reply.status(401).send({ error: "Contraseña incorrecta" });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
    return { token };
  });

  // Ruta protegida de prueba
  server.get("/private", { preHandler: [authGuard] }, async () => {
    return { message: "Accediste al área privada 🚀" };
  });
}

