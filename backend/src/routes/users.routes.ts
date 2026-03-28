import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/requireRole.js";
import { validate } from "../middlewares/validate.js";
import {
  listUsersSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
} from "../controllers/users/users.schema.js";
import {
  listUsers,
  getUser,
  updateUserRole,
  updateUserStatus,
} from "../controllers/users/users.controller.js";

const router = Router();

router.use(authMiddleware);
router.use(requireRole("SUPER_ADMIN", "ADMIN"));

router.get("/", validate(listUsersSchema, "query"), listUsers);
router.get("/:id", getUser);
router.patch("/:id/role", validate(updateUserRoleSchema), updateUserRole);
router.patch("/:id/status", validate(updateUserStatusSchema), updateUserStatus);

export default router;
