import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authGuard } from "../middleware/auth";
import { prisma } from "../config/database";

export async function plateTemplateRoutes(server: FastifyInstance) {
  // Buscar plantillas de platos por nombre (para autocompletado)
  server.get("/plate-templates/search", { preHandler: [authGuard] }, async (request, reply) => {
    const { query } = request.query as { query: string };
    
    try {
      if (!query || query.trim().length < 2) {
        return [];
      }

      const templates = await prisma.plateTemplate.findMany({
        where: {
          name: {
            contains: query.trim()
          }
        },
        include: {
          allergens: {
            include: {
              allergen: true
            }
          }
        },
        orderBy: [
          { usageCount: 'desc' },
          { name: 'asc' }
        ],
        take: 10
      });

      // Transformar el formato para el frontend
      return templates.map(template => ({
        id: template.id,
        name: template.name,
        allergens: template.allergens.map(a => a.allergen.name),
        usageCount: template.usageCount
      }));
    } catch (error) {
      console.error('Error buscando plantillas:', error);
      return reply.status(500).send({
        error: "Error al buscar plantillas de platos",
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // Obtener todas las plantillas de platos (ordenadas por uso)
  server.get("/plate-templates", { preHandler: [authGuard] }, async (request, reply) => {
    try {
      const templates = await prisma.plateTemplate.findMany({
        include: {
          allergens: {
            include: {
              allergen: true
            }
          }
        },
        orderBy: [
          { usageCount: 'desc' },
          { name: 'asc' }
        ]
      });

      return templates.map(template => ({
        id: template.id,
        name: template.name,
        allergens: template.allergens.map(a => a.allergen.name),
        usageCount: template.usageCount,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      }));
    } catch (error) {
      console.error('Error obteniendo plantillas:', error);
      return reply.status(500).send({
        error: "Error al obtener plantillas de platos",
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // Crear o actualizar una plantilla de plato
  server.post("/plate-templates", { preHandler: [authGuard] }, async (request, reply) => {
    const { name, allergens } = request.body as { name: string; allergens: string[] };

    try {
      if (!name || name.trim().length === 0) {
        return reply.status(400).send({
          error: "El nombre del plato es requerido"
        });
      }

      const normalizedName = name.trim();

      // Verificar si ya existe una plantilla con ese nombre
      const existingTemplate = await prisma.plateTemplate.findUnique({
        where: { name: normalizedName }
      });

      if (existingTemplate) {
        // Actualizar la plantilla existente
        await prisma.plateTemplateAllergen.deleteMany({
          where: { plateTemplateId: existingTemplate.id }
        });

        const updatedTemplate = await prisma.plateTemplate.update({
          where: { id: existingTemplate.id },
          data: {
            allergens: {
              create: allergens.map(allergenName => ({
                allergen: {
                  connectOrCreate: {
                    where: { name: allergenName },
                    create: { name: allergenName }
                  }
                }
              }))
            },
            usageCount: { increment: 1 },
            updatedAt: new Date()
          },
          include: {
            allergens: {
              include: {
                allergen: true
              }
            }
          }
        });

        return {
          id: updatedTemplate.id,
          name: updatedTemplate.name,
          allergens: updatedTemplate.allergens.map(a => a.allergen.name),
          usageCount: updatedTemplate.usageCount
        };
      } else {
        // Crear nueva plantilla
        const newTemplate = await prisma.plateTemplate.create({
          data: {
            name: normalizedName,
            usageCount: 1,
            allergens: {
              create: allergens.map(allergenName => ({
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
            allergens: {
              include: {
                allergen: true
              }
            }
          }
        });

        return {
          id: newTemplate.id,
          name: newTemplate.name,
          allergens: newTemplate.allergens.map(a => a.allergen.name),
          usageCount: newTemplate.usageCount
        };
      }
    } catch (error) {
      console.error('Error creando/actualizando plantilla:', error);
      return reply.status(500).send({
        error: "Error al guardar la plantilla de plato",
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // Incrementar contador de uso de una plantilla
  server.post("/plate-templates/:id/use", { preHandler: [authGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      await prisma.plateTemplate.update({
        where: { id: Number(id) },
        data: {
          usageCount: { increment: 1 }
        }
      });

      return { message: "Contador actualizado" };
    } catch (error) {
      console.error('Error actualizando contador:', error);
      return reply.status(500).send({
        error: "Error al actualizar contador de uso",
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });
}

