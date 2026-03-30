"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/hooks/useProject";

export default function BudgetRedirectPage() {
  const { projectId, isLoading } = useProject();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && projectId) {
      router.replace(`/budget/${projectId}`);
    }
  }, [isLoading, projectId, router]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cómputo Métrico</h1>
        <p className="text-sm text-gray-500 mt-1">Redirigiendo al proyecto activo...</p>
      </div>
      <div className="h-64 rounded-xl bg-gray-100 animate-pulse" />
    </div>
  );
}
