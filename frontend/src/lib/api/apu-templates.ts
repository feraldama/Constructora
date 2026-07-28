import api from "@/lib/api/client";
import type {
  APUTemplateSummary,
  APUTemplateDetail,
  APURubroSummary,
  BudgetItem,
  MaterialCategory,
  MeasurementUnit,
} from "@/types";

export interface ListAPUTemplatesParams {
  search?: string;
  rubro?: string;
  isActive?: boolean;
}

export async function getAPUTemplates(
  params?: ListAPUTemplatesParams
): Promise<APUTemplateSummary[]> {
  const { data } = await api.get<APUTemplateSummary[]>("/apu-templates", { params });
  return data;
}

export async function getAPURubros(): Promise<APURubroSummary[]> {
  const { data } = await api.get<APURubroSummary[]>("/apu-templates/rubros");
  return data;
}

export async function getAPUTemplate(id: string): Promise<APUTemplateDetail> {
  const { data } = await api.get<APUTemplateDetail>(`/apu-templates/${id}`);
  return data;
}

export interface ApplyAPUTemplatePayload {
  // Una de estas dos es obligatoria
  categoryId?: string;
  budgetItemId?: string;
  name?: string;
  quantity?: number;
  replaceExisting?: boolean;
}

export async function applyAPUTemplate(
  templateId: string,
  payload: ApplyAPUTemplatePayload
): Promise<{ budgetItemId: string }> {
  const { data } = await api.post<{ budgetItemId: string }>(
    `/apu-templates/${templateId}/apply`,
    payload
  );
  return data;
}

// ─── Edición del catálogo de plantillas ───────────────────────────────────

export interface APUTemplateMaterialPayload {
  materialId: string;
  consumptionPerUnit: number;
  wastePercent?: number;
}

export interface APUTemplateLaborPayload {
  description: string;
  costPerUnit?: number;
}

export interface UpdateAPUTemplatePayload {
  rubro?: string;
  name?: string;
  unit?: MeasurementUnit;
  description?: string | null;
  isActive?: boolean;
  /** Si viene, reemplaza las líneas de material de la plantilla */
  materials?: APUTemplateMaterialPayload[];
  /** Si viene, reemplaza las líneas de mano de obra */
  labor?: APUTemplateLaborPayload[];
}

export async function updateAPUTemplate(
  id: string,
  payload: UpdateAPUTemplatePayload
): Promise<APUTemplateDetail> {
  const { data } = await api.patch<APUTemplateDetail>(`/apu-templates/${id}`, payload);
  return data;
}

export async function deleteAPUTemplate(id: string): Promise<void> {
  await api.delete(`/apu-templates/${id}`);
}

// ─── Carga manual de subrubro (partida + APU completo) ────────────────────

/** Material que todavía no está en el catálogo: se crea junto con la partida. */
export interface ManualAPUNewMaterialPayload {
  name: string;
  unit: MeasurementUnit;
  unitPrice: number;
  presentationQty?: number;
  category?: MaterialCategory;
}

/** Cada línea trae un material del catálogo o los datos para crearlo. */
export interface ManualAPUMaterialPayload {
  materialId?: string;
  newMaterial?: ManualAPUNewMaterialPayload;
  consumptionPerUnit: number;
  wastePercent?: number;
}

export interface ManualAPULaborPayload {
  description: string;
  costPerUnit?: number;
}

export interface CreateManualAPUPayload {
  // Una de estas dos es obligatoria
  categoryId?: string;
  budgetItemId?: string;
  name: string;
  /** Ignorada cuando se carga sobre una partida existente (usa la de la partida) */
  unit?: MeasurementUnit;
  quantity?: number;
  description?: string | null;
  materials: ManualAPUMaterialPayload[];
  labor: ManualAPULaborPayload[];
  replaceExisting?: boolean;
  /** Guarda la composición en el catálogo de plantillas APU */
  saveAsTemplate?: boolean;
  /** Rubro de la plantilla — requerido si saveAsTemplate */
  rubro?: string;
}

export interface CreateManualAPUResponse {
  budgetItemId: string;
  templateId: string | null;
  /** Materiales dados de alta en el catálogo durante la carga */
  createdMaterialIds: string[];
  /** Materiales que estaban desactivados y se reactivaron al usarlos */
  reactivatedMaterialIds: string[];
  item: BudgetItem | null;
}

export async function createManualAPU(
  payload: CreateManualAPUPayload
): Promise<CreateManualAPUResponse> {
  const { data } = await api.post<CreateManualAPUResponse>("/apu-templates/manual", payload);
  return data;
}
