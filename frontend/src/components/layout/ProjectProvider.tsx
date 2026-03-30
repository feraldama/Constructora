"use client";

import { useState, useEffect, useCallback } from "react";
import { ProjectContext } from "@/hooks/useProject";
import { useProjects } from "@/hooks/useProjects";
import type { ProjectListItem } from "@/lib/api/projects";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_KEY = "selectedProjectId";

export default function ProjectProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading: authLoading } = useAuth();
  const canFetchProjects = !authLoading && !!user;

  const { data: projectsRes, isLoading } = useProjects(
    { page: 1, limit: 100 },
    { enabled: canFetchProjects }
  );
  const projects = projectsRes?.data ?? [];

  const [projectId, setProjectIdState] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Restaurar de localStorage al montar
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setProjectIdState(stored);
    setInitialized(true);
  }, []);

  // Auto-seleccionar el primer proyecto si no hay ninguno válido
  useEffect(() => {
    if (!initialized || isLoading || projects.length === 0) return;

    const currentValid = projects.some((p) => p.id === projectId);
    if (!currentValid) {
      const fallback = projects[0].id;
      setProjectIdState(fallback);
      localStorage.setItem(STORAGE_KEY, fallback);
    }
  }, [initialized, isLoading, projects, projectId]);

  const setProjectId = useCallback((id: string) => {
    setProjectIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const project: ProjectListItem | null =
    projects.find((p) => p.id === projectId) ?? null;

  return (
    <ProjectContext
      value={{
        projectId,
        project,
        projects,
        isLoading: isLoading || !initialized,
        setProjectId,
      }}
    >
      {children}
    </ProjectContext>
  );
}
