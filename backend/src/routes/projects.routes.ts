import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { createProjectSchema } from "../controllers/projects/projects.schema.js";
import {
  listProjects,
  createProject,
  deleteProject,
} from "../controllers/projects/projects.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/", listProjects);
router.post("/", validate(createProjectSchema), createProject);
router.delete("/:projectId", deleteProject);

export default router;
