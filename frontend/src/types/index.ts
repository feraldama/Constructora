// Enums matching Prisma schema
export type ProjectStatus = "PLANNING" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
export type PaymentStatus = "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";
export type MeasurementUnit = "M2" | "M3" | "ML" | "UNIT" | "KG" | "TON" | "LITER" | "INCH" | "GLOBAL";
export type GlobalRole = "SUPER_ADMIN" | "ADMIN" | "USER";
export type ProjectRole = "ADMIN" | "EDITOR" | "VIEWER";

// Entities
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  address?: string;
  initialBudget: number;
  status: ProjectStatus;
  startDate?: string;
  estimatedEnd?: string;
  createdAt: string;
}

export interface BudgetItem {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  unit: MeasurementUnit;
  quantity: number;
  costUnitPrice: number;
  saleUnitPrice: number;
  costSubtotal: number;
  saleSubtotal: number;
  grossProfit: number;
  marginPercent: number;
  sortOrder: number;
}

export interface Contractor {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  taxId?: string;
}

export interface Payment {
  id: string;
  projectId: string;
  contractorId: string;
  budgetItemId?: string;
  amount: number;
  status: PaymentStatus;
  paymentMethod?: PaymentMethod;
  bank?: string | null;
  description?: string;
  invoiceNumber?: string;
  dueDate?: string;
  paidAt?: string;
  createdAt: string;
  contractor?: Pick<Contractor, "id" | "name">;
  project?: Pick<Project, "id" | "name">;
}

export type ExpenseType = "MATERIALS" | "EQUIPMENT" | "OVERHEAD" | "PERMITS" | "OTHER";
export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "CHECK" | "OTHER";

export interface ProjectExpense {
  id: string;
  projectId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  expenseType: ExpenseType;
  expenseDate: string;
  invoiceRef?: string;
  notes?: string;
  budgetItemId?: string | null;
  budgetItemName?: string | null;
  createdAt: string;
}

// Material catalog
export type MaterialCategory = "CEMENT" | "STEEL" | "WOOD" | "AGGREGATES" | "CERAMICS" | "PLUMBING" | "ELECTRICAL" | "PAINT" | "WATERPROOFING" | "HARDWARE" | "OTHER";

export interface Material {
  id: string;
  name: string;
  unit: MeasurementUnit;
  unitPrice: number;
  presentationQty: number;
  category: MaterialCategory;
  brand?: string | null;
  supplier?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
}

// APU (Análisis de Precios Unitarios)
export interface BudgetItemMaterial {
  id: string;
  budgetItemId: string;
  materialId: string;
  consumptionPerUnit: number;
  wastePercent: number;
  unitCost: number;
  subtotal: number;
  material?: Material;
}

export interface BudgetItemLabor {
  id: string;
  budgetItemId: string;
  description: string;
  costPerUnit: number;
}

export interface APUBreakdown {
  materials: BudgetItemMaterial[];
  labor: BudgetItemLabor[];
  totalMaterials: number;
  totalLabor: number;
  totalCost: number;
}

// Client payments
export type ClientPaymentConcept = "ADVANCE" | "PROGRESS" | "FINAL" | "RETENTION_RELEASE" | "OTHER";

export interface ClientPayment {
  id: string;
  projectId: string;
  amount: number;
  paymentDate: string;
  paymentMethod?: PaymentMethod | null;
  bank?: string | null;
  concept: ClientPaymentConcept;
  reference?: string | null;
  notes?: string | null;
  createdAt: string;
}

// APU Templates (catálogo global de subrubros importado del Excel maestro)
export interface APUTemplateSummary {
  id: string;
  rubro: string;
  name: string;
  unit: MeasurementUnit;
  description?: string | null;
  isActive: boolean;
  materialsCount: number;
  laborCount: number;
}

export interface APUTemplateMaterialLine {
  id: string;
  materialId: string;
  material: Pick<Material, "id" | "name" | "unit" | "unitPrice" | "presentationQty" | "category">;
  consumptionPerUnit: number;
  wastePercent: number;
  unitCost: number;
  subtotal: number;
}

export interface APUTemplateLaborLine {
  id: string;
  description: string;
  costPerUnit: number;
}

export interface APUTemplateDetail {
  id: string;
  rubro: string;
  name: string;
  unit: MeasurementUnit;
  description?: string | null;
  isActive: boolean;
  materials: APUTemplateMaterialLine[];
  labor: APUTemplateLaborLine[];
  totalMaterials: number;
  totalLabor: number;
  totalCost: number;
}

export interface APURubroSummary {
  rubro: string;
  count: number;
}

// Purchases (compras de material — actualizan Material.unitPrice y cascada APU)
export interface Purchase {
  id: string;
  materialId: string;
  projectId: string | null;
  createdById: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  supplier: string | null;
  invoiceRef: string | null;
  purchaseDate: string;
  paymentMethod: PaymentMethod | null;
  bank: string | null;
  notes: string | null;
  createdAt: string;
  material?: Pick<Material, "id" | "name" | "unit">;
  project?: Pick<Project, "id" | "name"> | null;
  createdBy?: Pick<User, "id" | "firstName" | "lastName">;
  affectedBudgetItems?: number;
}

// API Response
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
