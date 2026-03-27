// Enums matching Prisma schema
export type ProjectStatus = "PLANNING" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
export type PaymentStatus = "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";
export type MeasurementUnit = "M2" | "M3" | "ML" | "UNIT" | "KG" | "TON" | "GLOBAL";
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
  unitPrice: number;
  subtotal: number;
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
  description?: string;
  invoiceNumber?: string;
  dueDate?: string;
  paidAt?: string;
  createdAt: string;
  contractor?: Pick<Contractor, "id" | "name">;
  project?: Pick<Project, "id" | "name">;
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
