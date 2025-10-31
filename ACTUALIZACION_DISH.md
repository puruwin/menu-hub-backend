# Actualización: Sistema de Platos Únicos (Dish)

## ✅ Cambios Realizados

### 1. Schema de Prisma Actualizado
Se ha creado una nueva tabla `Dish` para almacenar platos únicos con sus alérgenos:

- **Tabla Dish**: Almacena los nombres únicos de platos (ej: "Aguacate")
- **Tabla DishAllergen**: Relaciona platos con sus alérgenos
- **MealItem actualizado**: Ahora hace referencia a un Dish en lugar de tener el nombre directamente

### 2. Migración de Datos Completada
✅ Se ha migrado la base de datos exitosamente:
- 483 registros de MealItem migrados
- Nombres de platos únicos extraídos y almacenados en la tabla Dish
- Alérgenos migrados de MealItemAllergen a DishAllergen
- Todos los MealItems actualizados para referenciar sus respectivos Dishes

### 3. Código del Servidor Actualizado
Todos los endpoints han sido actualizados para usar la nueva estructura:

- ✅ GET `/menus/:date` - Obtener menú por fecha
- ✅ POST `/menus` - Crear menú
- ✅ GET `/menus` - Obtener menús por rango de fechas
- ✅ PUT `/menus/:id` - Actualizar menú
- ✅ POST `/menus/:menuId/meals/:mealId/items` - Agregar plato
- ✅ PUT `/menus/:menuId/meals/:mealId/items/:itemId` - Actualizar plato
- ✅ DELETE `/menus/:menuId/meals/:mealId/items/:itemId` - Eliminar plato
- ✅ POST `/menus/:menuId/meals` - Agregar comida completa
- ✅ DELETE `/menus/bulk-delete` - Borrado masivo
- ✅ POST `/menus/bulk-create` - Creación masiva

## 🔧 Pasos para Completar la Actualización

### Paso 1: Detener el Servidor
```powershell
# Detén el servidor backend si está corriendo
# (Ctrl+C en la terminal donde está corriendo)
```

### Paso 2: Regenerar el Cliente de Prisma
```powershell
cd C:\Users\ah_admin\Code\menu-hub-backend
npx prisma generate
```

### Paso 3: Reiniciar el Servidor
```powershell
npm run dev
# o
npm start
```

## 🎯 Beneficios de los Cambios

### Antes:
- Cada instancia de "Aguacate" era un registro separado en la BD
- Duplicación masiva de datos
- Alérgenos duplicados por cada plato

### Ahora:
- "Aguacate" existe UNA SOLA VEZ en la tabla Dish
- Todos los MealItems que usan "Aguacate" referencian el mismo Dish
- Los alérgenos se gestionan a nivel de Dish (no de MealItem)
- Base de datos más limpia y eficiente

## 📊 Comportamiento del Sistema

### Al Crear/Actualizar un Plato:
El sistema usa `connectOrCreate`:
1. Si el plato "Aguacate" ya existe → lo reutiliza
2. Si no existe → lo crea con sus alérgenos
3. El MealItem apunta al Dish correspondiente

### Al Eliminar un Plato de un Menú:
- Solo se elimina el MealItem (la instancia en ese menú)
- El Dish permanece en la BD para ser reutilizado en futuros menús

### Gestión de Alérgenos:
- Los alérgenos están asociados al Dish, no al MealItem
- Si cambias un plato de "Aguacate" a "Aguacate con sal", se conecta/crea un nuevo Dish
- No se modifican Dishes existentes para evitar efectos colaterales

## 🔍 Verificación

Después de reiniciar el servidor, verifica que:
1. ✅ El servidor inicia sin errores
2. ✅ Puedes ver los menús existentes (GET /menus)
3. ✅ Puedes crear nuevos platos
4. ✅ Los platos duplicados ya no se crean (revisa la tabla Dish en la BD)

## 🎨 Actualización del Frontend

### Cambios Realizados
✅ Actualizado `menuService.ts` para manejar la nueva estructura de datos
- La función `transformMealItem` ahora accede a `item.dish.name` y `item.dish.allergens`
- Mantiene retrocompatibilidad con datos antiguos

### Estructura de Respuesta del Backend

**Antes:**
```json
{
  "id": 1,
  "name": "Aguacate",
  "allergens": [
    { "allergen": { "name": "gluten" } }
  ]
}
```

**Ahora:**
```json
{
  "id": 1,
  "dish": {
    "id": 5,
    "name": "Aguacate",
    "allergens": [
      { "allergen": { "name": "gluten" } }
    ]
  }
}
```

### ¿Necesita Actualizar el Frontend?
✅ **NO** - Los cambios ya están aplicados en `menuService.ts`
- El resto de componentes continúan funcionando sin cambios
- La capa de transformación maneja la nueva estructura automáticamente

## 📝 Notas Técnicas

- **Base de datos**: SQLite (./prisma/prisma/dev.db)
- **Migración aplicada**: `20251027_add_dish_table`
- **Compatibilidad**: Los datos existentes se preservaron completamente
- **Frontend**: ✅ Actualizado y compatible con la nueva estructura
- **Retrocompatibilidad**: El código maneja tanto la estructura antigua como la nueva

