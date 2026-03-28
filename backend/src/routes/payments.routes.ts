import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  createPaymentSchema,
  updatePaymentSchema,
} from "../controllers/payments/payments.schema.js";
import {
  listPayments,
  getPayment,
  createPayment,
  updatePayment,
  deletePayment,
  paymentSummary,
  contractorDebts,
  assignmentContext,
  triggerMarkOverdue,
  projectedCashFlow,
  paymentPredictions,
  debtAlerts,
} from "../controllers/payments/payments.controller.js";

const router = Router();

router.use(authMiddleware);

// Endpoints de consulta (sin :id) — TODOS antes de /:id
router.get("/",                  listPayments);
router.get("/summary",           paymentSummary);
router.get("/debts",             contractorDebts);
router.get("/cash-flow",         projectedCashFlow);
router.get("/predictions",       paymentPredictions);
router.get("/debt-alerts",       debtAlerts);
// Contexto financiero de una asignación antes de crear un pago
// GET /api/payments/assignment-context?contractorId=X&budgetItemId=Y
router.get("/assignment-context", assignmentContext);
router.post("/mark-overdue",      triggerMarkOverdue);

// Endpoints con :id
router.get("/:id", getPayment);
router.post("/", validate(createPaymentSchema), createPayment);
router.patch("/:id", validate(updatePaymentSchema), updatePayment);
router.delete("/:id", deletePayment);

export default router;
