#!/bin/bash

echo "🍓 Iniciando entorno de desarrollo en Raspberry Pi..."

# Verificar memoria disponible
TOTAL_MEM=$(free -m | awk 'NR==2{printf "%d", $2}')
echo "💾 Memoria total disponible: ${TOTAL_MEM}MB"

if [ $TOTAL_MEM -lt 2000 ]; then
    echo "⚠️  Memoria limitada detectada - Aplicando configuración ligera"
    export DOCKER_BUILDKIT=0
fi

# Parar contenedores existentes
echo "🛑 Parando contenedores existentes..."
docker-compose -f docker-compose.dev.yml down

# Limpiar caché si la memoria es muy limitada
if [ $TOTAL_MEM -lt 1500 ]; then
    echo "🧹 Liberando memoria..."
    docker system prune -f
fi

# Levantar servicios de desarrollo
echo "🚀 Iniciando servicios de desarrollo..."
docker-compose -f docker-compose.dev.yml up --build

echo "✅ Entorno de desarrollo listo en Raspberry Pi!"
echo "🌐 Accesos:"
echo "   Frontend: http://$(hostname -I | awk '{print $1}'):5173"
echo "   Backend:  http://$(hostname -I | awk '{print $1}'):3000"
