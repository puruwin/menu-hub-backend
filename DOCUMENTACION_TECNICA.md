# Documentación Técnica - Menu Hub Backend

## 📋 Visión General

**Menu Hub Backend** es una API REST para la gestión de menús para las SKE con soporte para alérgenos, plantillas de platos reutilizables, y operaciones masivas de importación/exportación. Diseñada para funcionar en entornos de red local (ej: Raspberry Pi) con alta disponibilidad.


## 🛠 Stack Tecnológico

- **Runtime**: Node.js 18+
- **Framework**: Fastify 5.6.0
- **Lenguaje**: TypeScript 5.9.2
- **Base de datos**: SQLite con Prisma ORM 6.15.0
- **Autenticación**: JWT (jsonwebtoken)
- **Encriptación**: bcrypt

## 🏗 Arquitectura

### Estructura del Proyecto

```
menu-hub-backend/
├── src/
│   ├── config/          # Configuración de la aplicación
│   │   ├── constants.ts # Constantes globales
│   │   ├── cors.ts      # Configuración CORS
│   │   └── database.ts  # Cliente Prisma
│   ├── middleware/
│   │   └── auth.ts      # Guard de autenticación JWT
│   ├── routes/
│   │   ├── auth.routes.ts           # Endpoints de autenticación
│   │   ├── menu.routes.ts           # Endpoints de menús
│   │   └── plate-template.routes.ts # Endpoints de plantillas
│   ├── server.ts        # Punto de entrada principal
│   └── seed.ts          # Datos iniciales (seed)
├── prisma/
│   ├── schema.prisma    # Definición del modelo de datos
│   └── migrations/      # Migraciones de BD
└── dist/                # Código compilado (TypeScript → JavaScript)
```

### Patrón de Arquitectura

- **Arquitectura en capas**: Separación clara entre rutas, middleware y configuración
- **Inyección de dependencias**: El servidor Fastify se pasa como parámetro a los módulos de rutas
- **ORM**: Prisma Client para abstracción de base de datos con tipado fuerte

## 📊 Modelo de Datos

### Entidades Principales

#### User
Usuario del sistema (administradores)
```typescript
- id: Int (PK)
- username: String (unique)
- password: String (hash bcrypt)
```

#### Menu
Menú de un día específico
```typescript
- id: Int (PK)
- date: DateTime (unique)
- meals: Meal[] (relación 1:N)
```

#### Meal
Comida dentro de un menú (desayuno, almuerzo, cena)
```typescript
- id: Int (PK)
- type: MealType (enum: breakfast, lunch, dinner)
- menuId: Int (FK → Menu)
- items: MealItem[] (relación 1:N)
```

#### MealItem
Plato específico dentro de una comida
```typescript
- id: Int (PK)
- mealId: Int (FK → Meal)
- dishId: Int (FK → Dish)
```

#### Dish
Plato/receta reutilizable
```typescript
- id: Int (PK)
- name: String (unique)
- allergens: DishAllergen[] (relación N:N con Allergen)
- mealItems: MealItem[]
```

#### Allergen
Alérgeno del sistema
```typescript
- id: Int (PK)
- name: String (unique)
- dishes: DishAllergen[]
- plateTemplates: PlateTemplateAllergen[]
```

#### PlateTemplate
Plantilla de plato con alérgenos pre-configurados (para autocompletado)
```typescript
- id: Int (PK)
- name: String (unique)
- allergens: PlateTemplateAllergen[] (relación N:N con Allergen)
- usageCount: Int (contador de uso)
- createdAt: DateTime
- updatedAt: DateTime
```

### Relaciones

- `Menu` 1:N `Meal` - Un menú tiene múltiples comidas
- `Meal` 1:N `MealItem` - Una comida tiene múltiples platos
- `MealItem` N:1 `Dish` - Varios items pueden referenciar el mismo plato
- `Dish` N:N `Allergen` (a través de `DishAllergen`)
- `PlateTemplate` N:N `Allergen` (a través de `PlateTemplateAllergen`)

## 🔐 Autenticación y Seguridad

### Sistema de Autenticación

