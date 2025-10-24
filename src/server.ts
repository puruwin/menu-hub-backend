import Fastify, { type FastifyRequest, type FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { MealType, PrismaClient } from "@prisma/client";

const server = Fastify();
const prisma = new PrismaClient();

const JWT_SECRET = "supersecreto"; // ⚠️ en producción usa una var de entorno

// Configurar CORS
async function setupServer() {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [];
  
  console.log('🌍 CORS Configuration:');
  console.log('  - Environment:', process.env.NODE_ENV || 'development');
  console.log('  - Is Development:', isDevelopment);
  console.log('  - Allowed Origins:', allowedOrigins);

  await server.register(import('@fastify/cors'), {
    origin: (origin, callback) => {
      // Siempre permitir peticiones sin origin (ej: desde Postman, herramientas de desarrollo)
      if (!origin) {
        callback(null, true);
        return;
      }

      // En desarrollo, ser más permisivo
      if (isDevelopment) {
        const devOrigins = [
          'http://localhost:5173', 
          'http://127.0.0.1:5173',
          'http://localhost:3000',
          'http://127.0.0.1:3000'
        ];
        
        if (devOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
      }

      // Verificar orígenes configurados explícitamente
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      // En producción, verificar patrones de red local si no hay orígenes específicos configurados
      if (!isDevelopment && allowedOrigins.length === 0) {
        const localNetworkPatterns = [
          /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,  // Redes 192.168.x.x
          /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,   // Redes 10.x.x.x
          /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+(:\d+)?$/ // Redes 172.16-31.x.x
        ];
        
        const isLocalNetwork = localNetworkPatterns.some(pattern => pattern.test(origin));
        if (isLocalNetwork) {
          console.log(`✅ CORS: Permitido por red local: ${origin}`);
          callback(null, true);
          return;
        }
      }

      console.log(`❌ CORS: Origen no permitido: ${origin}`);
      console.log(`   Orígenes permitidos: ${allowedOrigins.join(', ')}`);
      callback(new Error('No permitido por CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
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


// Obtener menús de un rango de fechas
server.get("/menus", async (request, reply) => {
    const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };

    const whereCondition: any = {};
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
                    items: { include: { allergens: { include: { allergen: true } } } }
                }
            }
        }
    });

    return updatedMenu;
});

// Agregar plato a una comida específica
server.post("/menus/:menuId/meals/:mealId/items", { preHandler: [authGuard] }, async (request, reply) => {
    const { menuId, mealId } = request.params as { menuId: string; mealId: string };
    const { name, allergens } = request.body as { name: string; allergens: string[] };

    const mealItem = await prisma.mealItem.create({
        data: {
            name,
            mealId: Number(mealId),
            allergens: {
                create: allergens.map((allergenName: string) => ({
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
    const { itemId } = request.params as { itemId: string };
    const { name, allergens } = request.body as { name: string; allergens: string[] };

    // Eliminar alérgenos existentes
    await prisma.mealItemAllergen.deleteMany({
        where: { mealItemId: Number(itemId) }
    });

    const updatedItem = await prisma.mealItem.update({
        where: { id: Number(itemId) },
        data: {
            name,
            allergens: {
                create: allergens.map((allergenName: string) => ({
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
    const { itemId } = request.params as { itemId: string };

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
    const { menuId } = request.params as { menuId: string };
    const { type, items } = request.body as { type: MealType; items: any[] };

    const meal = await prisma.meal.create({
        data: {
            type,
            menuId: Number(menuId),
            items: {
                create: items.map((item: any) => ({
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
        },
        include: {
            items: { include: { allergens: { include: { allergen: true } } } }
        }
    });

    return meal;
});

// Borrar menú
server.delete("/menus/:id", { preHandler: [authGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.menu.delete({ where: { id: Number(id) } });
    return { message: "Menú eliminado ✅" };
});

// Borrado masivo de menús por rango de fechas
server.delete("/menus/bulk-delete", { preHandler: [authGuard] }, async (request, reply) => {
    const { startDate, endDate } = request.query as { startDate: string; endDate: string };

    try {
        console.log('🗑️ Iniciando borrado masivo...');
        console.log('📅 Rango: desde', startDate, 'hasta', endDate);

        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Normalizar fechas
        start.setUTCHours(0, 0, 0, 0);
        end.setUTCHours(23, 59, 59, 999);

        // Buscar menús en el rango
        const menusToDelete = await prisma.menu.findMany({
            where: {
                date: {
                    gte: start,
                    lte: end
                }
            }
        });

        console.log(`📊 Encontrados ${menusToDelete.length} menús para borrar`);

        // Borrar relaciones primero
        for (const menu of menusToDelete) {
            // Borrar alérgenos de items
            await prisma.mealItemAllergen.deleteMany({
                where: { mealItem: { meal: { menuId: menu.id } } }
            });
            
            // Borrar items
            await prisma.mealItem.deleteMany({
                where: { meal: { menuId: menu.id } }
            });
            
            // Borrar comidas
            await prisma.meal.deleteMany({
                where: { menuId: menu.id }
            });
        }

        // Borrar menús
        const deleteResult = await prisma.menu.deleteMany({
            where: {
                date: {
                    gte: start,
                    lte: end
                }
            }
        });

        console.log(`✅ Borrados ${deleteResult.count} menús exitosamente`);

        return {
            message: "Menús borrados correctamente",
            count: deleteResult.count,
            deletedMenus: menusToDelete.map(m => m.date.toISOString().split('T')[0])
        };
    } catch (error) {
        console.error('❌ Error en borrado masivo:', error);
        return reply.status(500).send({
            error: "Error al borrar menús",
            details: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});

// Importación masiva de menús escolares
server.post("/menus/bulk-import", { preHandler: [authGuard] }, async (request, reply) => {
    const { startDate, menuData } = request.body as { 
        startDate: string; 
        menuData: { 
            weeks: Array<{
                week: number;
                days: Array<{
                    day: string;
                    meals: Array<{
                        type: string;
                        items: Array<{
                            name: string;
                            allergens: string[];
                        }>;
                    }>;
                }>;
            }>;
        };
    };

    try {
        console.log('🚀 Iniciando importación masiva...');
        console.log('📅 Fecha de inicio:', startDate);
        console.log('📊 Semanas en JSON:', menuData.weeks.length);

        const startDateObj = new Date(startDate);
        // Normalizar a medianoche UTC para evitar problemas de timezone
        startDateObj.setUTCHours(0, 0, 0, 0);
        
        const createdMenus: any[] = [];
        const skippedMenus: string[] = [];
        const errors: string[] = [];
        
        // Mapeo de días de la semana en español a números
        const dayMap: Record<string, number> = {
            'LUN': 1, 'MAR': 2, 'MIE': 3, 'JUE': 4, 'VIE': 5, 'SAB_DOM': 6
        };

        // Procesar cada semana
        for (const week of menuData.weeks) {
            console.log(`\n📆 Procesando semana ${week.week}...`);
            const weekOffset = week.week;
            
            // Procesar cada día de la semana
            for (const day of week.days) {
                try {
                    let targetDate = new Date(startDateObj);
                    
                    // Calcular la fecha correcta
                    if (day.day === 'SAB_DOM') {
                        // Sábado de la semana correspondiente
                        targetDate.setDate(startDateObj.getDate() + (weekOffset * 7) + 5);
                    } else {
                        const dayNumber = dayMap[day.day];
                        if (dayNumber) {
                            targetDate.setDate(startDateObj.getDate() + (weekOffset * 7) + (dayNumber - 1));
                        } else {
                            console.warn(`⚠️  Día desconocido: ${day.day}`);
                            continue;
                        }
                    }

                    // Normalizar la fecha objetivo
                    targetDate.setUTCHours(0, 0, 0, 0);
                    const dateString = targetDate.toISOString().split('T')[0] || '';
                    
                    console.log(`   Procesando ${day.day} - ${dateString}`);

                    // Verificar si hay comidas para este día
                    if (!day.meals || day.meals.length === 0) {
                        console.log(`   ⚠️  Sin comidas para ${day.day}, omitiendo...`);
                        continue;
                    }

                    // Verificar si ya existe un menú para esa fecha
                    const existingMenu = await prisma.menu.findUnique({
                        where: { date: targetDate }
                    });

                    if (existingMenu) {
                        console.log(`   ⏭️  Menú ya existe para ${dateString}, omitiendo...`);
                        skippedMenus.push(dateString);
                        continue;
                    }

                    // Crear el menú con sus comidas
                    const newMenu = await prisma.menu.create({
                        data: {
                            date: targetDate,
                            meals: {
                                create: day.meals.map((meal: any) => ({
                                    type: meal.type as MealType,
                                    items: {
                                        create: meal.items.map((item: any) => ({
                                            name: item.name,
                                            allergens: {
                                                create: item.allergens.length > 0 
                                                    ? item.allergens.map((allergenName: string) => ({
                                                        allergen: {
                                                            connectOrCreate: {
                                                                where: { name: allergenName },
                                                                create: { name: allergenName }
                                                            }
                                                        }
                                                    }))
                                                    : []
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

                    console.log(`   ✅ Menú creado para ${dateString} con ${newMenu.meals.length} comidas`);
                    createdMenus.push(newMenu);
                } catch (dayError) {
                    const errorMsg = `Error procesando ${day.day} de semana ${week.week}: ${dayError instanceof Error ? dayError.message : 'Error desconocido'}`;
                    console.error(`   ❌ ${errorMsg}`);
                    errors.push(errorMsg);
                }
            }
        }

        console.log('\n📊 Resumen de importación:');
        console.log(`   ✅ Menús creados: ${createdMenus.length}`);
        console.log(`   ⏭️  Menús omitidos (ya existían): ${skippedMenus.length}`);
        console.log(`   ❌ Errores: ${errors.length}`);

        return { 
            message: "Importación completada", 
            count: createdMenus.length,
            skipped: skippedMenus.length,
            errors: errors.length,
            details: {
                created: createdMenus.length,
                skipped: skippedMenus,
                errors: errors
            }
        };
    } catch (error) {
        console.error('❌ Error crítico en importación masiva:', error);
        return reply.status(500).send({ 
            error: "Error al importar menús", 
            details: error instanceof Error ? error.message : 'Error desconocido',
            stack: error instanceof Error ? error.stack : undefined
        });
    }
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
