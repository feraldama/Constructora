# Design System — BuildControl (MASTER)

> Fuente de verdad global de diseño. Generado con el skill `ui-ux-pro-max` v2.11.0
> y corregido a mano donde el skill misrouteó (ver §7).
> Las reglas por página van en `design-system/buildcontrol/pages/<pagina>.md` y
> **sobrescriben** a este archivo solo en lo que declaren explícitamente.

## 1. Producto

| Campo | Valor | Origen |
|---|---|---|
| Tipo de producto | Construction/Architecture | `--domain product` |
| Naturaleza | Herramienta interna B2B, no hay landing page | decisión de proyecto |
| Estilo dashboard | Data-Dense Dashboard + Minimalism & Swiss Style | `--domain style` |
| Stack | Next.js 16 (App Router) + Tailwind v4 | detectado en `frontend/package.json` |
| Dials | variance 2/10, motion 2/10, density 7/10 | herramienta interna, densa, sin adorno |

El skill devuelve además un *landing pattern* (`Hero > Features > CTA`). **No aplica**:
BuildControl no tiene página pública. Ignorar esa sección de cualquier salida futura.

## 2. Paleta

> **Acento: azul `#0369A1`.** El skill propone naranja de seguridad para
> Construction/Architecture, pero se descartó por decisión de producto: la app ya es
> azul y el naranja chocaba. `#0369A1` es el *"blue CTA"* que el propio skill lista en
> su fila **B2B Service**, da 5.93:1 con texto blanco, y es el único azul candidato que
> no se confunde con el azul semántico de los badges (dE 55 contra `text-blue-700`).

Neutrales de la fila `Construction/Architecture` (gris industrial) + acento azul de la
fila `B2B Service`, ambas de `colors.csv`.
Todos los valores viven como CSS vars en [globals.css](../../frontend/src/app/globals.css).

| Rol | Token | Hex | Contraste | Uso |
|---|---|---|---|---|
| Primary | `--color-primary` | `#0F172A` | 17.9:1 | superficies neutras oscuras |
| On primary | `--color-on-primary` | `#FFFFFF` | — | texto sobre primary |
| Secondary | `--color-secondary` | `#64748B` | 4.76:1 | elementos de apoyo |
| **Accent / CTA** | `--color-accent` | `#0369A1` | **5.93:1** | botones primarios, enlaces, foco |
| Accent hover | `--color-accent-hover` | `#075985` | 7.56:1 | hover del CTA |
| Accent tint | `--color-accent-tint` | `#F0F9FF` | — | fondo de hover en acciones |
| On accent | `--color-on-accent` | `#FFFFFF` | — | texto sobre acento |
| Background | `--color-canvas` | `#F8FAFC` | — | fondo de página |
| Foreground | `--color-ink` | `#334155` | 9.90:1 | texto principal |
| Card | `--color-card` | `#FFFFFF` | — | superficie de tarjetas |
| Muted | `--color-muted` | `#F1F5F9` | — | fondos sutiles |
| Muted foreground | `--color-muted-foreground` | `#64748B` | 4.76:1 | texto secundario |
| Border | `--color-border` | `#E2E8F0` | — | divisores decorativos |
| **Border input** | `--color-border-input` | `#7C8BA1` | **3.46:1** | bordes de campos — ver §3 |
| Destructive | `--color-destructive` | `#DC2626` | 4.83:1 | superficies de error |
| Destructive strong | `--color-destructive-strong` | `#B91C1C` | 5.91:1 | **texto** de error |
| Destructive tint | `--color-destructive-tint` | `#FEF2F2` | — | fondo del bloque de error |
| Ring | `--color-ring` | `#0369A1` | 5.93:1 | anillo de foco |

Con el acento azul **no hace falta** la variante `accent-strong` que sí requería el
naranja: `#0369A1` ya pasa AA para texto. Ese token se eliminó.

`--color-background` y `--color-foreground` ya existían en `globals.css` con otros
valores (blanco / `#171717`) y los usa toda la app. Para no repintar el dashboard
entero de una, los dos tokens nuevos se llaman `--color-canvas` y `--color-ink`.
Se unifican cuando termine el rollout de §8.

## 3. Correcciones de accesibilidad sobre la paleta del skill

El skill exige en su propio checklist *"text contrast 4.5:1 minimum"*, pero su paleta
no lo cumple en varios puntos. Medido con WCAG 2.1 (luminancia relativa):

