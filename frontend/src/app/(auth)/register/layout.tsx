import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crear cuenta — BuildControl",
  description: "Creá tu cuenta de BuildControl para empezar a gestionar obras.",
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
