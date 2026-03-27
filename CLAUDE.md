# Reglas del Proyecto — BuildControl

## General
- Monorepo con dos carpetas: `frontend/` y `backend/`
- Todo el código en TypeScript
- Validación con Zod (compartido frontend/backend)

## Frontend
- Framework: Next.js 16 con App Router (`src/app/`)
- Estilos: Tailwind CSS v4
- Alias de imports: `@/*`
- State/cache: TanStack Query
- Tablas: TanStack Table (headless, edición inline)
- Charts: Recharts
- Iconos: Lucide React
- API client: Axios (`src/lib/api/client.ts`)
- Route groups: `(auth)` para login/register, `(dashboard)` para app autenticada

## Backend
- Framework: Express v5 sobre Node.js
- Estructura: `src/` con `routes/`, `controllers/`, `middlewares/`, `config/`, `services/`
- Puerto por defecto: 4000
- Entry point: `src/index.ts`
- Auth: JWT (bcryptjs + jsonwebtoken), middleware en `src/middlewares/auth.ts`
- Validación: Zod middleware en `src/middlewares/validate.ts`
- Patrón de controllers: `controllers/<module>/<module>.controller.ts` + `<module>.schema.ts`
- Module resolution: Node16 (imports requieren extensión `.js`)

## Base de datos
- Motor: PostgreSQL (localhost:5432, db: Prueba)
- ORM: Prisma v7 con adapter (`@prisma/adapter-pg`)
- Schema en `backend/prisma/schema.prisma`
- Client generado en `backend/src/generated/prisma/` (importar desde `client.js`)
- Usar `@map` para snake_case en tablas/columnas, camelCase en código
- Todos los modelos llevan `createdAt` y `updatedAt`
- IDs: UUID (`@default(uuid())`)
- Montos decimales: `@db.Decimal(14, 2)`
- Usar enums de Prisma para estados

## Convenciones
- Nombres de modelos y código en inglés
- Nombres de tablas en snake_case (vía `@@map`)
- Relaciones explícitas con `@relation` y `onDelete` configurado
- Índices compuestos optimizados para dashboard y pagos
- Express v5: `req.params.id` es `string | string[]`, usar helper para castear
- Registrar acciones en `ActivityLog` al crear/editar/eliminar entidades
