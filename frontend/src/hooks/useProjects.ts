"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  type ProjectFilters,
  type CreateProjectPayload,
  type UpdateProjectPayload,
} from "@/lib/api/projects";

const PROJECTS_KEY = ["projects"];

export function useProjects(params?: ProjectFilters) {
  return useQuery({
    queryKey: [...PROJECTS_KEY, params],
    queryFn: () => getProjects(params),
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProjectPayload) => createProject(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProjectPayload }) =>
      updateProject(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PROJECTS_KEY });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PROJECTS_KEY });
      void qc.invalidateQueries({ queryKey: ["budget"] });
    },
  });
}
