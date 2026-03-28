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

## Responsive (obligatorio)
- **Todos los componentes y páginas deben ser responsive** desde el primer commit
- Sidebar: oculto en mobile (`hidden md:flex`), drawer overlay con backdrop en `< md`
- Layout: top bar mobile con hamburger (`md:hidden`), padding `p-4 sm:p-6`
- Grids: nunca columnas fijas sin breakpoint — usar `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Headers de página: `flex flex-wrap items-start justify-between gap-3` con `shrink-0` en el botón primario
- Tablas: siempre envueltas en `<div className="overflow-x-auto">`, nunca tabla directa sin wrapper
- Alertas/badges en fila: `flex flex-col sm:flex-row flex-wrap gap-3`
- Selectores/inputs de filtro: `w-full sm:w-auto` en mobile
- Breakpoints estándar: `sm` = 640px, `md` = 768px, `lg` = 1024px

## Interactividad
- **Todo elemento clickeable debe tener `cursor-pointer`** (botones, selects, links custom, divs con onClick)
- `button`, `select` y `[role="button"]` ya lo tienen vía `globals.css`
- Para `<div>` / `<span>` con `onClick`: agregar `cursor-pointer` en className
- Elementos deshabilitados: usar `cursor-not-allowed` (ya global para `button:disabled` y `select:disabled`)

## Convenciones
- Nombres de modelos y código en inglés
- Nombres de tablas en snake_case (vía `@@map`)
- Relaciones explícitas con `@relation` y `onDelete` configurado
- Índices compuestos optimizados para dashboard y pagos
- Express v5: `req.params.id` es `string | string[]`, usar helper para castear
- Registrar acciones en `ActivityLog` al crear/editar/eliminar entidades
