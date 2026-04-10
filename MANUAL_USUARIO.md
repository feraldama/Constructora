# Manual de Usuario — BuildControl

**Sistema de Gestión de Obras de Construcción**
Versión actualizada: 2026-03-31

---

## Tabla de Contenidos

1. [Introducción](#1-introducción)
2. [Acceso al sistema](#2-acceso-al-sistema)
3. [Navegación general](#3-navegación-general)
4. [Dashboard](#4-dashboard)
5. [Proyectos](#5-proyectos)
6. [Cómputo Métrico (Presupuesto)](#6-cómputo-métrico-presupuesto)
7. [Avance Físico de Obra](#7-avance-físico-de-obra)
8. [Contratistas](#8-contratistas)
9. [Asignaciones de Partidas](#9-asignaciones-de-partidas)
10. [Pagos](#10-pagos)
11. [Certificaciones](#11-certificaciones)
12. [Calendario de Obra](#12-calendario-de-obra)
13. [Gastos Adicionales](#13-gastos-adicionales)
14. [Catálogo de Materiales](#14-catálogo-de-materiales)
15. [Análisis de Precios Unitarios (APU)](#15-análisis-de-precios-unitarios-apu)
16. [Cobros del Cliente](#16-cobros-del-cliente)
17. [Finanzas](#17-finanzas)
18. [Reportes](#18-reportes)
19. [Equipo (Miembros)](#19-equipo-miembros)
20. [Notificaciones](#20-notificaciones)
21. [Actividad (Auditoría)](#21-actividad-auditoría)
22. [Configuración de Cuenta](#22-configuración-de-cuenta)
23. [Administración de Usuarios](#23-administración-de-usuarios)
24. [Archivos Adjuntos](#24-archivos-adjuntos)
25. [Roles y Permisos](#25-roles-y-permisos)
26. [Atajos y Tips](#26-atajos-y-tips)

---

## 1. Introducción

BuildControl es un sistema integral para la gestión de obras de construcción. Permite administrar el ciclo completo de una obra:

**Presupuesto** -> **Asignación a contratistas** -> **Avance físico** -> **Certificación** -> **Pago**

### Funcionalidades principales

- Gestión de múltiples proyectos de obra
- Cómputo métrico con edición inline tipo planilla de cálculo
- Registro de avance físico con mediciones parciales
- Certificaciones periódicas de obra con flujo de aprobación
- Catálogo de materiales con precios unitarios
- Análisis de Precios Unitarios (APU) por partida con materiales y mano de obra
- Gestión de pagos a contratistas con vencimientos y alertas automáticas
- Cobros del cliente con seguimiento de saldo pendiente
- Análisis financiero con márgenes, flujo de caja real y predicciones
- Calendario visual con todos los eventos del proyecto
- Dashboard ejecutivo por proyecto y multi-proyecto
- Control de acceso basado en roles (por proyecto y global)
- Registro completo de auditoría

---

## 2. Acceso al sistema

### Registro

1. Ingresá a la pantalla de registro (`/register`)
2. Completá los campos:
   - **Email**: tu dirección de correo electrónico (será tu usuario)
   - **Nombre y Apellido**
   - **Contraseña**: mínimo 6 caracteres
3. Hacé click en **"Crear cuenta"**
4. Serás redirigido al Dashboard

### Inicio de sesión

1. Ingresá a la pantalla de login (`/login`)
2. Escribí tu **email** y **contraseña**
3. Hacé click en **"Iniciar sesión"**
4. La sesión se mantiene activa por 7 días

### Cerrar sesión

- Click en tu avatar (esquina superior derecha) -> **"Cerrar sesión"**

---

## 3. Navegación general

### Barra lateral (Sidebar)

La barra lateral es el menú principal de navegación. Contiene:

1. **Selector de proyecto activo** — En la parte superior, un dropdown permite elegir el proyecto con el que estás trabajando. Al cambiar de proyecto, todas las páginas se actualizan automáticamente. La selección se guarda y persiste entre sesiones.

2. **Navegación principal** (en orden):
   - Dashboard
   - Proyectos
   - Cómputo Métrico
   - Contratistas
   - Pagos
   - Certificaciones
   - Calendario
   - Gastos
   - Materiales
   - Cobros
   - Finanzas
   - Reportes
   - Actividad
   - Equipo
   - Notificaciones

3. **Sección Admin** (solo visible para ADMIN/SUPER_ADMIN):
   - Usuarios

4. **Sección Cuenta**:
   - Configuración

### Barra superior (Navbar)

- **Icono de menú** (mobile): abre el sidebar como drawer
- **Campana de notificaciones**: muestra badge con cantidad de notificaciones sin leer
- **Avatar de usuario**: dropdown con link a Configuración y botón de Cerrar sesión

### Responsive

- **Desktop** (>768px): sidebar fijo a la izquierda, contenido a la derecha
- **Mobile** (<768px): sidebar oculto, se abre como drawer al tocar el icono de menú. La barra superior muestra el logo y controles básicos

---

## 4. Dashboard

**Ruta:** `/dashboard`

El Dashboard muestra el resumen del proyecto activo seleccionado en el sidebar.

### KPIs principales (4 tarjetas)

| Tarjeta | Descripción |
|---------|-------------|
| **Total Pagado** | Suma de todos los pagos con estado PAID |
| **Pendiente** | Suma de pagos PENDING |
| **Vencido** | Suma de pagos OVERDUE (alerta roja) |
| **Ejecución** | Porcentaje del presupuesto ejecutado vs estimado |

### Alertas

Se muestran automáticamente cuando hay:
- Pagos vencidos (banner rojo)
- Pagos que vencen en los próximos 7 días (banner amarillo)

### Presupuesto vs Ejecutado

Barra de progreso visual que muestra:
- **Verde**: monto ejecutado (pagado)
- **Amarillo**: monto comprometido (pendiente + vencido)
- **Gris**: restante sin comprometer

### Avance de Obra

Anillo de progreso que muestra el **avance físico ponderado**. El porcentaje se calcula considerando el valor de cada partida:
- Una partida de $100.000 al 50% de avance pesa más que una de $1.000 al 100%
- Debajo del anillo se indica cuántas partidas tienen mediciones registradas

### Últimos pagos

Lista de los 5 pagos más recientes con:
- Nombre del contratista
- Monto
- Estado (badge de color)
- Fecha

### Últimos movimientos

Lista de las 10 acciones más recientes en el proyecto (creación de pagos, ediciones de presupuesto, etc.)

### Vista General (Multi-proyecto)

Hacé click en **"Vista general"** (botón superior derecho) para acceder a `/dashboard/overview`, que muestra:
- KPIs totales sumados de todos tus proyectos
- Tabla comparativa con: presupuesto, pagado, pendiente, ejecución %, avance físico %, margen de ganancia

---

## 5. Proyectos

**Ruta:** `/projects`

### Crear proyecto

1. Click en **"Nuevo proyecto"**
2. Completá los campos:
   - **Nombre** (obligatorio)
   - **Descripción** (opcional)
   - **Dirección** (opcional)
   - **Presupuesto inicial** (opcional)
   - **Estado**: Planificación, En progreso, Pausado, Completado, Cancelado
3. Click en **"Crear"**
4. Al crear un proyecto, automáticamente te convierte en ADMIN del mismo

### Estados de proyecto

| Estado | Descripción |
|--------|-------------|
| **Planificación** | Proyecto en etapa de diseño/presupuesto |
| **En progreso** | Obra en ejecución activa |
| **Pausado** | Obra temporalmente detenida |
| **Completado** | Obra finalizada |
| **Cancelado** | Proyecto descartado |

### Editar proyecto

- Click en el ícono de lápiz en la fila del proyecto
- Modificá los campos necesarios (nombre, descripción, estado, fechas, etc.)
- Click en **"Guardar"**

### Eliminar proyecto

- Solo si sos ADMIN del proyecto
- Solo si el proyecto no tiene pagos, contratistas, partidas o adjuntos
- Click en el ícono de papelera -> confirmar en el modal

### Búsqueda y filtros

- **Buscador**: filtra por nombre del proyecto
- **Filtro de estado**: filtra por estado del proyecto

---

## 6. Cómputo Métrico (Presupuesto)

**Ruta:** `/budget` -> redirige automáticamente a `/budget/{projectId}`

El cómputo métrico es una planilla de cálculo donde se definen los rubros y partidas del presupuesto de obra.

### Estructura

```
Proyecto
  └── Rubro (Categoría)
        └── Partida (BudgetItem)
              - Descripción
              - Unidad de medida
              - Cantidad
              - Precio unitario
              - Subtotal (calculado)
```

### Crear un rubro

1. Click en **"Nueva categoría"**
2. Ingresá el nombre del rubro (ej: "Mampostería", "Instalaciones Sanitarias")
3. Click en **"Crear"**

### Agregar partidas

1. Dentro de un rubro, click en **"Agregar partida"** (al pie de la tabla)
2. Se crea una fila vacía editable
3. Completá:
   - **Descripción**: nombre de la partida
   - **Unidad**: m², m³, ml, Unidad, kg, Ton, Global
   - **Cantidad**: cantidad presupuestada
   - **P.U. Costo**: precio unitario de costo (lo que te cuesta a vos)
   - **P.U. Venta**: precio unitario de venta (lo que le cobrás al cliente)
4. Se calculan automáticamente:
   - **Subt. Costo**: cantidad x P.U. Costo
   - **Subt. Venta**: cantidad x P.U. Venta
5. En la cabecera de cada rubro se muestran los totales de costo y venta
6. En la cabecera de la página se muestran los totales generales del proyecto
7. La diferencia entre venta y costo es el **margen de ganancia**, visible en la sección de Finanzas

### Edición inline

- Hacé click en cualquier celda para editarla directamente
- Los cambios se guardan automáticamente
- Navegá entre celdas con **Tab**, **Shift+Tab**, **Enter** o las flechas del teclado

### Columna de Avance

Cada partida muestra una columna **"Avance"** con:
- Barra de progreso visual
- Porcentaje de avance
- Cantidad medida vs presupuestada
- Click en la barra abre el modal de avance físico (ver sección 7)

### Acciones por partida

- **Duplicar**: copia la partida con "(copia)" en el nombre
- **Eliminar**: elimina la partida (bloqueado si tiene pagos activos)

### Eliminar rubro

- Click en **"Eliminar rubro"** en la cabecera del rubro
- Elimina el rubro y todas sus partidas (bloqueado si hay pagos activos en las partidas)

### Reordenar rubros y partidas (Drag & Drop)

- **Reordenar rubros**: arrastrar el ícono ☰ que aparece a la izquierda del nombre del rubro para moverlo arriba o abajo
- **Reordenar partidas dentro de un rubro**: arrastrar el ícono ☰ de la columna "#" de la partida hacia la nueva posición
- El nuevo orden se guarda automáticamente al soltar
- Las flechas del teclado y la navegación por celdas siguen funcionando normalmente

---

## 7. Avance Físico de Obra

El avance físico permite registrar mediciones parciales de la cantidad ejecutada en cada partida.

### Registrar una medición

1. En el Cómputo Métrico, hacé click en la barra de avance de una partida
2. Se abre el modal **"Avance físico"** que muestra:
   - **Barra de progreso**: porcentaje actual vs presupuestado
   - **Presupuestado / Medido / Restante**: cantidades en la unidad de medida
3. En la sección **"Registrar medición"**:
   - **Cantidad**: la cantidad ejecutada en esta medición
   - **Fecha**: cuándo se realizó la medición
   - **Notas**: observaciones opcionales
4. Click en **"Registrar avance"**

### Historial de mediciones

En el mismo modal se muestra la lista cronológica de todas las mediciones registradas para esa partida, incluyendo:
- Cantidad registrada
- Fecha
- Quién la registró
- Notas

Cada entrada puede eliminarse con el ícono de papelera.

### Cálculo del progreso

- **Por partida**: cantidad medida acumulada / cantidad presupuestada x 100
- **Por proyecto** (dashboard): promedio ponderado por el valor de venta de cada partida

---

## 8. Contratistas

**Ruta:** `/contractors`

### Crear contratista

1. Click en **"Nuevo contratista"**
2. Completá los campos:
   - **Nombre** (obligatorio)
   - **Nombre de contacto** (opcional)
   - **Email** (opcional)
   - **Teléfono** (opcional)
   - **CUIT/Tax ID** (opcional, debe ser único)
   - **Dirección** (opcional)
   - **Notas** (opcional)
3. Click en **"Crear"**

### Detalle del contratista

Click en un contratista para ver su página de detalle (`/contractors/{id}`), que incluye:

#### Resumen financiero
4 tarjetas con totales: acordado, pagado, pendiente, restante.

#### Desglose por proyecto
Tabla con el monto acordado, pagado y restante por cada proyecto donde participa el contratista, con barra de avance.

#### Información de contacto
Datos de contacto organizados en grilla.

#### Documentación adjunta
Zona de drag & drop para subir documentos del contratista (contratos, seguros, etc.). Ver sección 21.

#### Partidas asignadas
Lista de todas las partidas asignadas al contratista con montos acordados. Desde acá se pueden:
- Asignar nuevas partidas (botón **"Asignar partida"**)
- Editar asignaciones existentes
- Eliminar asignaciones (bloqueado si tienen pagos activos)

#### Historial de pagos
Todos los pagos del contratista agrupados por proyecto, expandibles.

### Filtros

- **Buscar**: por nombre o contacto
- **Estado**: Activos / Inactivos

---

## 9. Asignaciones de Partidas

**Ruta:** `/assignments`

Las asignaciones vinculan contratistas con partidas del presupuesto. Se pueden gestionar desde esta página o desde el detalle de un contratista.

### Vista general de asignaciones

La página muestra KPIs superiores: total comprometido, total pagado, contratistas activos y deuda vencida.

Dos modos de visualización disponibles:

- **Por partida**: muestra las partidas agrupadas por rubro (categoría), con columnas de presupuestado, contratado, pagado, pendiente, varianza y cantidad de contratistas. Las partidas sin asignar se destacan con badge amarillo "Sin asignar"
- **Por contratista**: resumen financiero de cada contratista con partidas asignadas, montos acordados, pagados, pendientes, vencidos y barra de ejecución. Link directo al detalle del contratista

Ambas vistas tienen búsqueda en tiempo real y las categorías se expanden/colapsan.

### Crear una asignación

1. Desde el detalle de un contratista, click en **"Asignar partida"**
2. Seleccionar:
   - **Proyecto**: el proyecto donde asignar
   - **Partida**: la partida específica del presupuesto
   - **Cantidad asignada**: cuánto del total de la partida se asigna a este contratista
   - **Precio acordado**: monto total acordado para esta asignación
   - **Notas** (opcional)
3. Click en **"Guardar"**

### Validaciones

- No se puede asignar más cantidad de la presupuestada en la partida
- Un contratista solo puede estar asignado una vez a cada partida
- No se puede eliminar una asignación que tenga pagos activos (PENDING o PAID)

---

## 10. Pagos

**Ruta:** `/payments`

### Crear un pago

1. Click en **"Nuevo Pago"**
2. Completá el formulario:
   - **Proyecto** (pre-seleccionado del contexto global)
   - **Contratista** (obligatorio)
   - **Partida** (opcional — se vincula a una partida específica)
   - **Monto** (obligatorio)
   - **Método de pago**: Efectivo, Transferencia, Cheque, Otro
   - **Fecha de vencimiento** (opcional)
   - **Fecha de pago** (si ya se pagó)
   - **N° de factura** (opcional)
   - **Descripción** (opcional)
3. Click en **"Guardar"**

### Estados de pago

| Estado | Color | Descripción |
|--------|-------|-------------|
| **Pendiente** | Amarillo | Pago registrado pero no realizado |
| **Pagado** | Verde | Pago completado |
| **Vencido** | Rojo | Se pasó la fecha de vencimiento sin pagar |
| **Cancelado** | Gris | Pago anulado |

### Transiciones de estado

```
PENDIENTE -> PAGADO (marcar como pagado)
PENDIENTE -> VENCIDO (automático por cron cuando pasa la fecha)
PENDIENTE -> CANCELADO (cancelar)
VENCIDO   -> PAGADO (pagar atrasado)
VENCIDO   -> CANCELADO (cancelar)
PAGADO    -> (estado final)
CANCELADO -> (estado final)
```

### Marcar como pagado

- En la lista: click en el ícono de check verde
- En el detalle: click en **"Marcar como Pagado"**, que abre un modal para completar los datos del pago:
  - **Método de pago**: Efectivo, Transferencia bancaria, Cheque, Otro
  - **Fecha de pago**: fecha en que se realizó el pago (no puede ser futura)
  - **N° Factura** (opcional): número de comprobante/factura asociado
- Al confirmar, el pago pasa a estado PAGADO con todos los datos registrados

### Detalle del pago

Click en un pago para ver `/payments/{id}`:
- Información completa del pago (monto, método, fecha de pago, factura)
- Contratista y proyecto vinculado
- Partida asociada (si aplica)
- **Comprobantes adjuntos**: zona de upload para subir facturas, recibos, etc.

### Filtros

- **Estado**: Todos, Pendiente, Pagado, Vencido, Cancelado
- **Fecha desde / hasta**: rango de fechas
- Búsqueda por descripción

### Pestaña "Deudas"

Muestra una tabla resumen de deuda por contratista: total acordado, pagado y saldo pendiente.

### Vencimiento automático

Un cron job revisa cada minuto los pagos PENDING cuya fecha de vencimiento ya pasó y los marca automáticamente como OVERDUE.

---

## 11. Certificaciones

**Ruta:** `/certificates`

Las certificaciones son documentos formales que certifican el avance de obra ejecutado por un contratista en un período determinado. Representan el flujo estándar en construcción para autorizar pagos.

### Flujo de trabajo

```
BORRADOR -> ENVIADA -> APROBADA -> Generar Pago
                    -> RECHAZADA -> BORRADOR (corregir y reenviar)
```

### Crear una certificación

1. Click en **"Nueva certificación"**
2. Seleccionar:
   - **Contratista**: el contratista a certificar
   - **Inicio del período**: fecha de inicio
   - **Fin del período**: fecha de cierre
   - **Notas** (opcional)
3. Click en **"Crear certificación"**
4. El sistema auto-genera una línea por cada partida asignada al contratista en el proyecto
5. Serás redirigido al detalle de la certificación

### Editar cantidades (estado BORRADOR)

En el detalle de la certificación (`/certificates/{id}`):
1. La tabla muestra cada partida con columnas:
   - **Rubro**: categoría a la que pertenece
   - **Partida**: nombre de la partida
   - **Unidad**: unidad de medida
   - **P. Unit.**: precio unitario calculado del monto acordado
   - **Anterior**: cantidad certificada en certificaciones previas aprobadas
   - **Actual**: cantidad a certificar en este período (editable)
   - **Acumulado**: anterior + actual
   - **Monto**: actual x precio unitario
2. Editá la columna **"Actual"** con las cantidades ejecutadas
3. El **Total** se recalcula automáticamente

### Enviar para aprobación

1. Con al menos una partida con cantidad > 0
2. Click en **"Enviar"**
3. La certificación pasa a estado ENVIADA y ya no es editable

### Aprobar certificación

1. Solo usuarios con rol ADMIN o EDITOR en el proyecto
2. Click en **"Aprobar"**
3. La certificación pasa a estado APROBADA

### Rechazar certificación

1. Click en **"Rechazar"**
2. Ingresá el **motivo del rechazo** (obligatorio)
3. La certificación pasa a estado RECHAZADA
4. El motivo se muestra en un banner rojo en el detalle

### Corregir y reenviar

1. Desde una certificación RECHAZADA, click en **"Corregir y reenviar"**
2. Vuelve a estado BORRADOR para editar las cantidades
3. Puede enviarse nuevamente

### Generar pago desde certificación

1. Desde una certificación APROBADA, click en **"Generar pago"** (o **"Generar pago restante"** si ya existen pagos parciales)
2. Se abre un modal con dos opciones:
   - **Certificado completo**: crea un único pago PENDIENTE por el monto total de la certificación
   - **Por partidas**: permite seleccionar partidas específicas para generar un pago individual por cada una
3. En modo "Por partidas":
   - Se muestra una tabla con todas las partidas de la certificación
   - Las partidas que ya tienen pago generado aparecen deshabilitadas con la etiqueta "Pago generado"
   - Se pueden seleccionar una o más partidas con checkbox
   - Se muestra el total de las partidas seleccionadas
4. Los pagos quedan vinculados a la certificación (y a la partida específica en modo por partidas)
5. Si ya existen pagos previos, solo se permite el modo por partidas para las restantes

### Exportar certificación a PDF

- Click en el botón **"PDF"** (azul) para descargar la certificación como archivo PDF
- El PDF incluye: encabezado con número de certificación, proyecto, contratista, período, tabla de partidas con todas las columnas y total
- El nombre del archivo se genera automáticamente: `Certificacion_{número}_{contratista}.pdf`

### Imprimir certificación

- Click en el ícono de impresora para imprimir el documento
- Los estilos de impresión ocultan el sidebar y navbar, dejando solo el contenido de la certificación como documento formal

### Filtros

- **Contratista**: filtra por contratista específico
- **Estado**: Borrador, Enviada, Aprobada, Rechazada

---

## 12. Calendario de Obra

**Ruta:** `/calendar`

Vista mensual que muestra todos los eventos relevantes del proyecto activo.

### Tipos de eventos

| Tipo | Color | Descripción |
|------|-------|-------------|
| **Vencimiento de pago** | Amarillo/Rojo | Fecha de vencimiento de un pago pendiente o vencido |
| **Pago realizado** | Verde | Fecha en que se realizó un pago |
| **Certificación** | Azul/Violeta | Fecha de cierre del período de una certificación |
| **Inicio de obra** | Índigo | Fecha de inicio del proyecto |
| **Fin estimado/real** | Índigo | Fecha de fin estimado o real del proyecto |

### Navegación

- Usá las flechas **< >** para navegar entre meses
- Los eventos se muestran como etiquetas coloreadas dentro de cada día
- En mobile, se muestran como puntos de color

### Panel lateral

- **Click en un día**: muestra los eventos de ese día en el panel derecho
- **Sin selección**: muestra los próximos eventos del proyecto
- Cada evento muestra: título, tipo, fecha y monto (si aplica)

---

## 13. Gastos Adicionales

**Ruta:** `/expenses`

Gastos del proyecto como materiales, equipamiento, permisos, etc. Pueden vincularse opcionalmente a una partida del presupuesto.

### Crear un gasto

1. Click en **"Nuevo gasto"**
2. Completá:
   - **Descripción** (obligatorio)
   - **Cantidad** (obligatorio, por defecto 1)
   - **Precio unitario** (obligatorio)
   - **Total**: se calcula automáticamente (cantidad × precio unitario)
   - **Tipo**: Materiales, Equipamiento, Gastos generales, Permisos, Otros
   - **Partida** (opcional): vincular el gasto a una partida específica del presupuesto. La partida aparece agrupada por rubro en el selector
   - **Fecha** (por defecto: hoy)
   - **Ref. factura** (opcional)
   - **Notas** (opcional)
3. Click en **"Crear gasto"**

### Vinculación a partidas

Cuando un gasto se vincula a una partida del presupuesto:
- Aparece en la columna "Partida" de la tabla de gastos
- Se refleja en el análisis de variación (tab Variación en Finanzas) como ejecución adicional contra esa partida
- Permite rastrear qué gastos corresponden a qué ítems del presupuesto

### Resumen por tipo

Debajo de los filtros se muestran tarjetas con el total gastado por cada tipo de gasto.

### Tabla de gastos

La tabla muestra: Fecha, Descripción, Tipo, Partida vinculada, Cantidad, Precio unitario, Total, Factura y acciones de editar/eliminar.

### Filtros

- **Tipo**: filtrar por tipo de gasto
- **Buscar**: por descripción, referencia de factura o nombre de partida

---

## 14. Catálogo de Materiales

**Ruta:** `/materials`

Base de datos global de materiales con precios unitarios. Los materiales se comparten entre todos los proyectos y alimentan el Análisis de Precios Unitarios (APU).

### Crear material

1. Click en **"Nuevo material"**
2. Completar los campos:
   - **Nombre** (obligatorio): ej. "Cemento Portland"
   - **Unidad base** (obligatorio): m², m³, ml, unidad, kg, ton, global
   - **Categoría**: Cemento, Acero, Madera, Áridos, Cerámicos, Plomería, Electricidad, Pintura, Impermeabilización, Ferretería, Otros
   - **Presentación** (obligatorio, default 1): cuántas unidades base vienen en el envase de compra. Ej: si el cemento se compra en bolsas de 50 kg, la unidad base es "kg" y la presentación es "50"
   - **Precio por envase** (obligatorio): precio del envase completo. El sistema calcula automáticamente el precio por unidad base (ej: $57.000 / 50 kg = $1.140/kg)
   - **Marca** (opcional): ej. "Loma Negra"
   - **Proveedor** (opcional): ej. "Corralón El Obrero"
   - **Notas** (opcional)
3. Click en **"Crear material"**

> **Ejemplo:** Cemento en bolsa de 50 kg a $57.000 → Unidad: kg, Presentación: 50, Precio envase: $57.000. El APU usará $1.140/kg para calcular costos.

### Editar / Eliminar

- **Editar**: click en el ícono de lápiz en la fila del material
- **Eliminar**: click en el ícono de papelera. Si el material está en uso en algún APU, se desactiva en lugar de eliminarse

### Filtros

- **Categoría**: filtrar por tipo de material
- **Buscar**: por nombre del material

> **Nota:** Los cambios de precio en el catálogo NO se propagan automáticamente a los APU existentes. Usar "Actualizar Precios" dentro del APU de cada partida para refrescar.

---

## 15. Análisis de Precios Unitarios (APU)

**Acceso:** Desde la página de Cómputo Métrico (`/budget/:projectId`), click en el ícono de matraz (🧪) en la columna de acciones de cada partida.

El APU desglosa el costo unitario de cada partida en materiales + mano de obra. Cuando se modifica el APU, el precio unitario de costo de la partida se actualiza automáticamente, propagando el cambio al subtotal y al resumen financiero del proyecto.

### Agregar materiales al APU

1. Abrir el APU de una partida (ícono 🧪)
2. En la sección **Materiales**, click en **"Agregar"**
3. Seleccionar el material del catálogo
4. Indicar el **consumo por unidad** (ej. 12.5 ladrillos por m²)
5. Indicar el **desperdicio %** (ej. 5% por rotura)
6. Click en **"Agregar"**

**Fórmula:** `Subtotal = consumo/unidad × (1 + desperdicio%/100) × precio unitario`

### Agregar mano de obra al APU

1. En la sección **Mano de Obra**, click en **"Agregar"**
2. Descripción (ej. "Oficial albañil")
3. Costo por unidad de medida de la partida
4. Click en **"Agregar"**

### Edición inline

- Los campos de consumo, desperdicio, descripción y costo de M.O. se editan directamente en la tabla. Al perder foco (blur), se guarda automáticamente.

### Actualizar precios

- Click en **"Actualizar precios"** para sincronizar los precios de materiales desde el catálogo global. Esto recalcula todos los subtotales y el costo unitario de la partida.

### Cascada de cálculo

```
APU modificado → costUnitPrice actualizado → costSubtotal recalculado → BudgetSummary actualizado
```

> **Importante:** Si se edita manualmente el P.U. Costo de una partida que tiene APU, el valor manual será sobreescrito la próxima vez que se modifique el APU.

---

## 16. Cobros del Cliente

**Ruta:** `/client-payments`

Registro de ingresos del proyecto: anticipos, cobros por avance de obra y pagos finales del cliente.

### Cards de resumen

- **Total Presupuestado**: suma de subtotales de venta del cómputo métrico
- **Total Cobrado**: suma de todos los cobros registrados
- **Saldo Pendiente**: presupuestado - cobrado, con barra de progreso visual

### Registrar cobro

1. Click en **"Nuevo cobro"**
2. Completar:
   - **Monto** (obligatorio)
   - **Fecha** (obligatorio)
   - **Concepto**: Anticipo, Avance, Final, Liberación de retención, Otro
   - **Método de pago**: Efectivo, Transferencia, Cheque, Otro
   - **Referencia** (opcional): número de transferencia, recibo, etc.
   - **Notas** (opcional)
3. Click en **"Registrar cobro"**

### Impacto en Finanzas

Cada cobro actualiza automáticamente:
- El **flujo de caja** (cobros - pagos a contratistas - gastos)
- Las métricas de la página de **Finanzas**

### Filtros

- **Concepto**: filtrar por tipo de cobro
- **Buscar**: por referencia o notas

---

## 17. Finanzas

**Ruta:** `/finance`

Análisis financiero completo del proyecto activo, dividido en 5 tabs:

### Tab: Resumen

- **Ingresos estimados**: suma de subtotales de venta de todas las partidas
- **Costo de partidas**: suma de subtotales de costo
- **Gastos adicionales**: suma de todos los gastos del proyecto
- **Ganancia bruta**: ingresos - costos - gastos
- **Margen de ganancia (%)**: ganancia / ingresos x 100
- **Cobros del cliente**: total cobrado al cliente
- **Pendiente del cliente**: presupuestado - cobrado
- **Flujo de caja**: cobros - pagos a contratistas - gastos (positivo = superávit)
- **Gráfico de torta**: distribución de gastos por tipo
- **Tabla de márgenes por partida**: detalle de cada partida con margen individual
- **Botón "Exportar Excel"**: descarga el análisis financiero completo

### Tab: Flujo de Caja

- Gráfico de barras mensual con:
  - **Pagado**: montos efectivamente pagados
  - **Programado**: montos pendientes con fecha de vencimiento
  - **Predicho**: montos estimados basados en patrones históricos
- Línea de acumulado

### Tab: Predicciones

- Predicciones de pagos futuros por contratista basadas en:
  - Historial de pagos anteriores
  - Montos acordados vs pagados
  - Frecuencia de pagos
- Nivel de confianza: Alto (3+ pagos previos), Medio (1-2), Ninguno

### Tab: Variación (Presupuesto vs Real)

Análisis línea por línea comparando lo presupuestado contra lo realmente ejecutado:

- **KPIs superiores**: costo presupuestado, comprometido (asignaciones), ejecutado (pagado) y variación total con porcentaje
- **Tarjetas de estado**: cantidad de partidas sobre presupuesto, en línea y bajo presupuesto. Hacer clic en una tarjeta filtra la tabla
- **Tabla expandible por rubro**: cada categoría se expande para mostrar sus partidas
  - **Columnas**: presupuestado, comprometido, pagado, pendiente, certificado, variación ($) y variación (%)
  - **Estado por partida**:
    - Sobre presupuesto (rojo): ejecutado supera el presupuesto en más de 5%
    - En línea (verde): ejecución dentro del rango esperado
    - Bajo presupuesto (azul): ejecución significativamente menor al presupuesto
  - **Avance físico**: porcentaje de avance medido por partida
- **Botones**: "Expandir todo" / "Colapsar todo" para navegar rápidamente
- **Exportar Excel**: los datos de variación se incluyen en la exportación financiera como una hoja adicional

### Tab: Alertas

- Lista de alertas de deuda ordenadas por severidad:
  - **Crítica**: deuda vencida > 30 días
  - **Alta**: deuda vencida 15-30 días
  - **Media**: deuda vencida 1-15 días

---

## 18. Reportes

**Ruta:** `/reports`

Resumen ejecutivo del proyecto activo con toda la información consolidada.

### Contenido

- **Gráfico de distribución de pagos**: torta con pagado/pendiente/vencido
- **Avance de obra**: porcentaje general
- **KPIs**: pagado, pendiente, vencido, ejecución presupuestaria
- **Detalle de presupuesto**: estimado, ejecutado, comprometido, restante
- **Links rápidos**: a Dashboard, Pagos, Cómputo, Proyectos

### Exportar

- **Excel**: descarga un archivo con 4 hojas: Presupuesto, Pagos, Gastos, Resumen Financiero
- **Imprimir**: imprime la página como reporte formal (usa los estilos de impresión)

---

## 19. Equipo (Miembros)

**Ruta:** `/members`

Gestión de accesos y roles de los miembros del proyecto activo.

### Agregar un miembro

1. Click en **"Agregar miembro"** (solo visible para ADMIN del proyecto)
2. Ingresá el **email** del usuario (debe estar registrado en BuildControl)
3. Seleccioná el **rol**:
   - **Administrador**: acceso total al proyecto
   - **Editor**: puede crear y editar datos
   - **Lector**: solo puede ver información (solo lectura)
4. Click en **"Agregar"**

### Cambiar rol

- Como ADMIN, seleccioná un nuevo rol en el dropdown junto al miembro
- El cambio se aplica inmediatamente

### Quitar miembro

- Click en el ícono de papelera junto al miembro
- Confirmar en el modal

### Restricciones

- No podés cambiar tu propio rol ni quitarte del proyecto
- Solo ADMIN puede gestionar miembros

---

## 20. Notificaciones

**Ruta:** `/notifications`

### Tipos de notificación

| Tipo | Descripción |
|------|-------------|
| **Pago próximo** | Un pago vence dentro de los próximos 3 días |
| **Pago vencido** | Un pago superó su fecha de vencimiento |
| **Actualización de proyecto** | Cambios en el proyecto |
| **Asignación creada** | Se asignó una partida a un contratista |
| **General** | Notificaciones del sistema |

### Acciones

- **Marcar como leída**: click en una notificación individual
- **Marcar todas como leídas**: botón en la cabecera
- **Filtrar no leídas**: checkbox para ver solo las pendientes
- **Badge en sidebar**: muestra la cantidad de notificaciones sin leer

### Generación automática

Un cron job cada 15 minutos verifica:
- Pagos recién vencidos
- Pagos que vencen en 3 días
- Presupuesto excedido (comprometido > estimado)

Se evitan duplicados: no se genera la misma alerta dos veces en 24 horas.

---

## 21. Actividad (Auditoría)

**Ruta:** `/activity`

Registro completo de todas las acciones realizadas en los proyectos.

### Información registrada

Cada entrada incluye:
- **Acción**: qué se hizo (creó, editó, eliminó, aprobó, etc.)
- **Tipo de entidad**: proyecto, partida, pago, certificación, etc.
- **Usuario**: quién realizó la acción
- **Fecha y hora**

### Acciones registradas

| Acción | Descripción |
|--------|-------------|
| Creó/Editó/Eliminó proyecto | Gestión de proyectos |
| Creó/Eliminó rubro | Gestión de categorías del presupuesto |
| Creó/Editó/Eliminó partida | Gestión de items del presupuesto |
| Creó/Editó/Eliminó contratista | Gestión de contratistas |
| Creó/Editó/Eliminó pago | Gestión de pagos |
| Creó/Editó/Eliminó asignación | Asignación de partidas a contratistas |
| Creó/Editó/Eliminó gasto | Gastos adicionales |
| Registró/Editó/Eliminó avance | Mediciones de avance físico |
| Creó/Editó/Eliminó certificación | Gestión de certificaciones |
| Envió/Aprobó/Rechazó certificación | Flujo de aprobación |
| Generó pago de certificación | Pago automático desde certificación aprobada |
| Subió/Eliminó archivo | Gestión de adjuntos |

### Filtros

- **Proyecto**: filtrar por proyecto específico o "Todos los proyectos"
- **Paginación**: 30 registros por página

### Exportar

- Click en **"Exportar Excel"** para descargar el historial filtrado con columnas: Fecha, Acción, Entidad, Usuario

---

## 22. Configuración de Cuenta

**Ruta:** `/settings`

### Información personal

- Editar **Nombre** y **Apellido**
- Ver email y rol global (solo lectura)
- Avatar con iniciales

### Cambiar contraseña

1. Ingresá la **contraseña actual**
2. Ingresá la **nueva contraseña** (mínimo 6 caracteres)
3. **Confirmá** la nueva contraseña
4. Click en **"Cambiar contraseña"**

---

## 23. Administración de Usuarios

**Ruta:** `/admin/users`

Solo accesible para usuarios con rol global ADMIN o SUPER_ADMIN.

### Funcionalidades

- **Listado de usuarios**: tabla con nombre, email, rol, proyectos, estado, fecha de registro
- **Cambiar rol global**: dropdown para asignar Super Admin, Administrador o Usuario (solo SUPER_ADMIN)
- **Activar/Desactivar**: toggle para permitir o bloquear el acceso de un usuario
- **Búsqueda**: por nombre o email
- **Filtros**: por rol y por estado (activo/inactivo)

### Roles globales

| Rol | Permisos |
|-----|----------|
| **Super Admin** | Acceso total al sistema, puede cambiar roles de otros usuarios |
| **Administrador** | Puede ver y gestionar usuarios |
| **Usuario** | Acceso normal, depende de los roles por proyecto |

---

## 24. Archivos Adjuntos

El sistema permite adjuntar archivos a distintas entidades:

### Entidades que soportan adjuntos

- **Pagos**: comprobantes, facturas, recibos (en el detalle del pago)
- **Contratistas**: contratos, seguros, documentación (en el detalle del contratista)

### Formatos aceptados

- **Imágenes**: JPEG, PNG, WebP, GIF
- **Documentos**: PDF, Word (.doc, .docx), Excel (.xls, .xlsx)
- **Comprimidos**: ZIP, RAR
- **Límite**: máximo 5 archivos por upload, 10 MB cada uno

### Subir archivos

1. **Drag & drop**: arrastrá archivos a la zona de upload
2. **Click**: hacé click en la zona para abrir el explorador de archivos
3. **Modo compacto**: botón "Adjuntar archivo" en interfaces más pequeñas

### Gestión

- **Preview**: las imágenes muestran miniatura, otros archivos muestran ícono
- **Descargar**: click en el ícono de descarga
- **Eliminar**: click en el ícono de papelera (con confirmación)

---

## 25. Roles y Permisos

### Roles globales (del sistema)

| Acción | Super Admin | Admin | Usuario |
|--------|:-----------:|:-----:|:-------:|
| Ver/gestionar usuarios | Si | Si | No |
| Cambiar roles globales | Si | No | No |
| Activar/desactivar usuarios | Si | No | No |
| Crear proyectos | Si | Si | Si |

### Roles por proyecto

| Acción | Admin | Editor | Lector |
|--------|:-----:|:------:|:------:|
| Ver datos del proyecto | Si | Si | Si |
| Crear/editar partidas | Si | Si | No |
| Crear/editar pagos | Si | Si | No |
| Crear/editar certificaciones | Si | Si | No |
| Aprobar/rechazar certificaciones | Si | Si | No |
| Gestionar miembros | Si | No | No |
| Eliminar proyecto | Si | No | No |

### Proyecto vs Global

- El rol **global** determina acceso a funciones del sistema (admin de usuarios)
- El rol **por proyecto** determina qué puede hacer dentro de cada proyecto
- Un usuario puede tener diferentes roles en diferentes proyectos

---

## 26. Atajos y Tips

### Cómputo Métrico

| Atajo | Acción |
|-------|--------|
| **Tab** | Ir a la siguiente celda |
| **Shift+Tab** | Ir a la celda anterior |
| **Enter** | Confirmar y bajar a la siguiente fila |
| **Esc** | Cancelar edición |
| **Flechas** | Navegar entre celdas |

### Tips generales

- **Selector de proyecto**: cambiar el proyecto en el sidebar actualiza todas las páginas simultáneamente
- **Imprimir**: cualquier página puede imprimirse limpiamente con Ctrl+P
- **Notificaciones**: el badge rojo en la campana indica cuántas alertas sin leer tenés
- **Autoguardado**: en el cómputo métrico, los cambios se guardan automáticamente
- **Responsive**: toda la aplicación funciona en tablet y móvil

### Flujo recomendado para una obra nueva

1. **Crear proyecto** con datos básicos
2. **Cargar cómputo métrico**: rubros y partidas con cantidades y precios
3. **Registrar contratistas** del proyecto
4. **Asignar partidas** a cada contratista con montos acordados
5. **Registrar avance físico** a medida que se ejecuta la obra
6. **Crear certificaciones** periódicas para formalizar el avance
7. **Generar pagos** desde las certificaciones aprobadas
8. **Monitorear** desde el Dashboard y Finanzas

---

## Soporte

Para reportar problemas o sugerencias, contactar al administrador del sistema.

---

*Este manual se actualiza automáticamente con cada mejora al sistema.*
