import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { upload } from "../middlewares/upload.js";
import {
  uploadAttachments,
  listAttachments,
  deleteAttachment,
} from "../controllers/attachments/attachments.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/", listAttachments);
router.post("/", upload.array("files", 5), uploadAttachments);
router.delete("/:id", deleteAttachment);

export default router;
