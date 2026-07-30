# Reglas del Proyecto — BuildControl

## Diseño UI/UX — autoridad
- **El skill `ui-ux-pro-max` manda en todas las decisiones de UI/UX del proyecto**:
  estructura de páginas, componentes, color, tipografía, espaciado, layout,
  accesibilidad, animación y visualización de datos
- Instalado en `.claude/skills/ui-ux-pro-max/`. Requiere Python 3
  (`python .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <dominio>`)
- **Antes de crear o modificar cualquier pantalla o componente visible**: consultar el
  skill y aplicar lo que devuelva. No diseñar "a ojo"
- **Fuente de verdad**: `design-system/buildcontrol/MASTER.md` — leerlo primero. Contiene
  la paleta, tipografía y densidad ya resueltas. Solo volver a correr `--design-system`
  si aparece un tipo de pantalla que no cubre
- Overrides por página en `design-system/buildcontrol/pages/<pagina>.md`
- Stack a pasarle al skill: `--stack nextjs`

### Orden de precedencia cuando hay conflicto
1. **Accesibilidad medida** (WCAG AA: 4.5:1 texto, 3:1 componentes) — gana siempre,
   incluso sobre el skill. La paleta del skill falla en tres puntos y ya está corregida
   en MASTER.md §3; usar los tokens corregidos, no los crudos del CSV
2. **Reglas de este archivo** (Responsive, Interactividad) — son restricciones duras
3. **Recomendación del skill** — manda en todo lo demás
4. Preferencia estética propia — último

### El skill se equivoca en un caso conocido
Queries con `construction` / `architecture` devuelven estilo *Exaggerated Minimalism*
(pensado para portfolios y moda, con tipografía de 12rem). Es colisión de keyword.
Detalle y alternativa correcta en MASTER.md §7. Si un resultado se ve fuera de tema,
reintentar con `--domain` explícito antes de aplicarlo — nunca inventar la salida.

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

## Tests
- Runner: Vitest en ambos proyectos (`npm test`, `npm run test:watch`)
- Tests unitarios junto al código: `src/**/*.test.ts` (funciones puras, schemas de Zod)
- Integración de API en `backend/tests/*.integration.test.ts`: se saltea sola salvo que se
  le indique contra qué instancia correr, y limpia sus datos antes y después
  ```bash
  # backend levantado en otro puerto para no chocar con el dev server
  PORT=3099 npx tsx src/index.ts
  TEST_API_URL=http://localhost:3099/api npm test
  ```
- Los datos de prueba usan el prefijo `ZZTEST` en nombres y emails; la limpieza va por
  Prisma (no hay endpoints para borrar plantillas ni usuarios)
- Al tocar cálculo de costos, parseo de números o dedupe de materiales: agregar el caso
  al test correspondiente (`number.test.ts`, `text.test.ts`, `apu.service.test.ts`,
  `apu-templates.schema.test.ts`, `materials.schema.test.ts`)

## Documentación
- **Manual de usuario** (referencia completa, pantalla por pantalla): `MANUAL_USUARIO.md` en la raíz
- **Guía de uso** (orientada a tareas y flujos de trabajo, para el usuario final): `GUIA_USUARIO_FINAL.md` en la raíz
- **Actualización obligatoria**: al agregar funcionalidades nuevas, crear componentes, modificar flujos existentes o cambiar la navegación, **actualizar el manual de usuario** reflejando los cambios. Incluir: descripción de la feature, cómo usarla paso a paso, campos/opciones disponibles, y restricciones/permisos. Mantener la tabla de contenidos sincronizada.
