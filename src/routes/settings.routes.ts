import type { FastifyInstance } from "fastify";
import { authGuard } from "../middleware/auth";
import { prisma } from "../config/database";

export async function settingsRoutes(server: FastifyInstance) {
  // Obtener todas las configuraciones
  server.get("/settings", async (request, reply) => {
    try {
      const settings = await prisma.settings.findMany();
      
      // Convertir array de settings a objeto clave-valor
      const settingsObj = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>);
      
      return settingsObj;
    } catch (error) {
      console.error('❌ Error obteniendo configuraciones:', error);
      return reply.status(500).send({ 
        error: "Error al obtener configuraciones",
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // Obtener una configuración específica por clave
  server.get("/settings/:key", async (request, reply) => {
    const { key } = request.params as { key: string };
    
    try {
      const setting = await prisma.settings.findUnique({
        where: { key }
      });
      
      if (!setting) {
        return reply.status(404).send({ 
          error: "Configuración no encontrada",
          key 
        });
      }
      
      return { key: setting.key, value: setting.value };
    } catch (error) {
      console.error('❌ Error obteniendo configuración:', error);
      return reply.status(500).send({ 
        error: "Error al obtener configuración",
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // Actualizar o crear una configuración (protegido)
  server.put("/settings/:key", { preHandler: [authGuard] }, async (request, reply) => {
    const { key } = request.params as { key: string };
    const { value } = request.body as { value: string };
    
    try {
      const setting = await prisma.settings.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      });
      
      console.log(`✅ Configuración actualizada: ${key} = ${value}`);
      
      return { key: setting.key, value: setting.value };
    } catch (error) {
      console.error('❌ Error actualizando configuración:', error);
      return reply.status(500).send({ 
        error: "Error al actualizar configuración",
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // Actualizar múltiples configuraciones (protegido)
  server.post("/settings/bulk", { preHandler: [authGuard] }, async (request, reply) => {
    const settings = request.body as Record<string, string>;
    
    try {
      const results = await Promise.all(
        Object.entries(settings).map(([key, value]) =>
          prisma.settings.upsert({
            where: { key },
            update: { value },
            create: { key, value }
          })
        )
      );
      
      console.log(`✅ ${results.length} configuraciones actualizadas`);
      
      return { 
        message: "Configuraciones actualizadas",
        count: results.length 
      };
    } catch (error) {
      console.error('❌ Error actualizando configuraciones:', error);
      return reply.status(500).send({ 
        error: "Error al actualizar configuraciones",
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });
}

