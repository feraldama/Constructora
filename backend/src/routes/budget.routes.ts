import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  createCategorySchema,
  createBudgetItemSchema,
  updateBudgetItemSchema,
  createExpenseSchema,
  updateExpenseSchema,
  reorderItemsSchema,
  reorderCategoriesSchema,
} from "../controllers/budget/budget.schema.js";
import {
  getProjectBudget,
  createCategory,
  deleteCategory,
  createBudgetItem,
  updateBudgetItem,
  deleteBudgetItem,
  reorderBudgetItems,
  reorderCategories,
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from "../controllers/budget/budget.controller.js";
import {
  financialSummary,
  financialItems,
  varianceAnalysis,
} from "../controllers/finance/finance.controller.js";

const router = Router();

router.use(authMiddleware);

// Budget & categories
router.get("/projects/:projectId/budget", getProjectBudget);
router.post("/projects/:projectId/categories", validate(createCategorySchema), createCategory);
router.delete("/projects/:projectId/categories/:categoryId", deleteCategory);
router.post("/categories/:categoryId/budget-items", validate(createBudgetItemSchema), createBudgetItem);
router.patch("/budget-items/:itemId", validate(updateBudgetItemSchema), updateBudgetItem);
router.delete("/budget-items/:itemId", deleteBudgetItem);
router.patch("/projects/:projectId/budget-items/reorder", validate(reorderItemsSchema), reorderBudgetItems);
router.patch("/projects/:projectId/categories/reorder", validate(reorderCategoriesSchema), reorderCategories);

// Gastos adicionales
router.get("/projects/:projectId/expenses", listExpenses);
router.post("/projects/:projectId/expenses", validate(createExpenseSchema), createExpense);
router.patch("/expenses/:expenseId", validate(updateExpenseSchema), updateExpense);
router.delete("/expenses/:expenseId", deleteExpense);

// Finanzas
router.get("/projects/:projectId/finance/summary", financialSummary);
router.get("/projects/:projectId/finance/items", financialItems);
router.get("/projects/:projectId/finance/variance", varianceAnalysis);

export default router;
