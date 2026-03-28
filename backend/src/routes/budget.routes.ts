import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  createCategorySchema,
  createBudgetItemSchema,
  updateBudgetItemSchema,
} from "../controllers/budget/budget.schema.js";
import {
  getProjectBudget,
  createCategory,
  deleteCategory,
  createBudgetItem,
  updateBudgetItem,
  deleteBudgetItem,
} from "../controllers/budget/budget.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/projects/:projectId/budget", getProjectBudget);
router.post("/projects/:projectId/categories", validate(createCategorySchema), createCategory);
router.delete("/projects/:projectId/categories/:categoryId", deleteCategory);
router.post("/categories/:categoryId/budget-items", validate(createBudgetItemSchema), createBudgetItem);
router.patch("/budget-items/:itemId", validate(updateBudgetItemSchema), updateBudgetItem);
router.delete("/budget-items/:itemId", deleteBudgetItem);

export default router;
