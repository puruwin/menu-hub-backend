# Cómo Vaciar la Base de Datos

## 🔄 Opción 1: Prisma Migrate Reset (RECOMENDADO)

Este comando:
- ✅ Elimina la base de datos completa
- ✅ Recrea la base de datos vacía
- ✅ Ejecuta todas las migraciones desde cero
- ✅ Ejecuta el seed si existe (crea datos iniciales)

```powershell
cd C:\Users\ah_admin\Code\menu-hub-backend
npx prisma migrate reset
```

⚠️ **IMPORTANTE**: Este comando te pedirá confirmación antes de borrar todo.

---

## 🔄 Opción 2: Borrar archivo y regenerar

Si prefieres hacerlo manualmente:

```powershell
cd C:\Users\ah_admin\Code\menu-hub-backend

# 1. Detén el servidor si está corriendo (Ctrl+C)

# 2. Elimina el archivo de base de datos
Remove-Item prisma\prisma\dev.db -Force
Remove-Item prisma\prisma\dev.db-journal -Force -ErrorAction SilentlyContinue

# 3. Ejecuta las migraciones para recrear la BD
npx prisma migrate deploy

# 4. Regenera el cliente de Prisma
npx prisma generate
```

---

## 🔄 Opción 3: Push con reset forzado

Esta opción sincroniza el schema sin usar migraciones:

```powershell
npx prisma db push --force-reset
```

⚠️ **Cuidado**: Esta opción elimina las migraciones y sincroniza directamente desde el schema.

---

## 🎯 Crear Usuario Inicial

Después de vaciar la base de datos, necesitarás crear un usuario para poder hacer login:

```powershell
# Si tienes el script create-user.mjs
node create-user.mjs

# O si tienes create-user.js
node create-user.js
```

**Credenciales por defecto** (verifica en el script):
- Usuario: `admin`
- Contraseña: (la que está definida en el script)

---

## 📝 Verificar que Funcionó

Después de vaciar la BD, verifica:

```powershell
# Ver el estado de las migraciones
npx prisma migrate status

# Abrir Prisma Studio para ver la BD (opcional)
npx prisma studio
```

---

## 💡 Recomendación

Para este proyecto, usa la **Opción 1** (`prisma migrate reset`):
1. Es la más segura
2. Mantiene las migraciones correctamente
3. Garantiza que la BD esté en el estado correcto
4. Puedes automatizar la creación de datos iniciales con un seed

```powershell
# Comando completo recomendado:
cd C:\Users\ah_admin\Code\menu-hub-backend
npx prisma migrate reset --force  # --force omite la confirmación
npx prisma generate
npm run dev  # Reinicia el servidor
```