| Problema | Medido | Requerido | Corrección |
|---|---|---|---|
| Blanco sobre naranja `#EA580C` | **3.56:1** | 4.5:1 | descartado — se usa azul `#0369A1` → **5.93:1** |
| `#DC2626` sobre tinte rojo `#FEF2F2` | **4.41:1** | 4.5:1 | `--color-destructive-strong` `#B91C1C` → **5.91:1** |
| Borde de input `#E2E8F0` | **1.23:1** | 3:1 (WCAG 1.4.11) | `--color-border-input` `#7C8BA1` → **3.46:1** |
| slate-400 `#94A3B8` como borde | **2.56:1** | 3:1 | tampoco alcanza — de ahí el `#7C8BA1` |

Sobre el naranja, el propio CSV lo admite: *"Accent adjusted from #F97316 for
**WCAG 3:1**"* — 3:1 es el umbral de *componente de interfaz*, no el de texto. Sirve
para una barra de progreso; no para un botón con etiqueta blanca. Fue una de las
razones para preferir el azul.

### Verificación automatizada
Los contrastes no se estiman a ojo: se miden sobre el DOM renderizado. El script está
en el scratchpad de la sesión (`assert.js`) y lee los `getComputedStyle` reales del
login servido, no los hex del archivo — así se detectó que Turbopack estaba sirviendo
un valor cacheado distinto al del código.

## 4. Tipografía

Pairing **Minimal Swiss** (`typography.csv`) — *"Best For: Dashboards, admin panels,
enterprise apps"*. Una sola familia sans neutra, jerarquía por peso.

El skill recomienda **Inter**. Usamos **Geist Sans**, ya cargada vía `next/font` en
[layout.tsx](../../frontend/src/app/layout.tsx): misma categoría (grotesca neutra suiza),
y evita una segunda webfont. Sustitución deliberada, no un descuido.

Escala: base 16px, `line-height` 1.5, cuerpo mínimo 14px.

## 5. Densidad (7/10)

Escala de espaciado para pantallas de datos: `8 / 12 / 16 / 24 / 32 / 48px`.
Padding de tarjeta 24px (`p-6`), filas de tabla ~36px, gap de grilla 8–16px.

## 6. Checklist obligatorio antes de entregar UI

Del skill (`--design-system` + `references/pro-rules.md`), más las reglas ya vigentes
del proyecto:

- [ ] Sin emojis como iconos — SVG vía Lucide React
- [ ] `cursor-pointer` en todo lo clickeable
- [ ] Hover con transición 150–300ms
- [ ] Contraste de texto ≥ 4.5:1 en modo claro
- [ ] Foco visible en navegación por teclado (nunca `outline-none` sin reemplazo)
- [ ] `prefers-reduced-motion` respetado
- [ ] Responsive verificado en 375 / 768 / 1024 / 1440px
- [ ] Inputs con `<label>` asociado — nunca placeholder como única etiqueta
- [ ] Errores con `role="alert"` — nunca solo color
- [ ] Feedback de envío: loading → éxito/error

Anti-patrones a evitar: gradientes violeta/rosa "de IA", layouts solo-2D, imágenes de
baja calidad.

## 7. Dónde el skill se equivoca (leer antes de correrlo)

`--design-system` con queries que incluyan `construction` o `architecture` devuelve
estilo **"Exaggerated Minimalism"** (`Best For: Fashion, architecture, portfolios,
luxury brands, editorial`) y efectos tipo `font-size: clamp(3rem, 10vw, 12rem);
font-weight: 900`. Es una colisión de keyword: *architecture* como industria vs.
*architecture* como nicho de portfolios. **No aplicar.**

Para BuildControl el estilo correcto sale de `--domain style "dashboard admin
enterprise data-dense professional clean"` → *Data-Dense Dashboard* + *Minimalism &
Swiss Style* (WCAG AAA, Tailwind 10/10).

## 8. El azul semántico NO se migra

El azul cumple dos funciones distintas en el código y solo una es de marca:

| Uso | Ejemplo | Qué hacer |
|---|---|---|
| **Marca / acción** | botón primario `bg-blue-600`, anillo de foco | → tokens de acento |
| **Categoría / estado** | `ADMIN`, `PROGRESS`, `MATERIALS`, `Project` como `bg-blue-50 text-blue-700`; barras de avance `bg-blue-500` | **se queda azul** |

