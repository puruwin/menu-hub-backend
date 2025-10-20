#!/bin/bash
set -e

echo "🍓 Iniciando despliegue en Raspberry Pi..."

if ! grep -q "Raspberry Pi" /proc/device-tree/model 2>/dev/null; then
    echo "⚠️  Advertencia: No parece ser una Raspberry Pi"
fi

# ⚡ Evita reconstrucciones completas y conserva caché
export DOCKER_BUILDKIT=1

# Verificar que existe el directorio del frontend
if [ ! -d "../../saal-hub" ]; then
    echo "❌ Error: No se encontró el directorio ../../saal-hub"
    echo "   Asegúrate de que el frontend esté en el directorio correcto"
    exit 1
fi

# Configurar variables de entorno para el frontend
echo "🔧 Configurando variables de entorno..."
IP=$(hostname -I | awk '{print $1}')
echo "VITE_API_URL=$IP" > ../saal-hub/.env.production
echo "✅ Configurado VITE_API_URL=$IP"

# Parar solo contenedores relacionados con este proyecto
echo "🛑 Parando contenedores existentes..."
docker compose down

# Limpiar caché de build para forzar rebuild completo
echo "🧹 Limpiando caché de build..."
docker builder prune -f

echo "🔨 Construyendo y levantando servicios..."
docker compose up -d --build

# Esperar a que los servicios estén listos
echo "⏳ Esperando a que los servicios estén operativos..."
sleep 20

# Verificar estado de los contenedores
echo "📊 Verificando estado de los contenedores..."
if ! docker compose ps | grep -q "Up"; then
    echo "❌ Error: Algunos servicios no están corriendo correctamente"
    echo "📋 Logs del backend:"
    docker compose logs backend
    echo "📋 Logs del frontend:"
    docker compose logs frontend
    exit 1
fi

# Verificar logs de CORS
echo "🔍 Verificando configuración CORS..."
docker compose logs backend | grep -i cors || echo "No se encontraron logs de CORS"

echo "✅ Despliegue completado correctamente!"
echo ""
echo "🌐 Accesos:"
IP=$(hostname -I | awk '{print $1}')
echo "   Frontend: http://${IP}"
echo "   Backend:  http://${IP}:3000"
echo ""
echo "🔧 Para verificar CORS específicamente:"
echo "   docker compose logs backend | grep -i cors"
echo ""

docker compose ps
echo "📈 Uso de recursos:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
