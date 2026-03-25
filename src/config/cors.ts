import type { FastifyInstance } from "fastify";

export async function setupCors(server: FastifyInstance) {
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
          'http://127.0.0.1:3000',
          'http://localhost:5174',
          'http://127.0.0.1:5174',
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
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
  });
}

