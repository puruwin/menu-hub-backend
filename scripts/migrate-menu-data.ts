import { PrismaClient, MealType } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface MenuItem {
  name: string;
  allergens: string[];
}

interface Meal {
  type: 'breakfast' | 'lunch' | 'dinner';
  items: MenuItem[];
}

interface Day {
  day: string;
  meals: Meal[];
}

interface Week {
  week: number;
  days: Day[];
}

interface MenuData {
  allergens: string[];
  weeks: Week[];
}

// Mapeo de días de la semana en español a números
const dayMap: Record<string, number> = {
  'LUN': 1, 'MAR': 2, 'MIE': 3, 'JUE': 4, 'VIE': 5, 'SAB_DOM': 6
};

async function migrateMenuData(
  menuDataPath: string,
  startDate: Date,
  options: {
    deleteExisting?: boolean;
    deleteDateRange?: { start: Date; end: Date };
  } = {}
) {
  try {
    console.log('🚀 Iniciando migración de datos del menú...');
    console.log('📄 Archivo:', menuDataPath);
    console.log('📅 Fecha de inicio:', startDate.toISOString().split('T')[0]);

    // Leer el archivo JSON
    if (!fs.existsSync(menuDataPath)) {
      throw new Error(`No se encontró el archivo: ${menuDataPath}`);
    }

    const fileContent = fs.readFileSync(menuDataPath, 'utf-8');
    const menuData: MenuData = JSON.parse(fileContent);

    console.log('📊 Semanas en JSON:', menuData.weeks.length);

    // Opción: Borrar menús existentes
    if (options.deleteExisting) {
      console.log('🗑️  Borrando todos los menús existentes...');
      const deleteResult = await prisma.menu.deleteMany({});
      console.log(`   ✅ ${deleteResult.count} menús eliminados`);
    } else if (options.deleteDateRange) {
      console.log('🗑️  Borrando menús en el rango de fechas...');
      const deleteResult = await prisma.menu.deleteMany({
        where: {
          date: {
            gte: options.deleteDateRange.start,
            lte: options.deleteDateRange.end
          }
        }
      });
      console.log(`   ✅ ${deleteResult.count} menús eliminados en el rango`);
    }

    // Normalizar fecha de inicio a medianoche UTC
    const startDateObj = new Date(startDate);
    startDateObj.setUTCHours(0, 0, 0, 0);

    const createdMenus: any[] = [];
    const skippedMenus: string[] = [];
    const errors: string[] = [];
    let templatesCreated = 0;
    let templatesUpdated = 0;

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

    console.log('\n📊 Resumen de migración:');
    console.log(`   ✅ Menús creados: ${createdMenus.length}`);
    console.log(`   ⏭️  Menús omitidos (ya existían): ${skippedMenus.length}`);
    console.log(`   🍽️  Plantillas de platos creadas: ${templatesCreated}`);
    console.log(`   🔄 Plantillas de platos actualizadas: ${templatesUpdated}`);
    console.log(`   ❌ Errores: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n⚠️  Errores encontrados:');
      errors.forEach(error => console.log(`   - ${error}`));
    }

    return {
      success: true,
      created: createdMenus.length,
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
    console.error('❌ Error crítico en migración:', error);
    throw error;
  }
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  
  // Parsear argumentos
  let startDate: Date | null = null;
  let deleteExisting = false;
  let menuDataPath = path.join(__dirname, '..', 'menu_data.json');

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--start-date' || arg === '-d') {
      const dateStr = args[++i];
      if (dateStr) {
        startDate = new Date(dateStr);
      }
    } else if (arg === '--delete-existing' || arg === '--delete') {
      deleteExisting = true;
    } else if (arg === '--file' || arg === '-f') {
      const filePath = args[++i];
      if (filePath) {
        menuDataPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
      }
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Uso: npx tsx scripts/migrate-menu-data.ts [opciones]

Opciones:
  --start-date, -d <fecha>    Fecha de inicio en formato YYYY-MM-DD (requerido)
  --delete-existing, --delete Borrar todos los menús existentes antes de importar
  --file, -f <ruta>           Ruta al archivo menu_data.json (por defecto: ./menu_data.json)
  --help, -h                   Mostrar esta ayuda

Ejemplos:
  npx tsx scripts/migrate-menu-data.ts --start-date 2025-01-13
  npx tsx scripts/migrate-menu-data.ts --start-date 2025-01-13 --delete-existing
  npx tsx scripts/migrate-menu-data.ts -d 2025-01-13 -f ./menu_data.json
      `);
      process.exit(0);
    }
  }

  // Validar fecha de inicio
  if (!startDate || isNaN(startDate.getTime())) {
    console.error('❌ Error: Se requiere una fecha de inicio válida (--start-date YYYY-MM-DD)');
    console.log('   Ejemplo: npx tsx scripts/migrate-menu-data.ts --start-date 2025-01-13');
    process.exit(1);
  }

  try {
    const result = await migrateMenuData(menuDataPath, startDate, {
      deleteExisting
    });

    if (result.success) {
      console.log('\n✅ Migración completada exitosamente!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Migración completada con errores');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error en la migración:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si es el script principal
if (require.main === module) {
  main();
}

export { migrateMenuData };


