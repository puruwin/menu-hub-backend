#!/bin/bash

echo "🍓 Iniciando despliegue en Raspberry Pi..."

# Verificar que estamos en Raspberry Pi
if ! grep -q "Raspberry Pi" /proc/device-tree/model 2>/dev/null; then
    echo "⚠️  Advertencia: No parece ser una Raspberry Pi"
fi

# Verificar memoria disponible
TOTAL_MEM=$(free -m | awk 'NR==2{printf "%d", $2}')
if [ $TOTAL_MEM -lt 1000 ]; then
    echo "⚠️  Memoria disponible: ${TOTAL_MEM}MB - Se aplicarán optimizaciones para memoria limitada"
    export DOCKER_BUILDKIT=0  # Deshabilitar BuildKit para ahorrar memoria
fi

# Parar contenedores existentes
echo "🛑 Parando contenedores existentes..."
docker-compose down

# Limpiar recursos no utilizados para liberar espacio
echo "🧹 Limpiando recursos de Docker..."
docker system prune -f

# Construir y levantar servicios con limitaciones de memoria
echo "🔨 Construyendo servicios..."
docker-compose up --build -d --force-recreate

# Verificar que los servicios estén corriendo
echo "🔍 Verificando servicios..."
sleep 30

if ! docker-compose ps | grep -q "Up"; then
    echo "❌ Error: Algunos servicios no están corriendo"
    docker-compose logs
    exit 1
fi

# Aplicar migraciones de base de datos
echo "🗃️  Aplicando migraciones..."
docker-compose exec -T backend npx prisma migrate deploy

# Ejecutar seed si existe
echo "🌱 Ejecutando seed..."
docker-compose exec -T backend npx prisma db seed || echo "No hay seed configurado"

# Mostrar estado final
echo "✅ Despliegue completado en Raspberry Pi!"
echo "📊 Estado de los servicios:"
docker-compose ps

echo ""
echo "🌐 Accesos:"
echo "   Frontend: http://$(hostname -I | awk '{print $1}')"
echo "   Backend:  http://$(hostname -I | awk '{print $1}'):3000"
echo ""

# Mostrar uso de recursos
echo "📈 Uso de recursos:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
