# Menu Hub - Raspberry Pi Setup

## Requisitos del Sistema

### Hardware Recomendado
- **Raspberry Pi 4 (4GB+ RAM)** - Recomendado
- **Raspberry Pi 3B+** - Mínimo (con limitaciones)
- **MicroSD 32GB+** (Clase 10 o superior)
- **Conexión a Internet estable**

### Software Requerido
- Raspberry Pi OS (64-bit recomendado)
- Docker y Docker Compose

## Instalación Inicial

### 1. Preparar Raspberry Pi

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Añadir usuario al grupo docker
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo apt install docker-compose -y

# Reiniciar para aplicar cambios
sudo reboot
```

### 2. Clonar el Proyecto

```bash
# Clonar repositorios
git clone <tu-repositorio-backend> menu-hub-backend
git clone <tu-repositorio-frontend> menu-hub-frontend

cd menu-hub-backend
```

### 3. Configurar Permisos de Scripts

```bash
chmod +x scripts/*.sh
```

## Uso

### Producción

```bash
# Desplegar aplicación completa
./scripts/deploy-rpi.sh
```

### Desarrollo

```bash
# Entorno de desarrollo con hot reload
./scripts/dev-rpi.sh
```

### Monitoreo

```bash
# Ver estado del sistema y aplicación
./scripts/monitor-rpi.sh

# Monitor continuo (actualización cada 5 segundos)
watch -n 5 ./scripts/monitor-rpi.sh
```

## Optimizaciones para Raspberry Pi

### Configuración de Memoria

Si tu Raspberry Pi tiene poca memoria, puedes ajustar:

```bash
# Aumentar swap (temporal)
sudo dphys-swapfile swapoff
sudo sed -i 's/CONF_SWAPSIZE=100/CONF_SWAPSIZE=1024/' /etc/dphys-swapfile
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

### Configuración del GPU Split (opcional)

```bash
# Reducir memoria dedicada a GPU
sudo raspi-config
# Advanced Options → Memory Split → 16
```

## Comandos Útiles

### Docker

```bash
# Ver logs en tiempo real
docker-compose logs -f

# Reiniciar un servicio específico
docker-compose restart backend

# Limpiar espacio en disco
docker system prune -a

# Ver uso de recursos
docker stats

# Parar todo
docker-compose down
```

### Sistema

```bash
# Ver temperatura de CPU
vcgencmd measure_temp

# Ver memoria disponible
free -h

# Ver espacio en disco
df -h

# Ver procesos que más consumen
htop
```

## Solución de Problemas

### Build Fails (Memoria Insuficiente)

```bash
# Opción 1: Usar menos paralelismo
export DOCKER_BUILDKIT=0
docker-compose build --parallel 1

# Opción 2: Build servicios por separado
docker-compose build database
docker-compose build backend
docker-compose build frontend
```

### Contenedores se Reinician Constantemente

```bash
# Ver logs de errores
docker-compose logs backend
docker-compose logs frontend

# Verificar memoria disponible
free -h

# Reducir límites de memoria en docker-compose.yml
```

### Puerto 80 Ocupado

```bash
# Verificar qué usa el puerto 80
sudo lsof -i :80

# Cambiar puerto del frontend en docker-compose.yml
# ports:
#   - "8080:80"  # Usar puerto 8080 en lugar de 80
```

## URLs de Acceso

Una vez desplegado, accede a:

- **Frontend**: `http://[IP-de-tu-RaspberryPi]`
- **Backend**: `http://[IP-de-tu-RaspberryPi]:3000`

Para encontrar la IP de tu Raspberry Pi:
```bash
hostname -I
```

## Actualizaciones

```bash
# Actualizar código
git pull

# Reconstruir y desplegar
./scripts/deploy-rpi.sh
```

## Backup de Base de Datos

```bash
# Hacer backup
docker-compose exec database pg_dump -U menuhub menuhub > backup.sql

# Restaurar backup
cat backup.sql | docker-compose exec -T database psql -U menuhub -d menuhub
```
