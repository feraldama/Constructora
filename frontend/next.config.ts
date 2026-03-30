import type { NextConfig } from "next";

/**
 * Proxy /api → Express para que el navegador llame siempre al mismo origen que Next
 * (evita Network Error si abrís la app por 192.168.x.x:3000 y localhost:4000 no es el backend).
 */
const nextConfig: NextConfig = {
  // Permitir acceder al dev server desde la IP pública (HMR / _next/*).
  // Solo aplica en `next dev`.
  allowedDevOrigins: ["181.123.61.216"],
  async rewrites() {
    const target = process.env.API_PROXY_TARGET || "http://127.0.0.1:3015";
    return [
      {
        source: "/api/:path*",
        destination: `${target.replace(/\/$/, "")}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
