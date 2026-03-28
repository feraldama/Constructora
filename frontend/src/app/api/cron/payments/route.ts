import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// POST /api/cron/payments
// ============================================================================
//
// Trigger externo para marcar pagos vencidos.
// Diseñado para ser llamado por:
//   - Vercel Cron Jobs   (vercel.json → "crons" array)
//   - GitHub Actions     (workflow schedule + curl)
//   - Cualquier servicio HTTP con el secret
//
// Autenticación: header Authorization: Bearer <CRON_SECRET>
//
// Configuración en vercel.json:
//
//   {
//     "crons": [
//       {
//         "path": "/api/cron/payments",
//         "schedule": "* * * * *"
//       }
//     ]
//   }
//
// Nota: en producción Vercel inyecta automáticamente el header con
// CRON_SECRET. En development hay que pasarlo manualmente.
//
// ============================================================================

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";
const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── 1. Validar secret ──────────────────────────────────────────────────────
  if (CRON_SECRET) {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (token !== CRON_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  // ── 2. Llamar al backend Express ───────────────────────────────────────────
  const start = Date.now();

  try {
    const response = await fetch(`${BACKEND_URL}/api/payments/mark-overdue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Pasamos el mismo secret al backend si lo tiene configurado
        ...(CRON_SECRET ? { "x-cron-secret": CRON_SECRET } : {}),
      },
      // No queremos que cuelgue indefinidamente
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      return NextResponse.json(
        { error: "Backend error", detail: body },
        { status: response.status }
      );
    }

    const data = (await response.json()) as { updated: number };
    const elapsed = Date.now() - start;

    return NextResponse.json({
      ok:      true,
      updated: data.updated,
      elapsed: `${elapsed}ms`,
      ts:      new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[cron/payments] Error:", message);

    return NextResponse.json(
      { error: "Cron job failed", detail: message },
      { status: 500 }
    );
  }
}

// GET — health check para verificar que el endpoint responde
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: "/api/cron/payments",
    description: "Marca pagos PENDING vencidos como OVERDUE",
    method: "POST",
    auth: CRON_SECRET ? "Bearer token required" : "No auth configured (dev mode)",
  });
}
