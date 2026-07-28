import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  applyAPUTemplateSchema,
  manualAPUSchema,
  updateAPUTemplateSchema,
} from "../controllers/apu-templates/apu-templates.schema.js";
import {
  listAPUTemplates,
  listAPURubros,
  getAPUTemplate,
  applyAPUTemplate,
  createManualAPU,
  updateAPUTemplate,
  deleteAPUTemplate,
} from "../controllers/apu-templates/apu-templates.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/", listAPUTemplates);
router.get("/rubros", listAPURubros);
router.post("/manual", validate(manualAPUSchema), createManualAPU);
router.get("/:id", getAPUTemplate);
router.patch("/:id", validate(updateAPUTemplateSchema), updateAPUTemplate);
router.delete("/:id", deleteAPUTemplate);
router.post("/:id/apply", validate(applyAPUTemplateSchema), applyAPUTemplate);

export default router;
