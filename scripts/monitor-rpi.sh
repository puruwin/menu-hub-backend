#!/bin/bash

echo "🍓 Monitor de Raspberry Pi - Menu Hub"
echo "====================================="

# Información del sistema
echo "📊 Información del Sistema:"
echo "  CPU: $(nproc) cores"
echo "  Memoria: $(free -h | awk 'NR==2{printf "%s/%s (%.1f%%)", $3,$2,$3*100/$2}')"
echo "  Temperatura: $(vcgencmd measure_temp 2>/dev/null || echo "No disponible")"
echo "  Espacio en disco: $(df -h / | awk 'NR==2 {print $3"/"$2" ("$5")"}')"
echo ""

# Estado de Docker
echo "🐳 Estado de Docker:"
if systemctl is-active --quiet docker; then
    echo "  ✅ Docker está corriendo"
    echo "  Contenedores activos: $(docker ps -q | wc -l)"
    echo "  Uso de disco Docker: $(docker system df | grep "Total" | awk '{print $2}')"
else
    echo "  ❌ Docker no está corriendo"
    exit 1
fi
echo ""

# Estado de los servicios
echo "📦 Estado de Menu Hub:"
if docker-compose ps >/dev/null 2>&1; then
    docker-compose ps
    echo ""
    
    # Logs recientes de errores
    echo "🔍 Logs recientes de errores:"
    docker-compose logs --tail=10 | grep -i error || echo "  ✅ No hay errores recientes"
    echo ""
    
    # Uso de recursos de contenedores
    echo "💾 Uso de recursos por contenedor:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
    echo ""
    
    # URLs de acceso
    IP=$(hostname -I | awk '{print $1}')
    echo "🌐 URLs de acceso:"
    echo "  Frontend: http://${IP}"
    echo "  Backend:  http://${IP}:3000"
    echo "  Base de datos: ${IP}:5432"
else
    echo "  ❌ Menu Hub no está corriendo"
    echo "  Ejecuta: ./scripts/deploy-rpi.sh"
fi

echo ""
echo "🔄 Comandos útiles:"
echo "  Ver logs:     docker-compose logs -f"
echo "  Reiniciar:    docker-compose restart"
echo "  Parar todo:   docker-compose down"
echo "  Monitor continuo: watch -n 5 ./scripts/monitor-rpi.sh"
