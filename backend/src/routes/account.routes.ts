import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  updateProfileSchema,
  changePasswordSchema,
} from "../controllers/account/account.schema.js";
import {
  getProfile,
  updateProfile,
  changePassword,
} from "../controllers/account/account.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/profile", getProfile);
router.patch("/profile", validate(updateProfileSchema), updateProfile);
router.post("/change-password", validate(changePasswordSchema), changePassword);

export default router;
