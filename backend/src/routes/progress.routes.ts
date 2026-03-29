import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  createProgressEntrySchema,
  updateProgressEntrySchema,
} from "../controllers/progress/progress.schema.js";
import {
  listProgressEntries,
  createProgressEntry,
  updateProgressEntry,
  deleteProgressEntry,
  getProjectProgress,
} from "../controllers/progress/progress.controller.js";

const router = Router();

router.use(authMiddleware);

// Per-item progress entries
router.get("/budget-items/:budgetItemId/progress", listProgressEntries);
router.post(
  "/budget-items/:budgetItemId/progress",
  validate(createProgressEntrySchema),
  createProgressEntry
);

// Individual entry operations
router.patch(
  "/progress-entries/:entryId",
  validate(updateProgressEntrySchema),
  updateProgressEntry
);
router.delete("/progress-entries/:entryId", deleteProgressEntry);

// Project-level progress summary
router.get("/projects/:projectId/progress", getProjectProgress);

export default router;
