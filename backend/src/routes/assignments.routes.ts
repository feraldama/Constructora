import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  createAssignmentSchema,
  updateAssignmentSchema,
} from "../controllers/assignments/assignments.schema.js";
import {
  listAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getProjectSummary,
  getProjectContractors,
  getProjectItems,
} from "../controllers/assignments/assignments.controller.js";

const router = Router();

router.use(authMiddleware);

// Listado: ?budgetItemId=X  ó  ?contractorId=X&projectId=Y
router.get("/", listAssignments);

// Rutas de proyecto — todas ANTES de /:assignmentId para evitar colisión
router.get("/project/:projectId/summary",     getProjectSummary);
router.get("/project/:projectId/contractors", getProjectContractors);
router.get("/project/:projectId/items",       getProjectItems);

// Detalle individual con cuadro financiero completo
router.get("/:assignmentId", getAssignment);

router.post("/", validate(createAssignmentSchema), createAssignment);
router.patch("/:assignmentId", validate(updateAssignmentSchema), updateAssignment);
router.delete("/:assignmentId", deleteAssignment);

export default router;
