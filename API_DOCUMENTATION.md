# Menu Hub API Documentation

## Endpoints de Autenticación

### POST /auth/login
Autenticar usuario y obtener token JWT.

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "token": "jwt_token_string"
}
```

## Endpoints de Menús

### GET /menus
Obtener menús con filtros opcionales por fecha.

**Query Parameters:**
- `startDate` (opcional): Fecha de inicio en formato YYYY-MM-DD
- `endDate` (opcional): Fecha de fin en formato YYYY-MM-DD

**Response:**
```json
[
  {
    "id": 1,
    "date": "2024-01-15T00:00:00.000Z",
    "meals": [
      {
        "id": 1,
        "type": "breakfast",
        "items": [
          {
            "id": 1,
            "name": "Café con leche",
            "allergens": [
              {
                "allergen": {
                  "name": "Lácteos"
                }
              }
            ]
          }
        ]
      }
    ]
  }
]
```

### GET /menus/:date
Obtener menú específico por fecha.

**Parameters:**
- `date`: Fecha en formato YYYY-MM-DD

**Response:** Mismo formato que GET /menus pero para un solo menú.

### POST /menus
Crear nuevo menú. **Requiere autenticación.**

**Request:**
```json
{
  "date": "2024-01-15",
  "meals": [
    {
      "type": "breakfast",
      "items": [
        {
          "name": "Café con leche",
          "allergens": ["Lácteos"]
        }
      ]
    }
  ]
}
```

### PUT /menus/:id
Actualizar menú completo. **Requiere autenticación.**

**Request:**
```json
{
  "meals": [
    {
      "type": "breakfast",
      "items": [
        {
          "name": "Café con leche",
          "allergens": ["Lácteos"]
        }
      ]
    }
  ]
}
```

### DELETE /menus/:id
Eliminar menú completo. **Requiere autenticación.**

## Endpoints de Comidas

### POST /menus/:menuId/meals
Agregar comida completa a un menú. **Requiere autenticación.**

**Request:**
```json
{
  "type": "breakfast",
  "items": [
    {
      "name": "Café con leche",
      "allergens": ["Lácteos"]
    }
  ]
}
```

## Endpoints de Platos

### POST /menus/:menuId/meals/:mealId/items
Agregar plato a una comida específica. **Requiere autenticación.**

**Request:**
```json
{
  "name": "Café con leche",
  "allergens": ["Lácteos"]
}
```

### PUT /menus/:menuId/meals/:mealId/items/:itemId
Actualizar plato específico. **Requiere autenticación.**

**Request:**
```json
{
  "name": "Café con leche actualizado",
  "allergens": ["Lácteos", "Gluten"]
}
```

### DELETE /menus/:menuId/meals/:mealId/items/:itemId
Eliminar plato específico. **Requiere autenticación.**

## Autenticación

Todas las rutas marcadas con **"Requiere autenticación"** necesitan el header:
```
Authorization: Bearer <jwt_token>
```

## Tipos de Comida

- `breakfast`: Desayuno
- `lunch`: Comida  
- `dinner`: Cena

## Alérgenos Comunes

- Gluten
- Lácteos
- Huevos
- Frutos secos
- Soja
- Pescado
- Crustáceos
- Moluscos
- Sésamo
- Mostaza
- Apio
- Cacahuetes
- Altramuces
- Sulfitos

## Códigos de Error

- `401`: No autorizado (token inválido o faltante)
- `404`: Recurso no encontrado
- `500`: Error interno del servidor
