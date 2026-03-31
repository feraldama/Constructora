import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import pool from "./config/db.js";
import { startCronJobs } from "./config/cron.js";
import authRoutes from "./routes/auth.routes.js";
import paymentRoutes from "./routes/payments.routes.js";
import contractorRoutes from "./routes/contractors.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import notificationRoutes from "./routes/notifications.routes.js";
import attachmentRoutes from "./routes/attachments.routes.js";
import projectRoutes from "./routes/projects.routes.js";
import budgetRoutes from "./routes/budget.routes.js";
import assignmentRoutes from "./routes/assignments.routes.js";
import activityRoutes from "./routes/activity.routes.js";
import memberRoutes from "./routes/members.routes.js";
import usersRoutes from "./routes/users.routes.js";
import accountRoutes from "./routes/account.routes.js";
import progressRoutes from "./routes/progress.routes.js";
import certificateRoutes, { certificateItemsRouter } from "./routes/certificates.routes.js";
import materialRoutes from "./routes/materials.routes.js";
import apuRoutes from "./routes/apu.routes.js";
import clientPaymentRoutes from "./routes/client-payments.routes.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// Servir archivos subidos (local storage)
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

// Routes
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/contractors", contractorRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api", budgetRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/attachments", attachmentRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/projects", memberRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/account", accountRoutes);
app.use("/api", progressRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api", certificateItemsRouter);
app.use("/api/materials", materialRoutes);
app.use("/api", apuRoutes);
app.use("/api/projects", clientPaymentRoutes);

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);

  try {
    const result = await pool.query("SELECT NOW()");
    console.log("✓ Conexión a PostgreSQL exitosa:", result.rows[0].now);
  } catch (error) {
    console.error("✗ Error al conectar a PostgreSQL:", error);
  }

  startCronJobs();
});
