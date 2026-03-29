import cron from "node-cron";
import { markOverduePayments } from "../services/payment-state.service.js";
import { runAlertChecks, purgeOldNotifications } from "../services/alerts.service.js";

// ============================================================================
// CRON JOBS
// ============================================================================
//
//  Job 1 — Estados de pagos     cada 1 min  "* * * * *"
//    → markOverduePayments(): PENDING + dueDate < ahora → OVERDUE
//    → Operación de escritura barata: 1 UPDATE con índice [status, dueDate].
//      Cuando no hay vencidos nuevos → 0 rows affected, costo mínimo.
//
//  Job 2 — Alertas y notificaciones  cada 15 min  "*/15 * * * *"
//    → runAlertChecks(): pagos vencidos, presupuesto excedido, pagos próximos.
//    → Incluye su propio markOverduePayments() para notificar los recién vencidos.
//      No hay doble escritura: cuando Job 1 ya actualizó, el updateMany de
//      alerts hace 0 rows affected y la query de notificación detecta los OVERDUE.
//
//  Por qué dos frecuencias distintas:
//    - Los estados deben estar actualizados antes de cualquier request API.
//      1 min garantiza < 60 s de desfase entre la realidad y la DB.
//    - Las notificaciones generan createMany y queries de deduplicación pesadas.
//      15 min es suficiente para alertas operativas sin castigar la DB.
//
// ============================================================================

export function startCronJobs(): void {
  // ── Job 1: actualizar estados ─────────────────────────────────────────────
  cron.schedule("* * * * *", async () => {
    try {
      const { count, executedAt } = await markOverduePayments();
      if (count > 0) {
        console.log(
          `[CRON:states] ${executedAt.toISOString()} — ${count} pago${count !== 1 ? "s" : ""} marcado${count !== 1 ? "s" : ""} como OVERDUE`
        );
      }
    } catch (err) {
      console.error("[CRON:states] Error al actualizar estados:", err);
    }
  });

  // ── Job 2: alertas y notificaciones ──────────────────────────────────────
  cron.schedule("*/15 * * * *", async () => {
    const start = Date.now();
    try {
      const result = await runAlertChecks();
      const elapsed = Date.now() - start;

      if (result.totalNotificationsCreated > 0) {
        console.log(
          `[CRON:alerts] ${new Date().toISOString()} — ` +
          `vencidos: ${result.overduePayments}, ` +
          `presupuestos: ${result.budgetExceeded}, ` +
          `próximos: ${result.upcomingDue} — ` +
          `${result.totalNotificationsCreated} notificaciones (${elapsed}ms)`
        );
      }
    } catch (err) {
      console.error("[CRON:alerts] Error en verificación de alertas:", err);
    }
  });

  // ── Job 3: limpieza de notificaciones antiguas ───────────────────────────
  cron.schedule("0 3 * * *", async () => {
    try {
      const { deleted } = await purgeOldNotifications();
      if (deleted > 0) {
        console.log(
          `[CRON:purge] ${new Date().toISOString()} — ${deleted} notificacion${deleted !== 1 ? "es" : ""} eliminada${deleted !== 1 ? "s" : ""}`
        );
      }
    } catch (err) {
      console.error("[CRON:purge] Error al limpiar notificaciones:", err);
    }
  });

  console.log("✓ Cron jobs registrados (estados: 1 min | alertas: 15 min | limpieza: 3 AM)");
}
