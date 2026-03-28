import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { listActivityLogs } from "../controllers/activity/activity.controller.js";

const router = Router();

router.use(authMiddleware);

// GET /api/activity?projectId=xxx&page=1&limit=50
router.get("/", listActivityLogs);

export default router;
