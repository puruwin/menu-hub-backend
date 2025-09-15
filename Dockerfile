# Etapa 1: build
FROM node:20-slim AS builder

# Establecemos directorio de trabajo
WORKDIR /app

RUN apt-get update -y && apt-get install -y \
    openssl \
    libssl3 \
    libc6 \
    libgcc1 \
    libgomp1 \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

# Copiamos package.json y package-lock.json para instalar dependencias
COPY package*.json ./

# Instalamos dependencias (incluyendo devDependencies para build)
RUN npm install

# Copiamos el resto del código
COPY . .

# Generamos cliente Prisma
RUN npx prisma generate

# Aplicamos migraciones / creamos tablas en la base de datos
# En producción normalmente usarías migrate deploy
# Para desarrollo puedes usar: npx prisma db push
# Aquí dejamos la línea lista para desarrollo, puedes cambiarla
# RUN npx prisma migrate deploy
RUN npx prisma db push

# Ejecutamos seed opcional si lo tienes configurado
# RUN npx prisma db seed

# Compilamos TypeScript
RUN npm run build

# Etapa 2: runtime
FROM node:20-slim

WORKDIR /app

# Copiamos solo las dependencias de producción
COPY package*.json ./
RUN npm install --omit=dev

# Copiamos el build y el cliente Prisma generado
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copiamos archivo de prisma (para migrations o db push en runtime)
COPY --from=builder /app/prisma ./prisma

# Exponemos puerto del backend
EXPOSE 3000

# Comando para arrancar servidor
CMD ["node", "dist/server.js"]