- **Método**: JWT (JSON Web Tokens)
- **Algoritmo**: HS256
- **Expiración**: 1 hora (configurable)
- **Storage de contraseñas**: bcrypt con salt rounds por defecto

### Middleware de Protección

**authGuard** (`src/middleware/auth.ts`)

```typescript
// Uso en rutas protegidas
server.post("/ruta-protegida", { preHandler: [authGuard] }, handler);
```

Valida:
1. Presencia del header `Authorization`
2. Formato `Bearer <token>`
3. Validez del token JWT
4. Agrega `request.user` con los datos decodificados

### Rutas Públicas vs Protegidas

**Públicas** (sin autenticación):
- `GET /menus/:date` - Consulta de menú por fecha
- `GET /menus` - Consulta de menús con rango de fechas
- `POST /auth/login` - Login de usuario

**Protegidas** (requieren JWT):
- Todas las operaciones de creación, actualización y eliminación
- Todas las rutas de `/plate-templates`

## 🌐 Configuración CORS

**Archivo**: `src/config/cors.ts`

### Estrategia de CORS

1. **Sin origin** (Postman, curl): Siempre permitido
2. **Desarrollo** (`NODE_ENV !== 'production'`):
   - `http://localhost:5173`
   - `http://127.0.0.1:5173`
   - `http://localhost:3000`
   - `http://127.0.0.1:3000`

3. **Producción**:
   - Orígenes en `CORS_ORIGINS` (separados por coma)
   - Red local (192.168.x.x, 10.x.x.x, 172.16-31.x.x) si `CORS_ORIGINS` está vacío

4. **Métodos permitidos**: GET, POST, PUT, DELETE, PATCH, OPTIONS
5. **Credentials**: Habilitado (`credentials: true`)

## 📡 API Reference

### Base URL
```
http://localhost:3000
```

---

## 🔑 Auth Endpoints

### POST `/auth/login`
Autenticación de usuario

**Request Body**:
```json
{
  "username": "admin",
  "password": "contraseña"
}
```

**Response**: `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errores**:
- `401` - Usuario no encontrado o contraseña incorrecta

---

### GET `/private`
Ruta de prueba para verificar autenticación

**Headers**: `Authorization: Bearer <token>`

**Response**: `200 OK`
```json
{
  "message": "Accediste al área privada 🚀"
}
```

---

## 📅 Menu Endpoints

### GET `/menus/:date`
Obtener menú de una fecha específica

**Params**:
- `date` - Fecha en formato ISO (YYYY-MM-DD)

**Response**: `200 OK`
```json
{
  "id": 1,
  "date": "2025-10-27T00:00:00.000Z",
  "meals": [
    {
      "id": 1,
      "type": "lunch",
      "items": [
        {
          "id": 1,
          "dish": {
            "id": 1,
            "name": "Paella Valenciana",
            "allergens": [
              {
                "allergen": { "name": "gluten" }
              },
              {
                "allergen": { "name": "crustaceos" }
              }
            ]
          }
        }
      ]
    }
  ]
}
```

**Errores**:
- `404` - Menú no encontrado para esa fecha

---

### GET `/menus`
Obtener menús con rango de fechas

**Query Params** (opcionales):
- `startDate` - Fecha de inicio (YYYY-MM-DD)
- `endDate` - Fecha de fin (YYYY-MM-DD)

Si no se proporcionan fechas, devuelve todos los menús.

**Response**: `200 OK` - Array de menús ordenados por fecha ascendente

---

### POST `/menus` 🔒
Crear nuevo menú

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "date": "2025-10-27",
  "meals": [
    {
      "type": "lunch",
      "items": [
        {
          "name": "Paella Valenciana",
          "allergens": ["gluten", "crustaceos"]
        },
        {
          "name": "Ensalada Mixta",
          "allergens": []
        }
      ]
    }
  ]
}
```

**Comportamiento**:
- Crea el menú con la fecha especificada
- Si el plato (`Dish`) no existe, lo crea automáticamente
- Si el alérgeno (`Allergen`) no existe, lo crea automáticamente
- Reutiliza platos existentes si ya están en la BD

**Response**: `200 OK` - Menú creado con todas sus relaciones

---

