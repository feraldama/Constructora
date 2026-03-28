import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { addMemberSchema, updateMemberRoleSchema } from "../controllers/members/members.schema.js";
import {
  listMembers,
  addMember,
  updateMemberRole,
  removeMember,
} from "../controllers/members/members.controller.js";

const router = Router();

router.use(authMiddleware);

// GET  /api/projects/:projectId/members
router.get("/:projectId/members", listMembers);
// POST /api/projects/:projectId/members
router.post("/:projectId/members", validate(addMemberSchema), addMember);
// PATCH /api/projects/:projectId/members/:memberId
router.patch("/:projectId/members/:memberId", validate(updateMemberRoleSchema), updateMemberRole);
// DELETE /api/projects/:projectId/members/:memberId
router.delete("/:projectId/members/:memberId", removeMember);

export default router;
