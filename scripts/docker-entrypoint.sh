#!/bin/bash
set -e

echo "🍓 Iniciando backend de Menu Hub..."

# Esperar a que PostgreSQL esté disponible
echo "⏳ Esperando a que PostgreSQL esté disponible..."
until pg_isready -h database -p 5432 -U menuhub; do
  echo "PostgreSQL no está listo - esperando..."
  sleep 2
done

echo "✅ PostgreSQL está disponible!"

# Ejecutar migraciones de Prisma
echo "🗃️  Aplicando migraciones de base de datos..."
npx prisma migrate deploy || npx prisma db push

# Ejecutar seed si existe
echo "🌱 Ejecutando seed de datos..."
npx prisma db seed || echo "No hay seed configurado"

# Iniciar la aplicación
echo "🚀 Iniciando aplicación..."
exec "$@"
