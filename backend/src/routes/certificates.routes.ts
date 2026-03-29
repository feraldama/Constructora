import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  createCertificateSchema,
  updateCertificateSchema,
  updateCertificateItemSchema,
  rejectCertificateSchema,
  generatePaymentSchema,
} from "../controllers/certificates/certificates.schema.js";
import {
  listCertificates,
  getCertificate,
  createCertificate,
  updateCertificate,
  deleteCertificate,
  updateCertificateItem,
  submitCertificate,
  approveCertificate,
  rejectCertificate,
  resubmitCertificate,
  generatePayment,
} from "../controllers/certificates/certificates.controller.js";

const router = Router();

router.use(authMiddleware);

// CRUD
router.get("/", listCertificates);
router.post("/", validate(createCertificateSchema), createCertificate);
router.get("/:id", getCertificate);
router.patch("/:id", validate(updateCertificateSchema), updateCertificate);
router.delete("/:id", deleteCertificate);

// Workflow
router.post("/:id/submit", submitCertificate);
router.post("/:id/approve", approveCertificate);
router.post("/:id/reject", validate(rejectCertificateSchema), rejectCertificate);
router.post("/:id/resubmit", resubmitCertificate);
router.post("/:id/generate-payment", validate(generatePaymentSchema), generatePayment);

export default router;

// Items sub-router (mounted separately at /api)
export const certificateItemsRouter = Router();
certificateItemsRouter.use(authMiddleware);
certificateItemsRouter.patch(
  "/certificate-items/:itemId",
  validate(updateCertificateItemSchema),
  updateCertificateItem
);
