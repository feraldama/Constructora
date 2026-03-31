import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  createClientPaymentSchema,
  updateClientPaymentSchema,
} from "../controllers/client-payments/client-payments.schema.js";
import {
  listClientPayments,
  clientPaymentSummary,
  createClientPayment,
  updateClientPayment,
  deleteClientPayment,
} from "../controllers/client-payments/client-payments.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/:projectId/client-payments", listClientPayments);
router.get("/:projectId/client-payments/summary", clientPaymentSummary);
router.post("/:projectId/client-payments", validate(createClientPaymentSchema), createClientPayment);
router.patch("/:projectId/client-payments/:paymentId", validate(updateClientPaymentSchema), updateClientPayment);
router.delete("/:projectId/client-payments/:paymentId", deleteClientPayment);

export default router;
