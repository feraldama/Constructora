import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  createMaterialSchema,
  updateMaterialSchema,
} from "../controllers/materials/materials.schema.js";
import {
  listMaterials,
  getMaterial,
  createMaterial,
  updateMaterial,
  deleteMaterial,
} from "../controllers/materials/materials.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/", listMaterials);
router.get("/:id", getMaterial);
router.post("/", validate(createMaterialSchema), createMaterial);
router.patch("/:id", validate(updateMaterialSchema), updateMaterial);
router.delete("/:id", deleteMaterial);

export default router;
