#!/bin/bash
set -e

echo "🍓 Iniciando despliegue en Raspberry Pi..."

if ! grep -q "Raspberry Pi" /proc/device-tree/model 2>/dev/null; then
    echo "⚠️  Advertencia: No parece ser una Raspberry Pi"
fi

# ⚡ Evita reconstrucciones completas y conserva caché
export DOCKER_BUILDKIT=1

# Parar solo contenedores relacionados con este proyecto
echo "🛑 Parando contenedores existentes..."
docker compose down

# ⚠️ Ya no hacemos prune total — destruye la caché y obliga a bajar 300 MB cada vez
# Si realmente necesitas limpiar espacio, hazlo manualmente con: docker system prune -af

echo "🔨 Construyendo y levantando servicios (usando caché)..."
docker compose up -d --build

# Esperar a que el backend levante completamente
echo "⏳ Esperando a que el backend esté operativo..."
sleep 15

if ! docker compose ps | grep -q "Up"; then
    echo "❌ Error: Algunos servicios no están corriendo correctamente"
    docker compose logs
    exit 1
fi

echo "✅ Despliegue completado correctamente!"
echo ""
echo "🌐 Accesos:"
IP=$(hostname -I | awk '{print $1}')
echo "   Frontend: http://${IP}"
echo "   Backend:  http://${IP}:3000"
echo ""

docker compose ps
echo "📈 Uso de recursos:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
