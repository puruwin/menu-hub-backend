import Fastify from "fastify";
import { setupCors } from "./config/cors";
import { SERVER_HOST, SERVER_PORT } from "./config/constants";
import { authRoutes } from "./routes/auth.routes";
import { menuRoutes } from "./routes/menu.routes";
import { plateTemplateRoutes } from "./routes/plate-template.routes";
import { menuTemplateRoutes } from "./routes/menu-template.routes";
import { prisma } from "./config/database";

// Inicializar servidor
const server = Fastify({
  ignoreTrailingSlash: true // Evita redirecciones 301 por trailing slash
});

// Configurar servidor
async function setupServer() {
  await setupCors(server);
}

// Registrar rutas
async function registerRoutes() {
  await authRoutes(server);
  await menuRoutes(server);
  await plateTemplateRoutes(server);
  await menuTemplateRoutes(server);
}

// Iniciar servidor
async function start() {
  try {
    await setupServer();
    await registerRoutes();
    
    await server.listen({ port: SERVER_PORT, host: SERVER_HOST });
    console.log(`🚀 Servidor escuchando en http://${SERVER_HOST}:${SERVER_PORT}`);
  } catch (err) {
    console.error('❌ Error iniciando servidor:', err);
    process.exit(1);
  }
}

// Manejo de cierre limpio
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM recibido, cerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT recibido, cerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});

// Iniciar aplicación
start();
