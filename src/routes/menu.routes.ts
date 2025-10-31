import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { MealType } from "@prisma/client";
import { authGuard } from "../middleware/auth";
import { prisma } from "../config/database";

export async function menuRoutes(server: FastifyInstance) {
  // Obtener menú por fecha
  server.get("/menus/:date", async (request, reply) => {
    const { date } = request.params as { date: string };

    const menu = await prisma.menu.findUnique({
      where: { date: new Date(date) },
      include: {
        meals: {
          include: {
            items: { 
              include: { 
                dish: { 
                  include: { 
                    allergens: { include: { allergen: true } } 
                  } 
                } 
              } 
            }
          }
        }
      }
    });

    if (!menu) return reply.status(404).send({ error: "Menú no encontrado" });
    return menu;
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
                dish: { 
                  include: { 
                    allergens: { include: { allergen: true } } 
                  } 
                } 
              } 
            }
          }
        }
      },
      orderBy: { date: 'asc' }
    });

    return menus;
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
                dish: {
                  connectOrCreate: {
                    where: { name: item.name },
                    create: {
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
                    }
                  }
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
    });

    return newMenu;
  });

  // Actualizar menú (simplificado)
  server.put("/menus/:id", { preHandler: [authGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { meals } = request.body as any;

    // borrar comidas/items existentes y recrearlas (simplifica el update)
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
                dish: {
                  connectOrCreate: {
                    where: { name: item.name },
                    create: {
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
                    }
                  }
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
                dish: { 
                  include: { 
                    allergens: { include: { allergen: true } } 
                  } 
                } 
              } 
            }
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
      let templatesCreated = 0;
      let templatesUpdated = 0;
      
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

            // Guardar plantillas de platos antes de crear el menú
            for (const meal of day.meals) {
              for (const item of meal.items) {
                try {
                  // Verificar si la plantilla ya existe
                  const existingTemplate = await prisma.plateTemplate.findUnique({
                    where: { name: item.name }
                  });

                  if (existingTemplate) {
                    // Solo incrementar el contador de uso
                    await prisma.plateTemplate.update({
                      where: { id: existingTemplate.id },
                      data: {
                        usageCount: { increment: 1 }
                      }
                    });
                    templatesUpdated++;
                  } else {
                    // Crear nueva plantilla
                    await prisma.plateTemplate.create({
                      data: {
                        name: item.name,
                        usageCount: 1,
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
                      }
                    });
                    templatesCreated++;
                  }
                } catch (templateError) {
                  console.warn(`   ⚠️  No se pudo guardar plantilla para "${item.name}":`, templateError);
                  // Continuar aunque falle guardar la plantilla
                }
              }
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
                        dish: {
                          connectOrCreate: {
                            where: { name: item.name },
                            create: {
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
                            }
                          }
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
      console.log(`   🍽️  Plantillas de platos creadas: ${templatesCreated}`);
      console.log(`   🔄 Plantillas de platos actualizadas: ${templatesUpdated}`);
      console.log(`   ❌ Errores: ${errors.length}`);

      return { 
        message: "Importación completada", 
        count: createdMenus.length,
        skipped: skippedMenus.length,
        errors: errors.length,
        templatesCreated,
        templatesUpdated,
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
            dish: {
              connectOrCreate: {
                where: { name: item.name },
                create: {
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
                }
              }
            }
          }))
        }
      },
      include: {
        items: { 
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

    return meal;
  });

  // Agregar plato a una comida específica
  server.post("/menus/:menuId/meals/:mealId/items", { preHandler: [authGuard] }, async (request, reply) => {
    const { menuId, mealId } = request.params as { menuId: string; mealId: string };
    const { name, allergens } = request.body as { name: string; allergens: string[] };

    try {
      // Verificar que el menú existe
      const menu = await prisma.menu.findUnique({
        where: { id: Number(menuId) }
      });

      if (!menu) {
        return reply.status(404).send({ 
          error: "Menú no encontrado",
          code: "MENU_NOT_FOUND"
        });
      }

      // Verificar que la comida existe y pertenece al menú
      const meal = await prisma.meal.findFirst({
        where: { 
          id: Number(mealId),
          menuId: Number(menuId)
        }
      });

      if (!meal) {
        return reply.status(404).send({ 
          error: "Comida no encontrada o no pertenece al menú especificado",
          code: "MEAL_NOT_FOUND",
          details: {
            menuId: Number(menuId),
            mealId: Number(mealId)
          }
        });
      }

      const mealItem = await prisma.mealItem.create({
        data: {
          meal: {
            connect: { id: Number(mealId) }
          },
          dish: {
            connectOrCreate: {
              where: { name },
              create: {
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
              }
            }
          }
        },
        include: {
          dish: {
            include: {
              allergens: { include: { allergen: true } }
            }
          }
        }
      });

      return mealItem;
    } catch (error) {
      console.error('❌ Error creando plato:', error);
      return reply.status(500).send({
        error: "Error al crear el plato",
        details: error instanceof Error ? error.message : 'Error desconocido',
        code: error && typeof error === 'object' && 'code' in error ? error.code : undefined
      });
    }
  });

  // Actualizar plato específico
  server.put("/menus/:menuId/meals/:mealId/items/:itemId", { preHandler: [authGuard] }, async (request, reply) => {
    const { itemId } = request.params as { itemId: string };
    const { name, allergens } = request.body as { name: string; allergens: string[] };

    // Actualizar el MealItem para que apunte al Dish correcto
    // Si el Dish no existe, se crea con los alérgenos especificados
    const updatedItem = await prisma.mealItem.update({
      where: { id: Number(itemId) },
      data: {
        dish: {
          connectOrCreate: {
            where: { name },
            create: {
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
            }
          }
        }
      },
      include: {
        dish: {
          include: {
            allergens: { include: { allergen: true } }
          }
        }
      }
    });

    return updatedItem;
  });

  // Eliminar plato específico
  server.delete("/menus/:menuId/meals/:mealId/items/:itemId", { preHandler: [authGuard] }, async (request, reply) => {
    const { itemId } = request.params as { itemId: string };

    // Solo eliminar el MealItem, el Dish permanece para ser reutilizado
    await prisma.mealItem.delete({
      where: { id: Number(itemId) }
    });

    return { message: "Plato eliminado correctamente" };
  });
}

