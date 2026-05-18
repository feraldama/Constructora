import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  createPurchaseSchema,
  updatePurchaseSchema,
} from "../controllers/purchases/purchases.schema.js";
import {
  listPurchases,
  getPurchase,
  createPurchase,
  updatePurchase,
  deletePurchase,
} from "../controllers/purchases/purchases.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/", listPurchases);
router.get("/:id", getPurchase);
router.post("/", validate(createPurchaseSchema), createPurchase);
router.patch("/:id", validate(updatePurchaseSchema), updatePurchase);
router.delete("/:id", deletePurchase);

export default router;
