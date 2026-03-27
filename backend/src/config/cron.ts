import cron from "node-cron";
import { runAlertChecks } from "../services/alerts.service.js";

/**
 * Registra todos los cron jobs del sistema.
 *
 * Jobs:
 * - Alertas: cada 15 minutos verifica pagos vencidos, presupuestos excedidos,
 *   y pagos por vencer. Crea notificaciones con deduplicación de 24h.
 */
export function startCronJobs(): void {
  // Cada 15 minutos: verificar alertas
  cron.schedule("*/15 * * * *", async () => {
    const start = Date.now();
    try {
      const result = await runAlertChecks();
      const elapsed = Date.now() - start;

      if (result.totalNotificationsCreated > 0) {
        console.log(
          `[CRON] Alertas: ${result.overduePayments} vencidos, ` +
          `${result.budgetExceeded} presupuestos excedidos, ` +
          `${result.upcomingDue} por vencer — ` +
          `${result.totalNotificationsCreated} notificaciones creadas (${elapsed}ms)`
        );
      }
    } catch (error) {
      console.error("[CRON] Error en verificación de alertas:", error);
    }
  });

  console.log("✓ Cron jobs registrados (alertas cada 15 min)");
}
