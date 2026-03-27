import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./config/db.js";
import { startCronJobs } from "./config/cron.js";
import authRoutes from "./routes/auth.routes.js";
import paymentRoutes from "./routes/payments.routes.js";
import contractorRoutes from "./routes/contractors.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import notificationRoutes from "./routes/notifications.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Routes
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/contractors", contractorRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);

  try {
    const result = await pool.query("SELECT NOW()");
    console.log("✓ Conexión a PostgreSQL exitosa:", result.rows[0].now);
  } catch (error) {
    console.error("✗ Error al conectar a PostgreSQL:", error);
  }

  // Iniciar cron jobs
  startCronJobs();
});
