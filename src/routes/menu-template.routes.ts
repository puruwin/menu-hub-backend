import type { FastifyInstance } from "fastify";
import { MealType } from "@prisma/client";
import { authGuard } from "../middleware/auth";
import { prisma } from "../config/database";

interface MenuDataJson {
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
}

export async function menuTemplateRoutes(server: FastifyInstance) {
  // Listar todas las plantillas
  server.get("/menu-templates", async (request, reply) => {
    const templates = await prisma.menuTemplate.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return templates;
  });

  // Obtener plantilla completa con toda su estructura
  server.get("/menu-templates/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const template = await prisma.menuTemplate.findUnique({
      where: { id: Number(id) },
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
          include: {
            days: {
              orderBy: { day: 'asc' },
              include: {
                meals: {
                  include: {
                    items: {
                      orderBy: { order: 'asc' },
                      include: {
                        dish: {
                          include: {
                            allergens: {
                              include: { allergen: true }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!template) {
      return reply.status(404).send({ error: "Plantilla no encontrada" });
    }

    return template;
  });

  // Importar JSON a la base de datos como plantilla
  server.post("/menu-templates/import-json", { preHandler: [authGuard] }, async (request, reply) => {
    const { name, menuData } = request.body as { name: string; menuData: MenuDataJson };

    try {
      console.log('🚀 Importando JSON como plantilla de menú...');
      console.log(`📋 Nombre: ${name}`);
      console.log(`📊 Semanas: ${menuData.weeks.length}`);

      // Verificar si ya existe una plantilla con ese nombre
      const existing = await prisma.menuTemplate.findUnique({ where: { name } });
      if (existing) {
        return reply.status(400).send({ error: `Ya existe una plantilla con el nombre "${name}"` });
      }

      // PASO 1: Recolectar y crear alérgenos únicos
      const allAllergens = new Set<string>();
      for (const week of menuData.weeks) {
        for (const day of week.days) {
          for (const meal of day.meals || []) {
            for (const item of meal.items || []) {
              if (item.allergens) {
                item.allergens.forEach(a => allAllergens.add(a));
              }
            }
          }
        }
      }

      console.log(`🥜 Creando ${allAllergens.size} alérgenos...`);
      const allergenMap = new Map<string, number>();
      for (const allergenName of allAllergens) {
        const allergen = await prisma.allergen.upsert({
          where: { name: allergenName },
          update: {},
          create: { name: allergenName }
        });
        allergenMap.set(allergenName, allergen.id);
      }

      // PASO 2: Recolectar y crear platos únicos con sus alérgenos
      const allDishes = new Map<string, string[]>();
      for (const week of menuData.weeks) {
        for (const day of week.days) {
          for (const meal of day.meals || []) {
            for (const item of meal.items || []) {
              if (!allDishes.has(item.name)) {
                allDishes.set(item.name, item.allergens || []);
              }
            }
          }
        }
      }

      console.log(`🍽️ Creando ${allDishes.size} platos...`);
      const dishMap = new Map<string, number>();
      for (const [dishName, allergens] of allDishes) {
        let dish = await prisma.dish.findUnique({ where: { name: dishName } });
        
        if (!dish) {
          dish = await prisma.dish.create({ data: { name: dishName } });
        }

        // Crear/actualizar alérgenos del plato
        for (const allergenName of allergens) {
          const allergenId = allergenMap.get(allergenName);
          if (allergenId) {
            await prisma.dishAllergen.upsert({
              where: {
                dishId_allergenId: { dishId: dish.id, allergenId }
              },
              update: {},
              create: { dishId: dish.id, allergenId }
            });
          }
        }

        dishMap.set(dishName, dish.id);
      }

      // PASO 3: Crear la plantilla con toda su estructura
      console.log('📅 Creando estructura de plantilla...');
      
      // Procesar semanas deduplicando días con el mismo nombre
      const processedWeeks = menuData.weeks.map(week => {
        // Agrupar días por nombre y combinar sus comidas
        const dayMap = new Map<string, typeof week.days[0]>();
        
        for (const day of week.days) {
          if (dayMap.has(day.day)) {
            // Día ya existe, combinar comidas
            const existingDay = dayMap.get(day.day)!;
            const existingMeals = existingDay.meals || [];
            const newMeals = day.meals || [];
            
            // Combinar comidas, usando las del último día que aparece
            for (const newMeal of newMeals) {
              const existingMealIndex = existingMeals.findIndex(m => m.type === newMeal.type);
              if (existingMealIndex >= 0) {
                // Reemplazar con la versión más reciente
                existingMeals[existingMealIndex] = newMeal;
              } else {
                existingMeals.push(newMeal);
              }
            }
            existingDay.meals = existingMeals;
          } else {
            dayMap.set(day.day, { ...day, meals: [...(day.meals || [])] });
          }
        }
        
        return {
          weekNumber: week.week,
          days: Array.from(dayMap.values())
        };
      });
      
      const template = await prisma.menuTemplate.create({
        data: {
          name,
          weeks: {
            create: processedWeeks.map(week => ({
              weekNumber: week.weekNumber,
              days: {
                create: week.days.map(day => ({
                  day: day.day,
                  meals: {
                    create: (day.meals || []).map(meal => ({
                      type: meal.type as MealType,
                      items: {
                        create: (meal.items || []).map((item, index) => ({
                          dishId: dishMap.get(item.name)!,
                          order: index
                        }))
                      }
                    }))
                  }
                }))
              }
            }))
          }
        },
        include: {
          weeks: {
            include: {
              days: {
                include: {
                  meals: {
                    include: {
                      items: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      console.log(`✅ Plantilla "${name}" creada con ID ${template.id}`);

      return {
        message: "Plantilla importada correctamente",
        templateId: template.id,
        stats: {
          weeks: menuData.weeks.length,
          allergens: allAllergens.size,
          dishes: allDishes.size
        }
      };
    } catch (error) {
      console.error('❌ Error importando plantilla:', error);
      return reply.status(500).send({
        error: "Error al importar plantilla",
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // Actualizar platos de una comida específica en la plantilla
  server.put("/menu-templates/:id/weeks/:weekNumber/days/:day/meals/:type/items", 
    { preHandler: [authGuard] }, 
    async (request, reply) => {
      const { id, weekNumber, day, type } = request.params as { 
        id: string; 
        weekNumber: string; 
        day: string; 
        type: string;
      };
      const { items } = request.body as { 
        items: Array<{ dishId: number; order: number }> 
      };

      try {
        // Buscar la comida específica
        const meal = await prisma.menuTemplateMeal.findFirst({
          where: {
            type: type as MealType,
            day: {
              day: day,
              week: {
                weekNumber: Number(weekNumber),
                templateId: Number(id)
              }
            }
          }
        });

        if (!meal) {
          return reply.status(404).send({ error: "Comida no encontrada en la plantilla" });
        }

        // Eliminar items existentes y crear nuevos
        await prisma.menuTemplateMealItem.deleteMany({
          where: { mealId: meal.id }
        });

        await prisma.menuTemplateMealItem.createMany({
          data: items.map(item => ({
            mealId: meal.id,
            dishId: item.dishId,
            order: item.order
          }))
        });

        // Devolver la comida actualizada
        const updatedMeal = await prisma.menuTemplateMeal.findUnique({
          where: { id: meal.id },
          include: {
            items: {
              orderBy: { order: 'asc' },
              include: {
                dish: {
                  include: {
                    allergens: { include: { allergen: true } }
                  }
                }
              }
            }
          }
        });

        return updatedMeal;
      } catch (error) {
        console.error('❌ Error actualizando items:', error);
        return reply.status(500).send({
          error: "Error al actualizar items",
          details: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }
  );

  // Actualizar nombre de plantilla
  server.put("/menu-templates/:id", { preHandler: [authGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name } = request.body as { name: string };

    try {
      const template = await prisma.menuTemplate.update({
        where: { id: Number(id) },
        data: { name }
      });

      return template;
    } catch (error: any) {
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: "Ya existe una plantilla con ese nombre" });
      }
      return reply.status(500).send({
        error: "Error al actualizar plantilla",
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // Eliminar plantilla
  server.delete("/menu-templates/:id", { preHandler: [authGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      await prisma.menuTemplate.delete({
        where: { id: Number(id) }
      });

      return { message: "Plantilla eliminada correctamente" };
    } catch (error) {
      return reply.status(500).send({
        error: "Error al eliminar plantilla",
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // ========================================
  // Endpoints para gestión de items de plantilla
  // ========================================

  // Reordenar items de una comida
  server.put("/menu-template-meals/:mealId/reorder", { preHandler: [authGuard] }, async (request, reply) => {
    const { mealId } = request.params as { mealId: string };
    const { itemIds } = request.body as { itemIds: number[] };

    try {
      // Actualizar el orden de cada item
      await Promise.all(
        itemIds.map((itemId, index) => 
          prisma.menuTemplateMealItem.update({
            where: { id: itemId },
            data: { order: index }
          })
        )
      );

      // Devolver la comida actualizada
      const updatedMeal = await prisma.menuTemplateMeal.findUnique({
        where: { id: Number(mealId) },
        include: {
          items: {
            orderBy: { order: 'asc' },
            include: {
              dish: {
                include: {
                  allergens: { include: { allergen: true } }
                }
              }
            }
          }
        }
      });

      return updatedMeal;
    } catch (error) {
      console.error('❌ Error reordenando items:', error);
      return reply.status(500).send({
        error: "Error al reordenar items",
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // Reemplazar plato de un item (busca o crea el plato por nombre)
  server.put("/menu-template-items/:itemId/dish", { preHandler: [authGuard] }, async (request, reply) => {
    const { itemId } = request.params as { itemId: string };
    const { name, allergens } = request.body as { name: string; allergens: string[] };

    try {
      // Verificar que el item existe
      const item = await prisma.menuTemplateMealItem.findUnique({
        where: { id: Number(itemId) }
      });

      if (!item) {
        return reply.status(404).send({ error: "Item no encontrado" });
      }

      // Buscar si existe un plato con ese nombre
      let dish = await prisma.dish.findUnique({
        where: { name: name.trim() }
      });

      if (!dish) {
        // Crear nuevo plato
        dish = await prisma.dish.create({
          data: { name: name.trim() }
        });
        console.log(`✅ Nuevo plato creado: ${dish.name} (ID: ${dish.id})`);
      }

      // Actualizar alérgenos del plato
      // Primero eliminar los existentes
      await prisma.dishAllergen.deleteMany({
        where: { dishId: dish.id }
      });

      // Luego agregar los nuevos
      for (const allergenName of allergens) {
        const allergen = await prisma.allergen.findUnique({
          where: { name: allergenName }
        });

        if (allergen) {
          await prisma.dishAllergen.create({
            data: {
              dishId: dish.id,
              allergenId: allergen.id
            }
          });
        }
      }

      // Actualizar el item para que apunte al nuevo plato
      const updatedItem = await prisma.menuTemplateMealItem.update({
        where: { id: Number(itemId) },
        data: { dishId: dish.id },
        include: {
          dish: {
            include: {
              allergens: { include: { allergen: true } }
            }
          }
        }
      });

      return updatedItem;
    } catch (error) {
      console.error('❌ Error actualizando plato del item:', error);
      return reply.status(500).send({
        error: "Error al actualizar plato",
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // ========================================
  // Endpoints para gestión de platos
  // ========================================

  // Buscar platos por nombre (para autocompletado)
  server.get("/dishes/search", async (request, reply) => {
    const { query } = request.query as { query: string };
    
    console.log('🔍 [/dishes/search] Búsqueda recibida:', query);
    
    try {
      if (!query || query.trim().length < 2) {
        console.log('🔍 [/dishes/search] Query muy corta, devolviendo []');
        return [];
      }

      const dishes = await prisma.dish.findMany({
        where: {
          name: {
            contains: query.trim(),
            mode: 'insensitive'
          }
        },
        include: {
          allergens: {
            include: { allergen: true }
          }
        },
        orderBy: { name: 'asc' },
        take: 15
      });

      console.log(`🔍 [/dishes/search] Encontrados ${dishes.length} platos para "${query}"`);

      // Transformar el formato para el frontend
      const result = dishes.map(dish => ({
        id: dish.id,
        name: dish.name,
        allergens: dish.allergens.map(a => a.allergen.name),
        usageCount: 0
      }));
      
      console.log('🔍 [/dishes/search] Resultado:', JSON.stringify(result.slice(0, 3)));
      return result;
    } catch (error) {
      console.error('❌ [/dishes/search] Error buscando platos:', error);
      return reply.status(500).send({
        error: "Error al buscar platos",
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // Listar todos los platos con sus alérgenos
  server.get("/dishes", async (request, reply) => {
    const dishes = await prisma.dish.findMany({
      include: {
        allergens: {
          include: { allergen: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    return dishes;
  });

  // Obtener un plato específico
  server.get("/dishes/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const dish = await prisma.dish.findUnique({
      where: { id: Number(id) },
      include: {
        allergens: {
          include: { allergen: true }
        }
      }
    });

    if (!dish) {
      return reply.status(404).send({ error: "Plato no encontrado" });
    }

    return dish;
  });

  // Actualizar alérgenos de un plato
  server.put("/dishes/:id/allergens", { preHandler: [authGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { allergens } = request.body as { allergens: string[] };

    try {
      const dish = await prisma.dish.findUnique({ where: { id: Number(id) } });
      if (!dish) {
        return reply.status(404).send({ error: "Plato no encontrado" });
      }

      // Crear alérgenos que no existan
      const allergenIds: number[] = [];
      for (const allergenName of allergens) {
        const allergen = await prisma.allergen.upsert({
          where: { name: allergenName },
          update: {},
          create: { name: allergenName }
        });
        allergenIds.push(allergen.id);
      }

      // Eliminar alérgenos actuales del plato
      await prisma.dishAllergen.deleteMany({
        where: { dishId: Number(id) }
      });

      // Crear nuevas relaciones
      await prisma.dishAllergen.createMany({
        data: allergenIds.map(allergenId => ({
          dishId: Number(id),
          allergenId
        }))
      });

      // Devolver plato actualizado
      const updatedDish = await prisma.dish.findUnique({
        where: { id: Number(id) },
        include: {
          allergens: {
            include: { allergen: true }
          }
        }
      });

      return updatedDish;
    } catch (error) {
      console.error('❌ Error actualizando alérgenos:', error);
      return reply.status(500).send({
        error: "Error al actualizar alérgenos",
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // Listar todos los alérgenos disponibles
  server.get("/allergens", async (request, reply) => {
    const allergens = await prisma.allergen.findMany({
      orderBy: { name: 'asc' }
    });
    return allergens;
  });
}

