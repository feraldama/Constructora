"use client";

import { createContext, useContext } from "react";
import type { ProjectListItem } from "@/lib/api/projects";

export interface ProjectContextType {
  projectId: string | null;
  project: ProjectListItem | null;
  projects: ProjectListItem[];
  isLoading: boolean;
  setProjectId: (id: string) => void;
}

export const ProjectContext = createContext<ProjectContextType | null>(null);

export function useProject(): ProjectContextType {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used inside ProjectProvider");
  return ctx;
}
