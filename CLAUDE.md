# Reglas del Proyecto

## General
- El proyecto usa monorepo con dos carpetas: `frontend/` y `backend/`
- Todo el código debe estar en TypeScript

## Frontend
- Framework: Next.js con App Router (`src/app/`)
- Estilos: Tailwind CSS
- Alias de imports: `@/*`

## Backend
- Framework: Express sobre Node.js
- Estructura: `src/` con subcarpetas `routes/`, `controllers/`, `models/`, `middlewares/`, `config/`
- Puerto por defecto: 4000
- Entry point: `src/index.ts`

## Base de datos
- Motor: PostgreSQL (localhost:5432, db: Prueba)
- ORM: Prisma — schema en `backend/prisma/schema.prisma`
- Usar `@map` para snake_case en tablas/columnas, camelCase en código
- Todos los modelos llevan `createdAt` y `updatedAt`
- IDs: UUID (`@default(uuid())`)
- Montos decimales: `@db.Decimal(14, 2)`
- Usar enums de Prisma para estados

## Convenciones
- Nombres de modelos y código en inglés
- Nombres de tablas en snake_case (vía `@@map`)
- Relaciones explícitas con `@relation` y `onDelete` configurado
- Índices en campos de búsqueda frecuente y foreign keys
