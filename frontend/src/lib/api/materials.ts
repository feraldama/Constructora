import api from "@/lib/api/client";
import type { Material, MaterialCategory, MeasurementUnit } from "@/types";

export interface CreateMaterialPayload {
  name: string;
  unit: MeasurementUnit;
  unitPrice: number;
  category?: MaterialCategory;
  brand?: string | null;
  supplier?: string | null;
  notes?: string | null;
}

export type UpdateMaterialPayload = Partial<CreateMaterialPayload>;

export async function getMaterials(params?: {
  search?: string;
  category?: MaterialCategory;
  isActive?: boolean;
}): Promise<Material[]> {
  const { data } = await api.get<Material[]>("/materials", { params });
  return data;
}

export async function getMaterial(id: string): Promise<Material> {
  const { data } = await api.get<Material>(`/materials/${id}`);
  return data;
}

export async function createMaterial(payload: CreateMaterialPayload): Promise<Material> {
  const { data } = await api.post<Material>("/materials", payload);
  return data;
}

export async function updateMaterial(id: string, payload: UpdateMaterialPayload): Promise<Material> {
  const { data } = await api.patch<Material>(`/materials/${id}`, payload);
  return data;
}

export async function deleteMaterial(id: string): Promise<void> {
  await api.delete(`/materials/${id}`);
}
