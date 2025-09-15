import Fastify, { type FastifyRequest, type FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const server = Fastify();
const prisma = new PrismaClient();

const JWT_SECRET = "supersecreto"; // ⚠️ en producción usa una var de entorno

// Configurar CORS
async function setupServer() {
  await server.register(import('@fastify/cors'), {
    origin: true, // Permite todos los orígenes en desarrollo
    credentials: true
  });
}

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

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1h" });
    return { token };
});

// Middleware simple para proteger rutas
async function authGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
        const auth = request.headers.authorization;
        if (!auth || typeof auth !== 'string') throw new Error("No auth header");

        const token = auth.split(" ")[1];
        if (!token) throw new Error("No token");
        const decoded = jwt.verify(token, JWT_SECRET);
        (request as any).user = decoded;
    } catch (err) {
        reply.status(401).send({ error: "No autorizado" });
    }
}

// Obtener menú por fecha
server.get("/menus/:date", async (request, reply) => {
    const { date } = request.params as { date: string };

    const menu = await prisma.menu.findUnique({
        where: { date: new Date(date) },
        include: {
            meals: {
                include: {
                    items: { include: { allergens: { include: { allergen: true } } } }
                }
            }
        }
    });

    if (!menu) return reply.status(404).send({ error: "Menú no encontrado" });
    return menu;
});

// Crear menú (protegido)
server.post("/menus", { preHandler: [authGuard] }, async (request, reply) => {
    const { date, meals } = request.body as any;

    const newMenu = await prisma.menu.create({
        data: {
            date: new Date(date),
            meals: {
                create: meals.map((meal: any) => ({
                    type: meal.type,
                    items: {
                        create: meal.items.map((item: any) => ({
                            name: item.name,
                            allergens: {
                                create: item.allergens.map((allergenName: string) => ({
                                    allergen: {
                                        connectOrCreate: {
                                            where: { name: allergenName },
                                            create: { name: allergenName }
                                        }
                                    }
                                }))
                            }
                        }))
                    }
                }))
            }
        },
        include: {
            meals: {
                include: {
                    items: {
                        include: {
                            allergens: {
                                include: { allergen: true }
                            }
                        }
                    }
                }
            }
        }
    });

    return newMenu;
});


// Actualizar menú (simplificado)
server.put("/menus/:id", { preHandler: [authGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { meals } = request.body as any;

    // borrar comidas/items existentes y recrearlas (simplifica el update)
    await prisma.mealItemAllergen.deleteMany({
        where: { mealItem: { meal: { menuId: Number(id) } } }
    });
    await prisma.mealItem.deleteMany({
        where: { meal: { menuId: Number(id) } }
    });
    await prisma.meal.deleteMany({ where: { menuId: Number(id) } });

    const updatedMenu = await prisma.menu.update({
        where: { id: Number(id) },
        data: {
            meals: {
                create: meals.map((meal: any) => ({
                    type: meal.type,
                    items: {
                        create: meal.items.map((item: any) => ({
                            name: item.name,
                            allergens: { create: item.allergens.map((allergenId: number) => ({ allergenId })) },
                        })),
                    },
                })),
            },
        },
        include: {
            meals: {
                include: {
                    items: { include: { allergens: { include: { allergen: true } } } }
                }
            }
        }
    });

    return updatedMenu;
});

// Borrar menú
server.delete("/menus/:id", { preHandler: [authGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.menu.delete({ where: { id: Number(id) } });
    return { message: "Menú eliminado ✅" };
});

// Ruta protegida de prueba
server.get("/private", { preHandler: [authGuard] }, async () => {
    return { message: "Accediste al área privada 🚀" };
});

// Inicializar servidor
async function start() {
  try {
    await setupServer();
    await server.listen({ port: 3000, host: "0.0.0.0" });
    console.log(`Servidor escuchando en http://0.0.0.0:3000`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start();