El azul categórico pertenece a un set codificado por color (verde / amarillo / rojo /
azul). Pasarlo al acento rompería el código de color. El skill marca esto en
`ux-guidelines.csv`: *"Don't rely on color alone"* — pero mientras el color signifique
algo, tiene que seguir significando lo mismo en todas las pantallas.

Con acento azul `#0369A1` la distinción sigue siendo legible: el badge es una píldora
clara (`bg-blue-50` + `text-blue-700`) y el CTA es una superficie sólida con texto
blanco. Además hay dE 55 entre ambos azules — no se confunden.

## 8b. Trampa de Tailwind v4 + Turbopack

En `globals.css`, el bloque `@theme` con los tokens **tiene que ir inmediatamente
después de `@import "tailwindcss"`**, antes de cualquier `@theme inline`.

Si va después, `next build` genera las utilidades correctamente pero **el dev server
las descarta en silencio**: las variables no se emiten, `bg-accent` no existe y los
botones quedan sin fondo. No hay error ni warning — el build pasa y la página se ve
rota solo en dev.

Corolario: verificar contra `npm run dev`, no solo contra `npm run build`. Y si un
valor no coincide con el archivo, reiniciar el dev server borrando `.next/dev` — el
caché de CSS de Turbopack puede servir un hex viejo indefinidamente.

## 9. Estado del rollout

| Zona | Estado |
|---|---|
| Tokens en `globals.css` | ✅ definidos y verificados en dev |
| `(auth)/login` | ✅ rediseñado + a11y, verificado con captura |
| `(auth)/register` | ✅ rediseñado + a11y, verificado con captura |
| Botones primarios del dashboard | ✅ 38 `bg-blue-600` → `bg-accent` |
| Anillos de foco | ✅ 111 `focus:ring/border-blue-*` → tokens `ring` |
| Azul semántico | ⏸️ intencionalmente sin tocar (§8) |
| Enlaces/iconos de acción | ⬜ pendiente — ~60 `text-blue-600` / `hover:text-blue-*` |

**Pendiente con criterio requerido:** quedan 217 ocurrencias de `blue-*`. La mayoría es
semántica (§8) y se queda. El grupo que sí falta decidir caso por caso es
`text-blue-600` (43) y `hover:text-blue-600/800` (28): mezcla enlaces y botones-icono
de acción (→ acento) con tintes de tarjetas KPI (→ semántico). No se puede resolver con
buscar-y-reemplazar.

**Falta también:** los inputs viejos usan `focus:ring-1`; el skill pide `ring-2`. Solo
se migró el color del anillo, no el grosor.

## 10. Auditoría del proyecto completo (2026-07-30)

Barrido de los 53 componentes contra `quick-reference.md`, ordenado por la tabla de
prioridades del skill. Números medidos con greps/AST, no estimados.

### Prioridad 1 — Accessibility (CRITICAL)

| Hallazgo | Alcance | Regla |
|---|---|---|
| `focus:ring-1` (el skill pide anillo 2–4px) | **51 ocurrencias en 20 archivos** | `focus-states` |
| Errores de mutación sin `role="alert"` | 19 páginas del dashboard con estilos de error, **0** con `role="alert"` | `aria-live-errors` |
| Botones solo-icono sin `aria-label` | 10 (activity ×2, calendar ×2, certificates/[id] ×5, ProgressEntryModal ×1) | `aria-labels` |
| `outline-none` sin foco de reemplazo | 2 (`BudgetSpreadsheet.tsx:266`, `EditableCell.tsx:148`) | `focus-states` |
| Emoji como icono (`⚠`, `✓`) | 2 en `PaymentForm.tsx:144,149` | `no-emoji-icons` |

### Prioridad 2 — Touch & Interaction (CRITICAL)

| Hallazgo | Alcance | Regla |
|---|---|---|
| Botones-icono `p-1`/`p-1.5` (~26–30px de área táctil, mínimo 44) | 13 botones | `touch-target-size` |
| Modal de preview de `FileUpload` y drawer del `Sidebar` no cierran con Escape | 2 componentes (`Modal.tsx` sí lo hace — usarlo de referencia) | `escape-routes` |

### Prioridad 5 — Layout & Responsive (HIGH)

