import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { applyAPUTemplateSchema } from "../controllers/apu-templates/apu-templates.schema.js";
import {
  listAPUTemplates,
  listAPURubros,
  getAPUTemplate,
  applyAPUTemplate,
} from "../controllers/apu-templates/apu-templates.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/", listAPUTemplates);
router.get("/rubros", listAPURubros);
router.get("/:id", getAPUTemplate);
router.post("/:id/apply", validate(applyAPUTemplateSchema), applyAPUTemplate);

export default router;
