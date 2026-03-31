import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  addAPUMaterialSchema,
  updateAPUMaterialSchema,
  addAPULaborSchema,
  updateAPULaborSchema,
} from "../controllers/apu/apu.schema.js";
import {
  getAPU,
  addAPUMaterial,
  updateAPUMaterial,
  deleteAPUMaterial,
  addAPULabor,
  updateAPULabor,
  deleteAPULabor,
  refreshAPUPrices,
} from "../controllers/apu/apu.controller.js";

const router = Router();

router.use(authMiddleware);

// APU desglose completo
router.get("/budget-items/:itemId/apu", getAPU);

// APU materiales
router.post("/budget-items/:itemId/apu/materials", validate(addAPUMaterialSchema), addAPUMaterial);
router.patch("/budget-items/:itemId/apu/materials/:apuMaterialId", validate(updateAPUMaterialSchema), updateAPUMaterial);
router.delete("/budget-items/:itemId/apu/materials/:apuMaterialId", deleteAPUMaterial);

// APU mano de obra
router.post("/budget-items/:itemId/apu/labor", validate(addAPULaborSchema), addAPULabor);
router.patch("/budget-items/:itemId/apu/labor/:apuLaborId", validate(updateAPULaborSchema), updateAPULabor);
router.delete("/budget-items/:itemId/apu/labor/:apuLaborId", deleteAPULabor);

// Actualizar precios desde catálogo
router.post("/budget-items/:itemId/apu/refresh-prices", refreshAPUPrices);

export default router;
