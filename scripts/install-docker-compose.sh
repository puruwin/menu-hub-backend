#!/bin/bash

echo "🔧 Instalando Docker Compose V2 en Raspberry Pi..."

# Desinstalar versión anterior si existe
echo "🗑️  Removiendo versión anterior..."
sudo apt remove docker-compose -y 2>/dev/null || true

# Crear directorio para plugins de Docker
mkdir -p ~/.docker/cli-plugins/

# Detectar arquitectura
ARCH=$(uname -m)
case $ARCH in
    x86_64)
        DOCKER_COMPOSE_ARCH="x86_64"
        ;;
    armv7l)
        DOCKER_COMPOSE_ARCH="armv7"
        ;;
    aarch64|arm64)
        DOCKER_COMPOSE_ARCH="aarch64"
        ;;
    *)
        echo "❌ Arquitectura no soportada: $ARCH"
        exit 1
        ;;
esac

echo "📱 Arquitectura detectada: $ARCH -> $DOCKER_COMPOSE_ARCH"

# Descargar Docker Compose V2
COMPOSE_VERSION="v2.21.0"  # Versión estable para ARM
echo "⬇️  Descargando Docker Compose $COMPOSE_VERSION..."

curl -SL "https://github.com/docker/compose/releases/download/$COMPOSE_VERSION/docker-compose-linux-$DOCKER_COMPOSE_ARCH" \
    -o ~/.docker/cli-plugins/docker-compose

# Dar permisos de ejecución
chmod +x ~/.docker/cli-plugins/docker-compose

# Verificar instalación
echo "✅ Verificando instalación..."
docker compose version

echo "🎉 Docker Compose V2 instalado correctamente!"
echo "💡 Ahora usa 'docker compose' en lugar de 'docker-compose'"