### PUT `/menus/:id` 🔒
Actualizar menú existente

**Headers**: `Authorization: Bearer <token>`

**Params**:
- `id` - ID del menú

**Request Body**: Igual que POST `/menus` (solo campo `meals`)

**Comportamiento**:
- Elimina todas las comidas y platos del menú
- Recrea las comidas con los nuevos datos

**Response**: `200 OK` - Menú actualizado

---

### DELETE `/menus/:id` 🔒
Eliminar un menú específico

**Headers**: `Authorization: Bearer <token>`

**Params**:
- `id` - ID del menú a eliminar

**Response**: `200 OK`
```json
{
  "message": "Menú eliminado ✅"
}
```

---

### DELETE `/menus/bulk-delete` 🔒
Borrado masivo de menús por rango de fechas

**Headers**: `Authorization: Bearer <token>`

**Query Params**:
- `startDate` - Fecha de inicio (YYYY-MM-DD)
- `endDate` - Fecha de fin (YYYY-MM-DD)

**Response**: `200 OK`
```json
{
  "message": "Menús borrados correctamente",
  "count": 15,
  "deletedMenus": ["2025-10-27", "2025-10-28", ...]
}
```

**Comportamiento**:
1. Normaliza las fechas (inicio a 00:00:00, fin a 23:59:59)
2. Busca menús en el rango
3. Elimina `MealItems` → `Meals` → `Menus` en cascada
4. Los `Dishes` y `Allergens` se mantienen para reutilización

---