| Hallazgo | Alcance | Regla |
|---|---|---|
| `grid-cols-N` fijo sin breakpoint | 4 reales: `expenses:378` (3 col), `APUPanel:286` (2 col), `PaymentForm:126` (2 col), `ProgressEntryModal:130` (3 col). Los `grid-cols-7` de calendar son semánticos (días de la semana) pero en 375px las celdas quedan ~46px — revisar con overflow | regla del proyecto |
| Tablas sin `overflow-x-auto` | 2: `APUTemplatePicker`, `ManualAPUForm` | regla del proyecto |
| `<div>`/`<tr>`/`<li>` con `onClick` sin `cursor-pointer` | 10 (calendar, certificates ×2, contractors, overview, APUTemplatePicker, EditableCell, FileUpload ×3) | `cursor-pointer` |

### Prioridad 6–8 — Medium

| Hallazgo | Alcance |
|---|---|
| `text-[10px]`/`text-[11px]` (skill: mínimo 12px) | 8+ en assignments, calendar, contractors/[id], finance |
| Enlaces/iconos `text-blue-600` sin clasificar (acento vs. semántico) | 71 casos — ver §9 |
| `h-11` fijo en inputs de auth (mejor `min-h-11` para dynamic type) | login + register |

### Lo que ya está bien (no tocar)

Empty states en 20/24 páginas · confirmación antes de deletes (las páginas usan modal
propio con Cancelar/Eliminar) · loading states con `isPending`/spinner en forms ·
`Modal.tsx` maneja Escape correctamente · sidebar responsive con drawer + backdrop ·
0 violaciones axe en `(auth)`.

### Orden de ataque — estado

1. ✅ **Mecánico seguro** (2026-07-30): `focus:ring-1` → `focus:ring-2` (51× en 20
   archivos); `cursor-pointer` — 9 de los 10 del scan eran falsos positivos (la clase
   estaba después del `onClick`; `EditableCell` usa `cursor-cell`, correcto), el único
   real era el backdrop del preview de FileUpload; wrappers de tabla — ambas ya
   estaban en un div con `overflow-y-auto`, se les sumó `overflow-x-auto`
2. ✅ **Quirúrgico** (2026-07-30): `aria-label` — 5 de los 10 del scan eran botones
   con texto (falso positivo del regex); los 5 reales corregidos (paginación de
   activity ×2, navegación de calendar ×2, Trash2 de certificates), esos 5 además
   pasaron a `h-11 w-11` (44px); `role="alert"` agregado en los **14** bloques de
   error de mutación del dashboard/forms; emojis `⚠`/`✓` de PaymentForm →
   `AlertTriangle`/`CheckCircle2` de Lucide; Escape cierra el preview de FileUpload
   y el drawer del Sidebar (mismo patrón que `Modal.tsx`, respetando
   `defaultPrevented`)
3. ✅ **Con criterio visual** (2026-07-30):
   - **Touch targets de fila**: utility `.touch-hit` en `globals.css` (::after con
     `inset:-8px` — el hitSlop que el propio skill sugiere). Aplicada a 29 botones-icono
     compactos. Verificado en DOM real: visual 28×28, tap a 6px fuera cae en el botón,
     a 12px no → área efectiva 44×44 **sin densificar las tablas**
   - **Azules clasificados**: de 71 casos, **36 interactivos** migrados a tokens de
     acento (`text-accent`, `hover:text-accent-hover`, `hover:bg-accent-tint`,
     tab activa de finance `border-accent`); **24 estáticos** se quedan azules
     (tintes de KPI, iconos de rol, énfasis de precios en materials). Quedan 153
     ocurrencias `blue-*`, todas semánticas
   - **Texto sub-12px**: 54 líneas `text-[10px]`/`text-[11px]` → `text-xs`.
     **Excepción documentada**: los 2 contadores numéricos de burbuja
     (`layout.tsx:82`, `finance/page.tsx:245`) quedan a 10px bold — convención
     estándar de count-badge; agrandar la tipografía rompe su geometría fija
   - **Grids fijos**: `expenses:378` (3 inputs con label, se rompía en 375px) →
     `grid-cols-1 sm:grid-cols-3`. Los otros 3 se quedan a propósito: APUPanel
     (2 inputs numéricos angostos), PaymentForm (`<dl>` clave-valor) y
     ProgressEntryModal (3 stats cortos centrados) caben bien en 375px — el
     breakpoint los empeoraría
   - Celdas de calendar en 375px: verificado con captura, entran las 7 columnas
     sin scroll horizontal; riesgo real solo con muchos eventos por celda
