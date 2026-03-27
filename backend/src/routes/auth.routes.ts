import { Router } from "express";
import { validate } from "../middlewares/validate.js";
import { registerSchema, loginSchema } from "../controllers/auth/auth.schema.js";
import { register, login, me } from "../controllers/auth/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.get("/me", authMiddleware, me);

export default router;
