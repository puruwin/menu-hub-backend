import { PrismaClient } from "@prisma/client";

// Instancia única de Prisma para toda la aplicación
export const prisma = new PrismaClient();

