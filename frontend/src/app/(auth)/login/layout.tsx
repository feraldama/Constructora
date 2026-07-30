import type { Metadata } from "next";

// El metadata solo se puede exportar desde Server Components, y page.tsx es
// "use client" por el formulario. De ahí este layout mínimo.
export const metadata: Metadata = {
  title: "Iniciar sesión — BuildControl",
  description: "Ingresá a tu cuenta de BuildControl para gestionar tus obras.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
