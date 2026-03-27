import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { getDashboard } from "../controllers/dashboard/dashboard.controller.js";

const router = Router();

router.use(authMiddleware);
router.get("/", getDashboard);

export default router;