### POST `/menus/bulk-import` 🔒
Importación masiva de menús

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "startDate": "2025-10-27",
  "menuData": {
    "weeks": [
      {
        "week": 0,
        "days": [
          {
            "day": "LUN",
            "meals": [
              {
                "type": "lunch",
                "items": [
                  {
                    "name": "Paella Valenciana",
                    "allergens": ["gluten", "crustaceos"]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**Días válidos**: `LUN`, `MAR`, `MIE`, `JUE`, `VIE`, `SAB_DOM`

**Comportamiento**:
1. Calcula las fechas automáticamente a partir de `startDate`
2. `week: 0` = primera semana, `week: 1` = segunda semana, etc.
3. Omite menús que ya existen en la BD (no sobrescribe)
4. Crea/actualiza automáticamente `PlateTemplates` con contador de uso
5. Crea `Dishes` y `Allergens` si no existen

**Response**: `200 OK`
```json
{
  "message": "Importación completada",
  "count": 25,
  "skipped": 5,
  "errors": 0,
  "templatesCreated": 15,
  "templatesUpdated": 10,
  "details": {
    "created": 25,
    "skipped": ["2025-10-27", "2025-10-28"],
    "errors": []
  }
}
```

---

### POST `/menus/:menuId/meals` 🔒
Agregar comida completa a un menú existente

**Headers**: `Authorization: Bearer <token>`

**Params**:
- `menuId` - ID del menú

**Request Body**:
```json
{
  "type": "dinner",
  "items": [
    {
      "name": "Sopa de Verduras",
      "allergens": ["apio"]
    }
  ]
}
```

**Response**: `200 OK` - Comida creada con sus items

---

### POST `/menus/:menuId/meals/:mealId/items` 🔒
Agregar un plato a una comida específica

**Headers**: `Authorization: Bearer <token>`

**Params**:
- `menuId` - ID del menú
- `mealId` - ID de la comida

**Request Body**:
```json
{
  "name": "Gazpacho Andaluz",
  "allergens": ["sulfitos"]
}
```

**Response**: `200 OK` - MealItem creado

**Errores**:
- `404 MENU_NOT_FOUND` - El menú no existe
- `404 MEAL_NOT_FOUND` - La comida no existe o no pertenece al menú

---

### PUT `/menus/:menuId/meals/:mealId/items/:itemId` 🔒
Actualizar un plato específico

**Headers**: `Authorization: Bearer <token>`

**Params**:
- `menuId` - ID del menú
- `mealId` - ID de la comida
- `itemId` - ID del item a actualizar

**Request Body**:
```json
{
  "name": "Nuevo nombre del plato",
  "allergens": ["lacteos", "gluten"]
}
```

**Comportamiento**:
- Actualiza el `MealItem` para que apunte a un `Dish` diferente
- Si el `Dish` con ese nombre no existe, lo crea
- No modifica el `Dish` original si ya existía

**Response**: `200 OK` - Item actualizado

---

### DELETE `/menus/:menuId/meals/:mealId/items/:itemId` 🔒
Eliminar un plato específico de una comida

**Headers**: `Authorization: Bearer <token>`

**Params**:
- `menuId` - ID del menú
- `mealId` - ID de la comida
- `itemId` - ID del item a eliminar

**Comportamiento**:
- Solo elimina el `MealItem` (relación)
- El `Dish` permanece en la BD para reutilización

**Response**: `200 OK`
```json
{
  "message": "Plato eliminado correctamente"
}
```

---

## 🍽️ Plate Template Endpoints

### GET `/plate-templates/search` 🔒
Buscar plantillas de platos para autocompletado

**Headers**: `Authorization: Bearer <token>`

**Query Params**:
- `query` - Término de búsqueda (mínimo 2 caracteres)

**Response**: `200 OK`
```json
[
  {
    "id": 1,
    "name": "Paella Valenciana",
    "allergens": ["gluten", "crustaceos"],
    "usageCount": 25
  },
  {
    "id": 2,
    "name": "Paella de Verduras",
    "allergens": ["gluten"],
    "usageCount": 15
  }
]
```

**Ordenamiento**:
1. Por `usageCount` descendente (más usados primero)
2. Por `name` alfabético

**Límite**: 10 resultados

---

### GET `/plate-templates` 🔒
Obtener todas las plantillas de platos

**Headers**: `Authorization: Bearer <token>`

**Response**: `200 OK` - Array de plantillas ordenadas por uso

---

### POST `/plate-templates` 🔒
Crear o actualizar plantilla de plato

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "name": "Paella Valenciana",
  "allergens": ["gluten", "crustaceos"]
}
```

**Comportamiento**:
- Si la plantilla existe: actualiza alérgenos e incrementa `usageCount`
- Si no existe: crea nueva plantilla con `usageCount = 1`
- Normaliza el nombre (`trim()`)

**Response**: `200 OK` - Plantilla creada/actualizada

**Errores**:
- `400` - Nombre de plato vacío

---

### POST `/plate-templates/:id/use` 🔒
Incrementar contador de uso de una plantilla

**Headers**: `Authorization: Bearer <token>`

**Params**:
- `id` - ID de la plantilla

**Response**: `200 OK`
```json
{
  "message": "Contador actualizado"
}
```

**Uso**: Llamar este endpoint cuando se use una plantilla en el frontend

---

## ⚙️ Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```env
# Base de datos
DATABASE_URL="file:./prisma/dev.db"

# JWT
JWT_SECRET="tu_clave_secreta_super_segura_aqui"

# Servidor
NODE_ENV="development"  # o "production"

# CORS (separados por coma, sin espacios)
CORS_ORIGINS="http://192.168.1.100:5173,http://192.168.1.100:3000"
```

### Constantes Configurables

**Archivo**: `src/config/constants.ts`

```typescript
JWT_SECRET        // Clave para firmar tokens JWT
JWT_EXPIRATION    // "1h" - Tiempo de expiración del token
SERVER_PORT       // 3000 - Puerto del servidor
SERVER_HOST       // "0.0.0.0" - Host del servidor (0.0.0.0 para escuchar en todas las interfaces)
```

---

## 🚀 Instalación y Ejecución

### Requisitos Previos

- Node.js 18 o superior
- npm o yarn

### Instalación

```bash
# Clonar repositorio
git clone <repo-url>
cd menu-hub-backend

# Instalar dependencias
npm install

# Configurar base de datos
npx prisma generate
npx prisma migrate deploy

# (Opcional) Cargar datos de prueba
npm run seed
```

### Ejecución

**Desarrollo** (con hot-reload):
```bash
npm run dev
```

**Producción**:
```bash
# Compilar TypeScript
npm run build

# Ejecutar
npm start
```

### Scripts Disponibles

```json
{
  "dev": "tsx watch src/server.ts",         // Desarrollo con hot-reload
  "build": "tsc",                           // Compilar TypeScript
  "start": "node dist/server.js",           // Ejecutar producción
  "seed": "node dist/seed.js"               // Poblar BD con datos iniciales
}
```

---

## 🗄️ Gestión de Base de Datos

### Migraciones

```bash
# Crear nueva migración
npx prisma migrate dev --name nombre_de_migracion

# Aplicar migraciones (producción)
npx prisma migrate deploy

# Resetear base de datos (¡cuidado!)
npx prisma migrate reset
```

### Prisma Studio

```bash
# Abrir interfaz visual de la BD
npx prisma studio
```

---

## 🐋 Despliegue con Docker

### Docker Compose (Desarrollo)

```bash
docker-compose -f docker-compose.dev.yml up
```

### Docker Compose (Producción)

```bash
docker-compose up -d
```

---

## 📝 Notas de Desarrollo

### Modelo de Reutilización de Platos

El sistema implementa un modelo inteligente de reutilización:

1. **Dishes** son entidades únicas y reutilizables
2. **MealItems** son referencias a `Dishes` dentro de comidas específicas
3. Al actualizar un `MealItem`, se puede cambiar su referencia a otro `Dish` sin afectar el original
4. Los `Dishes` nunca se eliminan automáticamente (solo se eliminan `MealItems`)

### Gestión de Plantillas

Las `PlateTemplates` son una capa de optimización:
- Permiten autocompletado rápido en el frontend
- Mantienen estadísticas de uso (`usageCount`)
- Se actualizan automáticamente durante importaciones masivas
- Son independientes de `Dishes` (pueden existir sin estar asociados a menús)

### Manejo de Fechas

- **Almacenamiento**: DateTime UTC en SQLite
- **Normalización**: Siempre se normalizan a medianoche (00:00:00)
- **Formato API**: ISO 8601 (`YYYY-MM-DD` o `YYYY-MM-DDTHH:mm:ss.sssZ`)
- **Unicidad**: Un menú por fecha (constraint único en `Menu.date`)

### Transaccionalidad

Prisma maneja transacciones automáticamente en operaciones anidadas:
```typescript
// Esto es una transacción atómica
await prisma.menu.create({
  data: {
    date: new Date(),
    meals: {
      create: [...]  // Se crea todo o nada
    }
  }
});
```

### Gestión de Errores

El código incluye manejo de errores en endpoints críticos:
- Logs descriptivos en consola con emojis (🚀, ✅, ❌, ⚠️)
- Respuestas estructuradas con códigos de error
- Stack traces en desarrollo

---

## 🔧 Extensibilidad

### Agregar Nuevo Endpoint

1. Crear handler en el archivo de rutas correspondiente
2. Agregar middleware `authGuard` si es necesario
3. Usar tipos de Prisma para el tipado
4. Documentar en este archivo

### Agregar Nueva Entidad

1. Actualizar `prisma/schema.prisma`
2. Crear migración: `npx prisma migrate dev`
3. Actualizar seed si es necesario
4. Crear endpoints CRUD en nueva ruta

### Personalizar CORS

Modificar `src/config/cors.ts` según necesidades:
- Agregar nuevos patrones de red
- Modificar lógica de desarrollo/producción
- Agregar headers personalizados

---

## 📚 Referencias

- **Fastify Docs**: https://fastify.dev/
- **Prisma Docs**: https://www.prisma.io/docs
- **JWT**: https://jwt.io/
- **bcrypt**: https://github.com/kelektiv/node.bcrypt.js

---

## 🐛 Debugging

### Logs del Sistema

El servidor emite logs informativos:
```
🚀 Servidor escuchando en http://0.0.0.0:3000
🌍 CORS Configuration:
  - Environment: development
  - Is Development: true
  - Allowed Origins: []
```

### Verificar JWT

```bash
# En el navegador o Node.js
const decoded = jwt.decode(token);
console.log(decoded);
```

### Prisma Debug

```bash
# Ver queries SQL generadas
DATABASE_URL="file:./prisma/dev.db" npx prisma studio
```

---

**Última actualización**: Octubre 2025  
**Versión del proyecto**: 1.0.0

