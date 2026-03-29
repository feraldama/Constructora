import { z } from "zod";
import { MeasurementUnit } from "../../generated/prisma/enums.js";
import { ExpenseType } from "../../generated/prisma/enums.js";

export const createCategorySchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
});

export const createBudgetItemSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  unit: z.nativeEnum(MeasurementUnit).optional(),
  quantity: z.coerce.number().nonnegative().optional(),
  costUnitPrice: z.coerce.number().nonnegative().optional(),
  saleUnitPrice: z.coerce.number().nonnegative().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateBudgetItemSchema = z.object({
  name: z.string().max(500).optional(),
  description: z.string().optional().nullable(),
  unit: z.nativeEnum(MeasurementUnit).optional(),
  quantity: z.coerce.number().nonnegative().optional(),
  costUnitPrice: z.coerce.number().nonnegative().optional(),
  saleUnitPrice: z.coerce.number().nonnegative().optional(),
  sortOrder: z.number().int().optional(),
});

export const createExpenseSchema = z.object({
  description: z.string().min(1, "La descripción es requerida"),
  quantity: z.coerce.number().positive("La cantidad debe ser mayor a 0").default(1),
  unitPrice: z.coerce.number().nonnegative("El precio unitario no puede ser negativo"),
  amount: z.coerce.number().nonnegative().optional(), // calculado: quantity * unitPrice
  expenseType: z.nativeEnum(ExpenseType),
  expenseDate: z.string().datetime().optional(),
  invoiceRef: z.string().optional(),
  notes: z.string().optional(),
  budgetItemId: z.string().uuid().optional().nullable(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateBudgetItemInput = z.infer<typeof createBudgetItemSchema>;
export type UpdateBudgetItemInput = z.infer<typeof updateBudgetItemSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

// Reorder
export const reorderItemsSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    sortOrder: z.number().int().min(0),
  })).min(1),
});
export type ReorderItemsInput = z.infer<typeof reorderItemsSchema>;

export const reorderCategoriesSchema = z.object({
  categories: z.array(z.object({
    id: z.string().uuid(),
    sortOrder: z.number().int().min(0),
  })).min(1),
});
export type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>;
