import api from "@/lib/api/client";
import type {
  APUTemplateSummary,
  APUTemplateDetail,
  APURubroSummary,
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
