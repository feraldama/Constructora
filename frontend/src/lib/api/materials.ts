import api from "@/lib/api/client";
import type { Material, MaterialCategory, MeasurementUnit } from "@/types";

export interface CreateMaterialPayload {
  name: string;
  unit: MeasurementUnit;
  unitPrice: number;
  presentationQty?: number;
  category?: MaterialCategory;
  brand?: string | null;
  supplier?: string | null;
  notes?: string | null;
  /**
   * El backend responde 409 si ya existe un material con el mismo nombre
   * (comparado sin acentos ni mayúsculas). Con `true` se crea igualmente —
   * caso legítimo: mismo insumo de dos proveedores.
   */
  allowDuplicateName?: boolean;
}

export type UpdateMaterialPayload = Partial<CreateMaterialPayload> & {
  /** Reactivar / desactivar un material del catálogo */
  isActive?: boolean;
};

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
