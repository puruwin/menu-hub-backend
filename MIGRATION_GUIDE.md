# Guía de Migración de Datos del Menú

Esta guía explica cómo migrar los datos del menú desde el archivo `menu_data.json` a la base de datos.

## Prerrequisitos

1. Asegúrate de que la base de datos esté configurada y accesible
2. Verifica que el archivo `menu_data.json` existe y tiene el formato correcto
3. Asegúrate de tener las variables de entorno configuradas (especialmente `DATABASE_URL`)

## Uso del Script de Migración

El script `scripts/migrate-menu-data.ts` permite cargar los datos del menú desde el archivo JSON a la base de datos.

### Sintaxis Básica

```bash
npx tsx scripts/migrate-menu-data.ts --start-date YYYY-MM-DD
```

### Opciones Disponibles

- `--start-date` o `-d <fecha>`: **Requerido**. Fecha de inicio en formato YYYY-MM-DD. Esta fecha será el punto de partida para calcular las fechas de todos los menús basándose en las semanas del JSON.

- `--delete-existing` o `--delete`: Opcional. Si se especifica, borrará todos los menús existentes en la base de datos antes de importar los nuevos datos.

- `--file` o `-f <ruta>`: Opcional. Ruta al archivo `menu_data.json`. Por defecto usa `./menu_data.json`.

- `--help` o `-h`: Muestra la ayuda del script.

### Ejemplos

#### Migración básica (sin borrar datos existentes)
```bash
npx tsx scripts/migrate-menu-data.ts --start-date 2025-01-13
```

Este comando:
- Cargará los datos desde `menu_data.json`
- Usará el 13 de enero de 2025 como fecha de inicio
- Omitirá cualquier menú que ya exista para esas fechas
- Creará nuevos menús para las fechas que no existan

#### Migración con borrado de datos existentes
```bash
npx tsx scripts/migrate-menu-data.ts --start-date 2025-01-13 --delete-existing
```

Este comando:
- **Borrará todos los menús existentes** en la base de datos
- Cargará los nuevos datos desde `menu_data.json`
- Creará todos los menús desde cero

#### Migración con archivo personalizado
```bash
npx tsx scripts/migrate-menu-data.ts --start-date 2025-01-13 --file ./menu_data_v2.0.json
```

## Cómo Funciona

1. **Lectura del JSON**: El script lee el archivo `menu_data.json` y parsea su estructura.

2. **Cálculo de Fechas**: 
   - La semana 0 se mapea a la fecha de inicio
   - La semana 1 se mapea a 7 días después de la fecha de inicio
   - Y así sucesivamente
   - Los días se mapean así:
     - LUN → Lunes
     - MAR → Martes
     - MIE → Miércoles
     - JUE → Jueves
     - VIE → Viernes
     - SAB_DOM → Sábado

3. **Creación de Plantillas**: Antes de crear los menús, el script crea o actualiza las plantillas de platos (`PlateTemplate`) con sus alérgenos asociados.

4. **Creación de Menús**: Para cada día con comidas, se crea un registro `Menu` con sus `Meal` (desayuno, comida, cena) y `MealItem` asociados.

5. **Creación de Platos**: Los platos (`Dish`) se crean automáticamente si no existen, junto con sus alérgenos.

## Estructura del JSON

El archivo `menu_data.json` debe tener la siguiente estructura:

```json
{
  "allergens": [],
  "weeks": [
    {
      "week": 0,
      "days": [
        {
          "day": "LUN",
          "meals": [
            {
              "type": "breakfast",
              "items": [
                {
                  "name": "Nombre del plato",
                  "allergens": []
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## Consideraciones Importantes

1. **Fecha de Inicio**: Asegúrate de usar la fecha correcta. Esta fecha será el lunes de la semana 0.

2. **Datos Existentes**: Por defecto, el script **no borra** menús existentes. Si un menú ya existe para una fecha, se omitirá. Si necesitas reemplazar todos los datos, usa `--delete-existing`.

3. **Plantillas de Platos**: Las plantillas se crean o actualizan automáticamente. El contador de uso (`usageCount`) se incrementa cada vez que se usa un plato.

4. **Alérgenos**: Los alérgenos se crean automáticamente si no existen.

5. **Errores**: Si hay errores durante la migración, el script continuará procesando los demás días y mostrará un resumen al final.

## Resumen de la Migración

Al finalizar, el script mostrará:
- ✅ Número de menús creados
- ⏭️ Número de menús omitidos (ya existían)
- 🍽️ Número de plantillas de platos creadas
- 🔄 Número de plantillas actualizadas
- ❌ Número de errores (si los hay)

## Solución de Problemas

### Error: "No se encontró el archivo"
- Verifica que el archivo `menu_data.json` existe en la ruta especificada
- Usa `--file` para especificar una ruta diferente

### Error: "Se requiere una fecha de inicio válida"
- Asegúrate de usar el formato YYYY-MM-DD
- Ejemplo correcto: `2025-01-13`
- Ejemplo incorrecto: `13/01/2025` o `01-13-2025`

### Los menús no se crean
- Verifica que la base de datos esté accesible
- Revisa los logs para ver si hay errores específicos
- Asegúrate de que el formato del JSON sea correcto

## Notas Adicionales

- El script es idempotente: puedes ejecutarlo múltiples veces sin problemas (a menos que uses `--delete-existing`)
- Los menús existentes no se sobrescriben automáticamente
- Las plantillas de platos se reutilizan entre diferentes menús

