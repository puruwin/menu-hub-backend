# Estructura del Proyecto - Menu Hub Backend

## 📁 Organización del Código

El proyecto ha sido refactorizado para mejorar la mantenibilidad y escalabilidad. A continuación se describe la nueva estructura:

```
src/
├── config/              # Configuración del servidor
│   ├── constants.ts     # Constantes globales (JWT_SECRET, puertos, etc.)
│   ├── cors.ts          # Configuración de CORS
│   └── database.ts      # Instancia compartida de Prisma Client
│
├── middleware/          # Middlewares de Fastify
│   └── auth.ts          # Middleware de autenticación JWT
│
├── routes/              # Rutas organizadas por dominio
│   ├── auth.routes.ts           # Rutas de autenticación (/auth/*)
│   ├── menu.routes.ts           # Rutas de menús (/menus/*)
│   └── plate-template.routes.ts # Rutas de plantillas (/plate-templates/*)
│
└── server.ts            # Punto de entrada principal
```

## 📦 Módulos

### `src/config/`
Contiene toda la configuración del servidor:
- **constants.ts**: Variables de configuración como JWT_SECRET, puertos, etc.
- **cors.ts**: Lógica completa de configuración de CORS con reglas para desarrollo y producción
- **database.ts**: Instancia única y compartida de Prisma Client para evitar múltiples conexiones

### `src/middleware/`
Middlewares reutilizables:
- **auth.ts**: Middleware `authGuard` para proteger rutas que requieren autenticación

### `src/routes/`
Rutas organizadas por dominio funcional:

#### `auth.routes.ts`
- `POST /auth/login` - Autenticación de usuarios
- `GET /private` - Ruta de prueba protegida

#### `menu.routes.ts`
- `GET /menus` - Obtener menús por rango de fechas
- `GET /menus/:date` - Obtener menú por fecha específica
- `POST /menus` - Crear nuevo menú
- `PUT /menus/:id` - Actualizar menú existente
- `DELETE /menus/:id` - Eliminar menú
- `DELETE /menus/bulk-delete` - Borrado masivo por fechas
- `POST /menus/bulk-import` - Importación masiva de menús
- `POST /menus/:menuId/meals` - Agregar comida a un menú
- `POST /menus/:menuId/meals/:mealId/items` - Agregar plato a una comida
- `PUT /menus/:menuId/meals/:mealId/items/:itemId` - Actualizar plato
- `DELETE /menus/:menuId/meals/:mealId/items/:itemId` - Eliminar plato

#### `plate-template.routes.ts`
- `GET /plate-templates` - Obtener todas las plantillas
- `GET /plate-templates/search` - Buscar plantillas (autocompletado)
- `POST /plate-templates` - Crear o actualizar plantilla
- `POST /plate-templates/:id/use` - Incrementar contador de uso

### `src/server.ts`
Archivo principal que:
1. Inicializa Fastify y Prisma
2. Configura CORS
3. Registra todas las rutas
4. Inicia el servidor
5. Maneja el cierre limpio de la aplicación

## 🔄 Beneficios de la Refactorización

1. **Separación de responsabilidades**: Cada archivo tiene un propósito claro
2. **Mantenibilidad**: Más fácil encontrar y modificar código específico
3. **Escalabilidad**: Fácil agregar nuevas rutas o middlewares
4. **Legibilidad**: Archivos más pequeños y enfocados (~200-600 líneas)
5. **Testabilidad**: Módulos independientes más fáciles de testear
6. **Reutilización**: Middleware y configuración compartibles

## 🚀 Cómo Agregar Nuevas Funcionalidades

### Agregar una nueva ruta
1. Crear archivo en `src/routes/` (ej: `user.routes.ts`)
2. Exportar función que registre las rutas
3. Importar y registrar en `src/server.ts`

```typescript
// src/routes/user.routes.ts
export async function userRoutes(server: FastifyInstance) {
  server.get("/users", async () => { /* ... */ });
}

// src/server.ts
import { userRoutes } from "./routes/user.routes.js";

async function registerRoutes() {
  await userRoutes(server);
  // ...
}
```

### Agregar un nuevo middleware
1. Crear función en `src/middleware/` o en archivo existente
2. Exportar e importar donde sea necesario

### Agregar configuración
1. Agregar constante en `src/config/constants.ts`
2. O crear nuevo archivo de config si es complejo

## 📝 Notas Importantes

- Los imports relativos **NO** requieren extensión (gracias a `moduleResolution: bundler`)
- Se usa una instancia única de Prisma Client exportada desde `config/database.ts` para optimizar conexiones
- Las rutas protegidas usan `{ preHandler: [authGuard] }`
- Los logs del servidor usan emojis para mejor visibilidad
- Al crear relaciones en Prisma, se usa `meal: { connect: ... }` en lugar de `mealId` directamente para permitir relaciones anidadas
- La configuración de TypeScript usa `module: ESNext` para máxima compatibilidad
- En desarrollo se usa `tsx watch` que recarga automáticamente al guardar cambios

### ¿Por qué tsx y no ts-node?

El proyecto usa `"type": "module"` en `package.json` (módulos ESM nativos de Node.js). Con ESM:

- **ts-node**: Requiere extensiones `.js` en imports relativos (complicado)
- **tsx**: Resuelve imports automáticamente sin extensiones (simple) ✅

Además, `tsx watch` tiene **recarga automática** en desarrollo.

