import Fastify, {} from "fastify";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
const server = Fastify();
const prisma = new PrismaClient();
const JWT_SECRET = "supersecreto"; // ⚠️ en producción usa una var de entorno
// Configurar CORS
async function setupServer() {
    await server.register(import('@fastify/cors'), {
        origin: (origin, callback) => {
            // Permitir todas las peticiones en desarrollo
            const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            }
            else {
                callback(new Error('No permitido por CORS'), false);
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
    });
}
// Login
server.post("/auth/login", async (request, reply) => {
    const { username, password } = request.body;
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
async function authGuard(request, reply) {
    try {
        const auth = request.headers.authorization;
        if (!auth || typeof auth !== 'string')
            throw new Error("No auth header");
        const token = auth.split(" ")[1];
        if (!token)
            throw new Error("No token");
        const decoded = jwt.verify(token, JWT_SECRET);
        request.user = decoded;
    }
    catch (err) {
        reply.status(401).send({ error: "No autorizado" });
    }
}
// Obtener menú por fecha
server.get("/menus/:date", async (request, reply) => {
    const { date } = request.params;
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
    if (!menu)
        return reply.status(404).send({ error: "Menú no encontrado" });
    return menu;
});
// Crear menú (protegido)
server.post("/menus", { preHandler: [authGuard] }, async (request, reply) => {
    const { date, meals } = request.body;
    const newMenu = await prisma.menu.create({
        data: {
            date: new Date(date),
            meals: {
                create: meals.map((meal) => ({
                    type: meal.type,
                    items: {
                        create: meal.items.map((item) => ({
                            name: item.name,
                            allergens: {
                                create: item.allergens.map((allergenName) => ({
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
// Obtener menús de un rango de fechas
server.get("/menus", async (request, reply) => {
    const { startDate, endDate } = request.query;
    const whereCondition = {};
    if (startDate && endDate) {
        whereCondition.date = {
            gte: new Date(startDate),
            lte: new Date(endDate)
        };
    }
    const menus = await prisma.menu.findMany({
        where: whereCondition,
        include: {
            meals: {
                include: {
                    items: {
                        include: {
                            allergens: { include: { allergen: true } }
                        }
                    }
                }
            }
        },
        orderBy: { date: 'asc' }
    });
    return menus;
});
// Actualizar menú (simplificado)
server.put("/menus/:id", { preHandler: [authGuard] }, async (request, reply) => {
    const { id } = request.params;
    const { meals } = request.body;
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
                create: meals.map((meal) => ({
                    type: meal.type,
                    items: {
                        create: meal.items.map((item) => ({
                            name: item.name,
                            allergens: {
                                create: item.allergens.map((allergenName) => ({
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
                    items: { include: { allergens: { include: { allergen: true } } } }
                }
            }
        }
    });
    return updatedMenu;
});
// Agregar plato a una comida específica
server.post("/menus/:menuId/meals/:mealId/items", { preHandler: [authGuard] }, async (request, reply) => {
    const { menuId, mealId } = request.params;
    const { name, allergens } = request.body;
    const mealItem = await prisma.mealItem.create({
        data: {
            name,
            mealId: Number(mealId),
            allergens: {
                create: allergens.map((allergenName) => ({
                    allergen: {
                        connectOrCreate: {
                            where: { name: allergenName },
                            create: { name: allergenName }
                        }
                    }
                }))
            }
        },
        include: {
            allergens: { include: { allergen: true } }
        }
    });
    return mealItem;
});
// Actualizar plato específico
server.put("/menus/:menuId/meals/:mealId/items/:itemId", { preHandler: [authGuard] }, async (request, reply) => {
    const { itemId } = request.params;
    const { name, allergens } = request.body;
    // Eliminar alérgenos existentes
    await prisma.mealItemAllergen.deleteMany({
        where: { mealItemId: Number(itemId) }
    });
    const updatedItem = await prisma.mealItem.update({
        where: { id: Number(itemId) },
        data: {
            name,
            allergens: {
                create: allergens.map((allergenName) => ({
                    allergen: {
                        connectOrCreate: {
                            where: { name: allergenName },
                            create: { name: allergenName }
                        }
                    }
                }))
            }
        },
        include: {
            allergens: { include: { allergen: true } }
        }
    });
    return updatedItem;
});
// Eliminar plato específico
server.delete("/menus/:menuId/meals/:mealId/items/:itemId", { preHandler: [authGuard] }, async (request, reply) => {
    const { itemId } = request.params;
    await prisma.mealItemAllergen.deleteMany({
        where: { mealItemId: Number(itemId) }
    });
    await prisma.mealItem.delete({
        where: { id: Number(itemId) }
    });
    return { message: "Plato eliminado correctamente" };
});
// Agregar comida completa a un menú
server.post("/menus/:menuId/meals", { preHandler: [authGuard] }, async (request, reply) => {
    const { menuId } = request.params;
    const { type, items } = request.body;
    const meal = await prisma.meal.create({
        data: {
            type,
            menuId: Number(menuId),
            items: {
                create: items.map((item) => ({
                    name: item.name,
                    allergens: {
                        create: item.allergens.map((allergenName) => ({
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
        },
        include: {
            items: { include: { allergens: { include: { allergen: true } } } }
        }
    });
    return meal;
});
// Borrar menú
server.delete("/menus/:id", { preHandler: [authGuard] }, async (request, reply) => {
    const { id } = request.params;
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
    }
    catch (err) {
        console.error(err);
        process.exit(1);
    }
}
start();
//# sourceMappingURL=server.js.map