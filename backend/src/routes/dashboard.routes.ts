import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { getDashboard, getDashboardOverview } from "../controllers/dashboard/dashboard.controller.js";
import { getCalendarEvents } from "../controllers/dashboard/calendar.controller.js";

const router = Router();

router.use(authMiddleware);
router.get("/", getDashboard);
router.get("/overview", getDashboardOverview);
router.get("/calendar", getCalendarEvents);

export default router;
