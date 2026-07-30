# Guía de Uso — BuildControl

**Para quien usa el sistema todos los días**

Esta guía está organizada por **lo que necesitás hacer**, no por pantallas. Si buscás el detalle
de cada campo y cada botón, está en el [Manual de Usuario](MANUAL_USUARIO.md) — este documento
te dice *qué hacer, en qué orden y por qué*.

---

## Tabla de Contenidos

1. [Qué hace BuildControl](#1-qué-hace-buildcontrol)
2. [Diez palabras que tenés que entender](#2-diez-palabras-que-tenés-que-entender)
3. [Tus primeros 10 minutos](#3-tus-primeros-10-minutos)
4. [Empezá acá según tu rol](#4-empezá-acá-según-tu-rol)
5. [Flujo A — Arrancar una obra nueva](#5-flujo-a--arrancar-una-obra-nueva)
6. [Flujo B — Cargar el presupuesto con precios reales](#6-flujo-b--cargar-el-presupuesto-con-precios-reales)
7. [Flujo C — Contratar y repartir el trabajo](#7-flujo-c--contratar-y-repartir-el-trabajo)
8. [Flujo D — El ciclo del mes: medir, certificar, pagar](#8-flujo-d--el-ciclo-del-mes-medir-certificar-pagar)
9. [Flujo E — La plata que entra y la que sale](#9-flujo-e--la-plata-que-entra-y-la-que-sale)
10. [Flujo F — Controlar que la obra no se desvíe](#10-flujo-f--controlar-que-la-obra-no-se-desvíe)
11. [Recetas rápidas: "cómo hago para…"](#11-recetas-rápidas-cómo-hago-para)
12. [Cómo leer los números](#12-cómo-leer-los-números)
13. [Problemas comunes y qué hacer](#13-problemas-comunes-y-qué-hacer)
14. [Errores que cuestan caro](#14-errores-que-cuestan-caro)
15. [Referencia rápida](#15-referencia-rápida)

---

## 1. Qué hace BuildControl

BuildControl responde cuatro preguntas que en una obra normalmente se contestan con planillas
sueltas y memoria:

| Pregunta | Dónde te la contesta |
|----------|----------------------|
| ¿Cuánto va a costar y cuánto voy a ganar? | Cómputo Métrico + Finanzas |
| ¿Cuánto se ejecutó realmente hasta hoy? | Avance físico + Certificaciones |
| ¿A quién le debo, cuánto y desde cuándo? | Pagos + Deudas |
| ¿Me estoy pasando del presupuesto? | Finanzas → Variación |

La idea central: **cargás el presupuesto una vez, y todo lo demás cuelga de ahí.** Los
contratistas se asignan a partidas del presupuesto, las certificaciones salen de esas
asignaciones, los pagos salen de las certificaciones, y los desvíos se calculan solos.

Si el presupuesto está mal cargado, todo lo demás va a estar mal. Vale la pena tomarse el tiempo.

---

## 2. Diez palabras que tenés que entender

Sin esto el sistema no se entiende. Con esto, se entiende casi solo.

**Proyecto** — Una obra. Todo en el sistema pertenece a un proyecto, excepto el catálogo de
materiales y los contratistas, que se comparten entre todas las obras.

**Rubro** — Un capítulo del presupuesto: "Mampostería", "Instalaciones Sanitarias", "Pintura".
Sirve para agrupar.

**Partida** — La línea concreta del presupuesto: *"Revoque interior a la cal — m² — 320 — $45.000"*.
Es la unidad básica de todo el sistema. Todo se cuelga de la partida.

**P.U. Costo vs P.U. Venta** — Lo que te cuesta hacer un m² y lo que le cobrás al cliente por ese
m². La diferencia es tu ganancia. **Cargá las dos**: si solo cargás una, Finanzas no te va a poder
mostrar margen.

**APU (Análisis de Precios Unitarios)** — El desglose de *por qué* un m² de revoque cuesta $45.000:
tantos kg de cemento, tantas horas de oficial, etc. Si cargás el APU, el sistema calcula el
P.U. Costo por vos — y lo recalcula solo cuando cambia el precio de un material.

**Asignación** — El compromiso con un contratista: *"a Pérez le doy 200 de los 320 m² de revoque
por $8.500.000"*. Es lo que convierte un presupuesto en un contrato.

**Avance físico** — Cuánto se ejecutó de verdad, medido en obra. Se carga como mediciones parciales
(hoy 40 m², la semana que viene 55 m²) y el sistema acumula.

**Certificación** — El documento formal del mes: "en este período Pérez ejecutó esto, por este
monto". Pasa por un circuito de aprobación y es lo que habilita el pago.

**Pago** — La orden de pago a un contratista. Nace pendiente, se marca como pagada, y si se pasa
la fecha de vencimiento el sistema la marca vencida sola.

**Cobro** — Plata que entra del cliente: anticipos, cobros por avance, pago final.

> **La cadena completa:** Partida → Asignación → Avance físico → Certificación → Pago.
> Cada eslabón se alimenta del anterior. Si te salteás uno, el siguiente te va a pedir datos a mano.

---

## 3. Tus primeros 10 minutos

### Entrar

1. Abrí la aplicación e iniciá sesión con tu email y contraseña.
2. Si todavía no tenés cuenta, usá **Registrarse** — o pedile a un administrador que te dé acceso.

### Elegir el proyecto activo — lo más importante de toda la interfaz

Arriba a la izquierda, debajo del logo, hay un selector que dice **"Proyecto activo"**.

**Casi todas las pantallas muestran únicamente los datos del proyecto que está seleccionado ahí.**

Si abrís Pagos y no ves nada, o ves pagos que no esperabas: mirá primero ese selector. Es la causa
número uno de confusión de los usuarios nuevos.

Las únicas excepciones, que muestran todo junto sin importar el selector, son:

- **Materiales** y **Compras** — el catálogo es global
- **Contratistas** — se comparten entre obras
- **Proyectos** — la lista de todas tus obras
- **Vista general** del Dashboard — compara todas tus obras entre sí

### Moverse

El menú de la izquierda está ordenado más o menos en el orden en que vas a usar las cosas:
primero planificar (Proyectos, Cómputo Métrico), después contratar (Contratistas, Asignaciones),
después ejecutar (Pagos, Certificaciones, Calendario), después registrar (Gastos, Materiales,
Compras, Cobros) y al final analizar (Finanzas, Reportes).

En celular el menú está detrás del botón de hamburguesa arriba a la izquierda. Toda la aplicación
funciona en celular y tablet — útil para cargar mediciones parado en la obra.

La campanita de **Notificaciones** con el número rojo son cosas que requieren tu atención: pagos
por vencer, certificaciones esperando aprobación.

---

## 4. Empezá acá según tu rol

### Sos dueño, gerente o director de obra

Tu pantalla de todos los días es el **Dashboard**, y una vez por semana **Finanzas → Variación**.

- **Dashboard** te dice: cuánto pagué, cuánto debo, cuánto está vencido, y qué porcentaje de la
  obra está hecho.
- **Vista general** (botón arriba a la derecha del Dashboard) te compara todas tus obras en una
  tabla, con el margen de ganancia de cada una.
- **Finanzas → Variación** te dice, partida por partida, dónde te estás pasando de presupuesto.
  Es el reporte que más plata salva.
- **Finanzas → Alertas** te ordena las deudas vencidas por gravedad.

Lo que cargás vos: proyectos, presupuesto inicial, aprobación de certificaciones.

### Sos jefe de obra o capataz

Tu tarea principal es **cargar el avance físico**, y conviene hacerlo desde el celular en la obra.

1. Menú → **Cómputo Métrico**
2. Buscá la partida que medís
3. Tocá la **barra de avance** de esa partida
4. Cargá la cantidad ejecutada, la fecha y una nota si hace falta
5. **Registrar avance**

Hacelo seguido — cada semana es mejor que cada mes. Las mediciones se acumulan, así que cargás
solo lo nuevo, no el total.

También vas a usar el **Calendario** para ver qué se vence, y **Certificaciones** para cargar las
cantidades del período.

### Sos administración, compras o contabilidad

Tus pantallas son **Pagos**, **Cobros**, **Compras** y **Gastos**.

- Cada factura de material que entra → **Compras**. Esto mantiene los precios al día solo.
- Cada gasto que no es contratista ni material → **Gastos**.
- Cada peso que entra del cliente → **Cobros**.
- Cada pago a contratista → **Pagos**, y cuando se paga, **marcarlo como pagado** con método,
  fecha y número de factura.

Subí los comprobantes al detalle de cada pago. Cuando alguien pregunte "¿esto se pagó?", la
respuesta y el respaldo están en el mismo lugar.

### Solo necesitás mirar

Si tenés rol **Lector** en un proyecto, ves todo pero no podés modificar nada. Los botones de
crear y editar simplemente no aparecen. Podés exportar a Excel y PDF sin problema.

---

## 5. Flujo A — Arrancar una obra nueva

El orden importa. Si te salteás pasos, después tenés que volver.

```
1. Crear el proyecto
2. Cargar rubros y partidas          ← el trabajo grande
3. Cargar contratistas
4. Asignar partidas a contratistas
5. Sumar al equipo a quien corresponda
```

### Paso 1 — Crear el proyecto

Menú → **Proyectos** → **Nuevo proyecto**.

Nombre y estado son lo mínimo. Cargá también dirección y presupuesto inicial si los tenés — el
presupuesto inicial es solo referencia, el número real va a salir del cómputo métrico.

Estados disponibles: **Planificación**, **En progreso**, **Pausado**, **Completado**, **Cancelado**.
Arrancá en Planificación y pasalo a En progreso cuando la obra empiece de verdad.

Quien crea el proyecto queda automáticamente como **Admin** de ese proyecto.

### Paso 2 — Cargar rubros y partidas

Menú → **Cómputo Métrico**. Funciona como una planilla de cálculo: hacés clic en una celda,
escribís, y se guarda solo.

1. **Nueva categoría** → nombre del rubro ("Movimiento de suelos")
2. Dentro del rubro, **Agregar partida** al pie de la tabla
3. Completá la fila: Descripción, Unidad, Cantidad, **P.U. Costo**, **P.U. Venta**

Los subtotales de costo y venta se calculan solos, se suman por rubro y se suman por proyecto.

**Movete con el teclado, no con el mouse** — es varias veces más rápido:

| Tecla | Hace |
|-------|------|
| **Tab** | Siguiente celda |
| **Shift+Tab** | Celda anterior |
| **Enter** | Confirma y baja a la fila siguiente |
| **Esc** | Cancela lo que estabas escribiendo |
| **Flechas** | Navegar entre celdas |

Otras cosas útiles acá:

- **Duplicar** una partida (ícono de copia) cuando tenés varias parecidas
- Arrastrar el ícono **☰** para reordenar rubros o partidas
- **Partida con APU** si querés que el sistema calcule el costo en vez de tipearlo (ver Flujo B)

### Paso 3 — Cargar contratistas

Menú → **Contratistas** → **Nuevo contratista**.

Solo el nombre es obligatorio, pero cargá RUC/CUIT, teléfono y email — después los vas a necesitar
y nadie se acuerda dónde estaban.

Los contratistas son **globales**: los cargás una vez y los usás en todas las obras. El detalle
de cada uno te muestra cuánto le debés sumando todos los proyectos.

Subí contratos y seguros a la zona de **Documentación adjunta** del contratista.

### Paso 4 — Asignar partidas

Acá es donde el presupuesto se convierte en compromisos. Desde el detalle del contratista →
**Asignar partida**:

- **Partida**: qué va a hacer
- **Cantidad asignada**: cuánto de esa partida (podés repartir una partida entre dos contratistas)
- **Precio acordado**: el monto total pactado con él por ese trabajo

Dos reglas que el sistema te va a hacer cumplir:

- No podés asignar más cantidad que la presupuestada en la partida
- Un contratista no puede estar asignado dos veces a la misma partida

> **El precio acordado no tiene que coincidir con tu presupuesto.** Justamente ahí está el
> negocio: si presupuestaste el revoque a $45.000/m² y lo contrataste a $42.000/m², ganás la
> diferencia. Finanzas → Variación te muestra esa brecha en cada partida.

Revisá **Asignaciones** al terminar: las partidas que quedaron sin contratista aparecen con un
badge amarillo **"Sin asignar"**. Es tu checklist de lo que falta contratar.

### Paso 5 — Sumar al equipo

Menú → **Equipo** → agregá a los usuarios que tienen que ver esta obra, con su rol:

- **Admin** — todo, incluso gestionar miembros y borrar el proyecto
- **Editor** — cargar y editar datos, aprobar certificaciones; no gestiona miembros
- **Lector** — solo mirar y exportar

---

## 6. Flujo B — Cargar el presupuesto con precios reales

Este flujo es opcional pero es el que hace que el sistema valga la pena. La diferencia:

- **Sin APU**: escribís "$45.000/m²" a mano. Cuando el cemento aumenta, tenés que recalcular todo
  a mano y probablemente no lo hagas.
- **Con APU**: cargás qué lleva un m² de revoque. Cuando registrás una compra de cemento más caro,
  **el sistema recalcula solo** el costo de todas las partidas que usan cemento, los subtotales y
  el margen del proyecto.

### Primero: el catálogo de materiales

Menú → **Materiales** → **Nuevo material**.

El único campo que confunde a todo el mundo es **Presentación**, así que va con ejemplo:

> El cemento se vende en bolsas de 50 kg a $57.000 la bolsa.
> - **Unidad base**: `kg` ← la unidad en la que lo vas a consumir en el APU
> - **Presentación**: `50` ← cuántas unidades base trae el envase
> - **Precio por envase**: `57.000` ← lo que pagás por la bolsa entera
>
> El sistema calcula solo: **$1.140/kg**. Ese es el precio que usa el APU.

Si un material se vende por unidad suelta, la Presentación es `1`.

El sistema te avisa si el nombre ya existe, ignorando mayúsculas, acentos y espacios de más
("cemento portland" y "Cemento Pórtland" son el mismo material para el sistema). Si de verdad son
distintos — el mismo insumo de dos proveedores — podés crearlo igualmente y diferenciarlos por
Marca y Proveedor.

### Después: el APU de la partida

En el Cómputo Métrico, ícono de **matraz (🧪)** en la fila de la partida. Cargás:

- **Materiales**: cuánto de cada material lleva **una unidad** de la partida (para 1 m² de revoque,
  no para los 320 m²)
- **Mano de obra**: las horas o jornales por unidad, con su costo

El costo unitario se calcula y sube a la partida, al subtotal del rubro, al total del proyecto y
al margen en Finanzas. En cascada, solo.

También podés crear la partida ya con su APU cargado usando **Partida con APU** en el Cómputo
Métrico: te deja elegir una **plantilla** del catálogo maestro o cargar el subrubro a mano.

### Y después: mantener los precios al día

Menú → **Compras** → **Nueva compra**, cada vez que entra una factura de material.

Al guardar, el sistema te confirma el efecto:

> *"Compra registrada. Precio actualizado en 8 partidas del cómputo métrico."*

Cómo funciona el precio del catálogo, en corto:

- El catálogo toma siempre el precio de la **compra más reciente por fecha**
- Si cargás una compra con fecha retroactiva y ya hay una más nueva, el catálogo respeta la más nueva
- Si editás o borrás la compra más reciente, todo se recalcula (al borrarla vuelve al precio anterior)

> **Truco:** si querés seguir los precios de mercado sin tener facturas, cargá compras
> "informativas" con cantidad mínima. Lo único que importa para el catálogo es el último precio.

---

## 7. Flujo C — Contratar y repartir el trabajo

Ya está cubierto en el [Paso 4 del Flujo A](#paso-4--asignar-partidas). Lo que agregamos acá es
cómo **controlar** las asignaciones una vez que la obra está en marcha.

Menú → **Asignaciones**. Arriba tenés cuánto comprometiste en total, cuánto pagaste, cuántos
contratistas activos y cuánta deuda vencida. Y dos formas de mirar lo mismo:

**Por partida** — ¿está todo el presupuesto contratado?
Agrupado por rubro, con presupuestado, contratado, pagado, pendiente y varianza. Las partidas sin
contratista salen marcadas en amarillo. Usá esta vista cuando estás cerrando contrataciones.

**Por contratista** — ¿cómo vengo con cada uno?
Cuánto le acordé, cuánto le pagué, cuánto le queda, cuánto está vencido, con barra de ejecución.
Usá esta vista antes de una reunión con un contratista.

No vas a poder borrar una asignación que ya tenga pagos pendientes o pagados. Si la relación se
cortó, cancelá los pagos primero.

---

## 8. Flujo D — El ciclo del mes: medir, certificar, pagar

Este es el flujo que vas a repetir todos los meses de la obra. Es el corazón del sistema.

```
Durante el mes    →  Cargar mediciones de avance físico
Fin del mes       →  Crear certificación del período
                  →  Cargar cantidades ejecutadas
                  →  Enviar
Aprobación        →  Aprobar (o rechazar con motivo)
                  →  Generar pago
Pago              →  Marcar como pagado + adjuntar comprobante
```

### Durante el mes: medir

Cómputo Métrico → clic en la barra de **Avance** de la partida → cargá cantidad, fecha y notas →
**Registrar avance**.

Cargás **solo lo nuevo del período**, no el acumulado. El modal te muestra presupuestado, medido y
restante, más el historial completo de mediciones con quién cargó cada una.

Esto alimenta el anillo de **Avance de Obra** del Dashboard, que está ponderado por valor: una
partida de $100.000 al 50% pesa más que una de $1.000 al 100%. Es decir, el porcentaje que ves
refleja plata ejecutada, no cantidad de partidas terminadas.

### Fin del mes: certificar

Menú → **Certificaciones** → **Nueva certificación**. Elegís contratista y el período (desde /
hasta).

El sistema **genera solo una línea por cada partida asignada a ese contratista**. No las cargás a
mano — por eso importaba hacer bien las asignaciones.

En el detalle, la tabla te muestra por cada partida:

| Columna | Qué es |
|---------|--------|
| **Anterior** | Lo ya certificado en certificaciones aprobadas previas |
| **Actual** | Lo que certificás en este período ← **esto es lo único que editás** |
| **Acumulado** | Anterior + Actual |
| **Monto** | Actual × precio unitario |

Llenás la columna **Actual** y el total se recalcula. Estando en **Borrador** podés editar libremente.

### Aprobar

Con al menos una cantidad mayor a cero, **Enviar**. Ahí queda congelada — ya no se edita.

Un usuario con rol **Admin** o **Editor** del proyecto puede:

- **Aprobar** → queda firme y habilita generar el pago
- **Rechazar** → hay que escribir el motivo, que queda visible en un banner rojo. El contratista
  o quien la cargó usa **Corregir y reenviar**, vuelve a Borrador, arregla y manda de nuevo.

### Generar el pago

Desde una certificación **Aprobada** → **Generar pago**. Dos opciones:

- **Certificado completo** — un solo pago pendiente por el total
- **Por partidas** — elegís partidas con checkbox y sale un pago por cada una

La segunda opción sirve cuando pagás en tandas. Las partidas que ya tienen pago generado quedan
deshabilitadas con la etiqueta "Pago generado", así que no podés pagar dos veces lo mismo. Si ya
hubo pagos parciales, el sistema te obliga a usar el modo por partidas para el resto.

Podés bajar la certificación en **PDF** (botón azul) o imprimirla (ícono de impresora) — sale como
documento formal, sin menús.

### Pagar

Menú → **Pagos**. El pago nació en estado **Pendiente**. Cuando se paga de verdad:

- En la lista: ícono de **check verde**
- En el detalle: botón **Marcar como Pagado**

Se abre un modal para completar método de pago, fecha (no puede ser futura) y número de factura.
Después entrá al detalle del pago y **subí el comprobante** en la zona de adjuntos.

Los estados y cómo se mueven:

| Estado | Color | Significa |
|--------|-------|-----------|
| **Pendiente** | Amarillo | Registrado, sin pagar |
| **Pagado** | Verde | Listo (estado final) |
| **Vencido** | Rojo | Se pasó la fecha de vencimiento |
| **Cancelado** | Gris | Anulado (estado final) |

El paso a **Vencido** es automático: un proceso revisa las fechas de vencimiento y marca los
pagos vencidos solo. No tenés que hacer nada — pero sí conviene **cargar la fecha de vencimiento**
al crear el pago, porque si no la cargás nunca va a aparecer como vencido ni en el Calendario ni
en las alertas.

La pestaña **Deudas** te da el resumen por contratista: acordado, pagado y saldo.

---

## 9. Flujo E — La plata que entra y la que sale

Tres cosas distintas, tres lugares distintos. La confusión más común es mezclarlas.

| Qué registrás | Dónde | Ejemplo |
|---------------|-------|---------|
| Plata que **entra** del cliente | **Cobros** | Anticipo del 30% |
| Plata que sale a un **contratista** | **Pagos** | Certificado de albañilería |
| Plata que sale por **otra cosa** | **Gastos** | Permiso municipal, alquiler de bomba |
| **Compra de material** | **Compras** | 200 bolsas de cemento |

### Cobros

Menú → **Cobros** → **Nuevo cobro**. Monto, fecha, concepto (**Anticipo**, **Avance**, **Final**,
**Liberación de retención**, **Otro**), método y referencia.

Arriba ves total presupuestado (la suma de venta del cómputo métrico), total cobrado y saldo
pendiente del cliente. Cada cobro impacta directo en el flujo de caja de Finanzas.

### Gastos

Menú → **Gastos** → **Nuevo gasto**. Descripción, cantidad, precio unitario (el total se calcula),
tipo (**Materiales**, **Equipamiento**, **Gastos generales**, **Permisos**, **Otros**) y fecha.

**Vinculá el gasto a una partida cuando corresponda.** El campo Partida es opcional, pero si lo
llenás, ese gasto se cuenta como ejecución de esa partida en el análisis de Variación. Es la
diferencia entre "gasté $2.000.000 en algo" y "esta partida me está saliendo más caro de lo que
presupuesté".

### Compras

Ya cubierto en el [Flujo B](#y-después-mantener-los-precios-al-día). Lo importante: una compra no
es solo un registro contable, **actualiza el precio del catálogo y recalcula tus costos**.

---

## 10. Flujo F — Controlar que la obra no se desvíe

### Todos los días: Dashboard

Cuatro tarjetas — **Total Pagado**, **Pendiente**, **Vencido**, **Ejecución** — más:

- Banners de alerta si hay pagos vencidos (rojo) o que vencen en 7 días (amarillo)
- **Presupuesto vs Ejecutado**: verde = pagado, amarillo = comprometido, gris = libre
- **Avance de Obra**: el anillo ponderado por valor
- Últimos 5 pagos y últimos 10 movimientos del proyecto

### Todas las semanas: Finanzas → Variación

**Este es el reporte que hay que mirar.** Compara, línea por línea, lo presupuestado contra lo
que realmente pasó.

Arriba: costo presupuestado, comprometido (lo que asignaste), ejecutado (lo que pagaste) y la
variación total. Después tres tarjetas que cuentan partidas **sobre presupuesto**, **en línea** y
**bajo presupuesto** — y si hacés clic en una, la tabla se filtra.

La tabla se expande por rubro y muestra por partida: presupuestado, comprometido, pagado,
pendiente, certificado, variación en $ y en %, más el avance físico medido.

Los colores: **rojo** = te pasaste más del 5%, **verde** = en línea, **azul** = por debajo.

> **Cómo leerlo bien:** una partida en rojo al 20% de avance físico es una alarma seria — vas a
> gastar mucho más de lo previsto. Una partida en rojo al 100% de avance ya es un hecho consumado:
> sirve para presupuestar mejor la próxima obra, no para corregir esta. Mirá siempre variación y
> avance físico juntos.

### Todos los meses: el resto de Finanzas

- **Resumen** — ingresos estimados, costos, gastos, ganancia bruta, margen %, cobros del cliente,
  saldo pendiente y flujo de caja. Con torta de gastos por tipo y tabla de margen por partida.
  Botón **Exportar Excel**.
- **Flujo de Caja** — barras por mes: pagado, programado y predicho, con línea de acumulado.
- **Predicciones** — proyección de pagos futuros por contratista según su historial. La confianza
  es **Alta** con 3+ pagos previos, **Media** con 1-2, **Ninguna** sin historial. Tomalo como
  orientación, no como compromiso.
- **Alertas** — deudas vencidas ordenadas: **Crítica** (+30 días), **Alta** (15-30), **Media** (1-15).

### Cuando necesitás mostrarlo

**Reportes** para el informe consolidado del proyecto, exportable. **Actividad** para la auditoría:
quién hizo qué y cuándo, filtrable y exportable — útil cuando algo cambió y nadie sabe quién lo tocó.

**Calendario** para la vista del mes: vencimientos de pago, pagos hechos, cierres de certificación
e hitos del proyecto, cada uno con su color. Clic en un día para ver el detalle en el panel derecho.

---

## 11. Recetas rápidas: "cómo hago para…"

| Quiero… | Camino |
|---------|--------|
| Cargar avance de obra | Cómputo Métrico → clic en la barra de **Avance** de la partida |
| Ver cuánto le debo a un contratista | Contratistas → clic en el contratista (suma todas las obras) |
| Ver todas mis deudas | Pagos → pestaña **Deudas** |
| Saber qué falta contratar | Asignaciones → vista **Por partida** → badges amarillos |
| Actualizar el precio de un material | Compras → **Nueva compra** (mejor que editar el catálogo a mano) |
| Repartir una partida entre dos contratistas | Dos asignaciones a la misma partida, cada una con su cantidad |
| Corregir una certificación enviada | Solo si fue rechazada → **Corregir y reenviar** |
| Anular un pago | Detalle del pago → **Cancelar** (no se borra, queda como Cancelado) |
| Sacar el PDF de una certificación | Detalle de la certificación → botón **PDF** |
| Llevar los números a Excel | Finanzas → **Exportar Excel**, o Reportes |
| Ver todas mis obras juntas | Dashboard → **Vista general** |
| Recuperar un material borrado | Materiales → filtro Estado **Desactivados** → ícono de flecha circular |
| Dar acceso a alguien a una obra | Equipo → agregar miembro con su rol |
| Cambiar mi contraseña | Configuración |
| Imprimir cualquier pantalla | **Ctrl+P** — sale limpio, sin menús |

---

## 12. Cómo leer los números

Los indicadores que más se malinterpretan:

**Ejecución (%)** — Plata pagada sobre presupuesto. Es un porcentaje **financiero**, no de obra.

**Avance de Obra (%)** — Obra ejecutada según las mediciones, ponderada por el valor de cada
partida. Es un porcentaje **físico**.

> Que estos dos números no coincidan es normal y es información valiosa:
> - **Ejecución muy por encima del avance** → pagaste más de lo que se ejecutó. Estás financiando
>   a los contratistas, o hay sobrecostos.
> - **Avance muy por encima de la ejecución** → se trabajó y no se pagó. Vas a tener una salida
>   de caja fuerte pronto: mirá el flujo de caja.

**Comprometido** — Lo que asignaste a contratistas, pagado o no. Es plata que ya no es tuya
aunque siga en la cuenta.

**Ganancia bruta** — Ingresos de venta menos costos de partidas menos gastos adicionales. No
descuenta estructura, impuestos ni financieros: no es tu ganancia real.

**Flujo de caja** — Cobros menos pagos a contratistas menos gastos. Positivo = superávit. Podés
tener margen excelente y flujo de caja negativo al mismo tiempo; son cosas distintas y las dos
importan.

**Certificado vs Pagado** — Certificado es lo que reconociste como ejecutado. Pagado es lo que
efectivamente salió. La diferencia es tu deuda con los contratistas.

---

## 13. Problemas comunes y qué hacer

**No veo ningún dato / veo datos de otra obra**
Selector **Proyecto activo** en el sidebar. Es esto el 90% de las veces.

**No aparece el botón de crear/editar**
Tu rol en ese proyecto es **Lector**. Pedile a un Admin del proyecto que te cambie el rol en Equipo.

**La certificación no me deja editar cantidades**
Solo se edita en estado **Borrador**. Si ya la enviaste, hay que rechazarla para que vuelva a
Borrador.

**La certificación salió vacía / sin partidas**
Las líneas se generan desde las **asignaciones** de ese contratista en ese proyecto. Si no tiene
partidas asignadas, no hay nada que certificar. Andá a Asignaciones primero.

**No puedo borrar una partida / un rubro / una asignación**
Tiene pagos activos (pendientes o pagados) colgando. Cancelá o resolvé los pagos primero. Es una
protección para que no se rompa la trazabilidad.

**No puedo borrar un proyecto**
Solo se borra si está completamente vacío: sin pagos, contratistas, partidas ni adjuntos. Si la
obra ya existió, lo correcto es pasarla a estado **Completado** o **Cancelado**, no borrarla.

**Un pago no aparece como vencido aunque pasó la fecha**
Verificá que el pago tenga **fecha de vencimiento** cargada. Sin esa fecha nunca vence.

**El precio de un material no se actualizó con mi compra**
Existe una compra **con fecha posterior** a la tuya. El catálogo respeta siempre la compra más
reciente por fecha.

**El costo de la partida no cambió al cambiar el APU**
El recálculo es automático. Recargá la página. Si el costo estaba escrito a mano y la partida no
tiene APU, no hay nada que recalcular.

**Los totales del presupuesto no cierran con lo que esperaba**
Revisá que las partidas tengan **P.U. Venta** cargado, no solo costo. Los ingresos estimados y el
margen salen de la venta.

**Cargué dos veces el mismo material con distinto nombre**
Desactivá uno (papelera — se desactiva en vez de borrarse si está en uso) y usá el otro. Para
evitarlo, prestale atención al aviso de material repetido.

---

## 14. Errores que cuestan caro

**Cargar solo P.U. Costo y no P.U. Venta.** Sin precio de venta el sistema no puede calcular
margen, ni ingresos estimados, ni saldo del cliente. Es la mitad del valor de la herramienta
apagada.

**No cargar fecha de vencimiento en los pagos.** Sin fecha no hay vencimiento automático, no hay
alerta, no hay evento en el calendario. El módulo de deudas queda decorativo.

**Medir el avance una vez por mes.** Los desvíos se detectan tarde, cuando ya no se pueden
corregir. Semanal es el mínimo razonable.

**Saltear las asignaciones y crear pagos sueltos.** Funciona, pero perdés el control de
comprometido vs pagado, y las certificaciones te van a salir vacías.

**Cargar gastos sin vincularlos a la partida.** El análisis de Variación no ve esos gastos y te
va a decir que estás en presupuesto cuando no lo estás.

**Editar el precio del catálogo a mano en vez de registrar la compra.** Funciona igual, pero
perdés el historial de precios y la trazabilidad de la factura.

**Confundir Presentación con Cantidad.** Presentación es cuántas unidades base trae el envase
(50 por bolsa de cemento), no cuántas bolsas compraste. Si lo cargás mal, todos los APU que usen
ese material quedan mal por un factor de 50.

---

## 15. Referencia rápida

### Teclado en el Cómputo Métrico

**Tab** siguiente celda · **Shift+Tab** anterior · **Enter** confirma y baja · **Esc** cancela ·
**Flechas** navegar · **☰** arrastrar para reordenar

### Estados

**Proyecto:** Planificación → En progreso → Pausado / Completado / Cancelado

**Pago:** Pendiente → Pagado · Pendiente → Vencido (automático) · Pendiente/Vencido → Cancelado ·
Vencido → Pagado

**Certificación:** Borrador → Enviada → Aprobada → *genera pago* · Enviada → Rechazada → Borrador

### Permisos por proyecto

| | Admin | Editor | Lector |
|---|:---:|:---:|:---:|
| Ver datos | Sí | Sí | Sí |
| Crear/editar partidas, pagos, certificaciones | Sí | Sí | No |
| Aprobar/rechazar certificaciones | Sí | Sí | No |
| Gestionar miembros | Sí | No | No |
| Eliminar proyecto | Sí | No | No |

### Permisos globales del sistema

| | Super Admin | Admin | Usuario |
|---|:---:|:---:|:---:|
| Ver/gestionar usuarios | Sí | Sí | No |
| Cambiar roles globales | Sí | No | No |
| Activar/desactivar usuarios | Sí | No | No |
| Crear proyectos | Sí | Sí | Sí |

Tu rol **global** define qué podés hacer en el sistema; tu rol **por proyecto** define qué podés
hacer en cada obra. Podés ser Admin en una obra y Lector en otra.

### Qué ignora el selector de proyecto activo

Materiales · Compras · Contratistas · Proyectos · Dashboard → Vista general

---

## Dónde seguir

- **[Manual de Usuario](MANUAL_USUARIO.md)** — referencia completa, pantalla por pantalla y campo
  por campo. Andá ahí cuando necesites el detalle exacto de una función.
- Para problemas o sugerencias, contactá al administrador del sistema.