4. ✅ **Foco global para campos huérfanos** (2026-07-30): 70 inputs/selects/textareas
   no definían ningún estilo de foco y dependían del outline default del navegador.
   En vez de editar 70 campos, regla única en `globals.css`:
   `@layer base { :where(input, select, textarea):focus-visible { outline: 2px solid var(--color-ring) } }`
   — `:where()` deja la especificidad en cero y `@layer base` pierde contra la capa
   de utilidades, así todo campo con `focus:*`/`outline-none` propio conserva su
   diseño. Verificado en DOM real: campo huérfano → `solid 2px #0369A1`; campo con
   ring propio (Sidebar) → su ring, sin duplicado. **Regla para código nuevo: los
   formularios "de diseño" (auth, modales importantes) definen su anillo con tokens;
   el resto puede omitir focus y hereda este default.**
5. ✅ **Modal "Agregar/Quitar miembro"** (2026-07-30): tratamiento completo de
   formulario — labels asociados, validación en blur con `aria-invalid` y foco al
   campo tras submit fallido, borde 3.46:1, errores con tokens destructive
   (el par `red-600`/`red-50` daba 4.41:1), campos y botones a 44px. Verificado
   con pruebas de comportamiento (6/6) y captura.
6. ✅ **`Modal.tsx`: patrón dialog WAI-ARIA completo** (2026-07-31, reportado por
   el usuario: "no toma el focus"): al abrir, el foco entra al primer campo del
   cuerpo (fallback: el panel con `tabIndex=-1`); Tab cicla dentro del panel
   (los `disabled` se excluyen del trap); al cerrar, el foco vuelve al elemento
   que abrió el modal; `role="dialog"` + `aria-modal` + `aria-labelledby` con el
   título; botón X con `aria-label="Cerrar"`, `touch-hit` y anillo de foco.
   Cubre TODOS los modales de la app (es el componente base). Verificado 5/5 en
   navegador.
7. ✅ **Trap de foco unificado en TODOS los overlays** (2026-07-31): la lógica se
   extrajo a `src/hooks/useFocusTrap.ts` (foco inicial con zona preferida, ciclo
   de Tab excluyendo `disabled`, devolución al disparador). Consumidores:
   `Modal.tsx` (16 pantallas), el preview de `FileUpload` (ahora con
   `role="dialog"` + `aria-label` con el nombre del archivo) y el drawer del
   `Sidebar`. El drawer además lleva **`inert={!isOpen}`**: cerrado queda fuera
   de pantalla pero seguía en el árbol de accesibilidad con `aria-modal` — con
   inert sale del árbol y del orden de Tab. Verificado: modal 5/5, drawer 4/4,
   drawer cerrado no alcanzable en 30 tabs. Regla para overlays nuevos: usar
   `Modal.tsx`; si no se puede, `useFocusTrap` + `role="dialog"` + Escape.

## 10b. Auditoría de `(auth)` contra el skill

Contrastado contra `quick-reference.md` §1 (Accessibility), §2 (Touch) y §8 (Forms).
Verificado con axe-core (0 violaciones, 25 reglas WCAG 2.1 AA) y con pruebas de
comportamiento en navegador real, no solo por inspección de código.

Cumplen: `input-labels`, `error-placement`, `inline-validation`, `submit-feedback`,
`password-toggle`, `autofill-support`, `input-type-keyboard`, `touch-friendly-input`,
`touch-target-size`, `aria-live-errors`, `focus-states`, `disabled-states`,
`cursor-pointer`, `reduced-motion`, `color-contrast`, `heading-hierarchy`,
`error-clarity`, `focus-management`, `tap-delay`.

### Pendientes que requieren decisión de producto

| Regla del skill | Estado | Bloqueo |
|---|---|---|
| `error-recovery` | ⛔ no implementable | **No existe recuperación de contraseña.** El backend solo expone `POST /register`, `POST /login`, `GET /me`. Un enlace "¿Olvidaste tu contraseña?" iría a una ruta inexistente. Requiere endpoint + envío de mail. |
| `required-indicators` | ⬜ no aplicado | En login *todos* los campos son obligatorios; marcar ambos con asterisco es ruido sin información. La convención alternativa es una nota "Todos los campos son obligatorios". Decisión pendiente. |
| `error-summary` | ⬜ no aplicado | El skill lo pide "para múltiples errores". Con 2–4 campos, error inline + `focus-management` cubre el caso; un resumen arriba duplicaría el mensaje. |
| `dynamic-type` | ⚠️ parcial | Los campos usan `h-11` fijo. Con texto del sistema muy agrandado el contenido puede recortarse. Migrar a `min-h-11` cuando se revise el escalado. |
