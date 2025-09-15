# Etapa 1: build
FROM node:20-slim AS builder

# Establecemos directorio de trabajo
WORKDIR /app

# Instalar dependencias para Raspberry Pi
RUN apt-get update -y && apt-get install -y \
    openssl \
    libssl3 \
    libc6 \
    libgcc1 \
    libgomp1 \
    libstdc++6 \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copiamos package.json y package-lock.json para instalar dependencias
COPY package*.json ./

# Instalamos dependencias (incluyendo devDependencies para build)
RUN npm install

# Copiamos el resto del código
COPY . .

# Generamos cliente Prisma (esto sí se puede hacer en build time)
RUN npx prisma generate

# NOTA: Las migraciones y db push se ejecutarán en runtime cuando la DB esté disponible

# Compilamos TypeScript
RUN npm run build

# Etapa 2: runtime
FROM node:20-slim

WORKDIR /app

# Instalar postgresql-client para pg_isready
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

# Copiamos solo las dependencias de producción
COPY package*.json ./
RUN npm install --omit=dev

# Copiamos el build y el cliente Prisma generado
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copiamos archivo de prisma (para migrations o db push en runtime)
COPY --from=builder /app/prisma ./prisma

# Copiamos script de inicialización
COPY ./scripts/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Exponemos puerto del backend
EXPOSE 3000

# Usar entrypoint para manejar la inicialización
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
