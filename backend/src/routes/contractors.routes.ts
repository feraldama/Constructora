import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  createContractorSchema,
  updateContractorSchema,
} from "../controllers/contractors/contractors.schema.js";
import {
  listContractors,
  getContractor,
  createContractor,
  updateContractor,
  deleteContractor,
  getFinancialSummary,
  getAssignments,
  getPaymentsGrouped,
} from "../controllers/contractors/contractors.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/", listContractors);

// Sub-recursos antes de :id para evitar colisiones
router.get("/:id/financial", getFinancialSummary);
router.get("/:id/assignments", getAssignments);
router.get("/:id/payments", getPaymentsGrouped);

router.get("/:id", getContractor);
router.post("/", validate(createContractorSchema), createContractor);
router.patch("/:id", validate(updateContractorSchema), updateContractor);
router.delete("/:id", deleteContractor);

export default router;
