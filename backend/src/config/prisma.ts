import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:12345@localhost:5432/Prueba?schema=public",
});

const prisma = new PrismaClient({ adapter });

export default prisma;
