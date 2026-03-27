import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import {
  listNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  triggerAlerts,
} from "../controllers/notifications/notifications.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/", listNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);
router.post("/run-alerts", triggerAlerts);

export default router;
