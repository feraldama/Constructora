-- CreateEnum
CREATE TYPE "MaterialCategory" AS ENUM ('CEMENT', 'STEEL', 'WOOD', 'AGGREGATES', 'CERAMICS', 'PLUMBING', 'ELECTRICAL', 'PAINT', 'WATERPROOFING', 'HARDWARE', 'OTHER');

-- CreateEnum
CREATE TYPE "ClientPaymentConcept" AS ENUM ('ADVANCE', 'PROGRESS', 'FINAL', 'RETENTION_RELEASE', 'OTHER');

-- AlterTable
ALTER TABLE "budget_summaries" ADD COLUMN     "cash_flow" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "total_client_payments" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" "MeasurementUnit" NOT NULL,
    "unit_price" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "category" "MaterialCategory" NOT NULL DEFAULT 'OTHER',
    "brand" TEXT,
    "supplier" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_item_materials" (
    "id" TEXT NOT NULL,
    "budget_item_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "consumption_per_unit" DECIMAL(12,4) NOT NULL,
    "waste_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_item_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_item_labor" (
    "id" TEXT NOT NULL,
    "budget_item_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cost_per_unit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_item_labor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_payments" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "payment_method" "PaymentMethod",
    "concept" "ClientPaymentConcept" NOT NULL DEFAULT 'PROGRESS',
    "reference" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "materials_category_is_active_idx" ON "materials"("category", "is_active");

-- CreateIndex
CREATE INDEX "materials_name_idx" ON "materials"("name");

-- CreateIndex
CREATE INDEX "budget_item_materials_budget_item_id_idx" ON "budget_item_materials"("budget_item_id");

-- CreateIndex
CREATE INDEX "budget_item_materials_material_id_idx" ON "budget_item_materials"("material_id");

-- CreateIndex
CREATE UNIQUE INDEX "budget_item_materials_budget_item_id_material_id_key" ON "budget_item_materials"("budget_item_id", "material_id");

-- CreateIndex
CREATE INDEX "budget_item_labor_budget_item_id_idx" ON "budget_item_labor"("budget_item_id");

-- CreateIndex
CREATE INDEX "client_payments_project_id_payment_date_idx" ON "client_payments"("project_id", "payment_date" DESC);

-- CreateIndex
CREATE INDEX "client_payments_project_id_concept_idx" ON "client_payments"("project_id", "concept");

-- AddForeignKey
ALTER TABLE "budget_item_materials" ADD CONSTRAINT "budget_item_materials_budget_item_id_fkey" FOREIGN KEY ("budget_item_id") REFERENCES "budget_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_item_materials" ADD CONSTRAINT "budget_item_materials_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_item_labor" ADD CONSTRAINT "budget_item_labor_budget_item_id_fkey" FOREIGN KEY ("budget_item_id") REFERENCES "budget_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_payments" ADD CONSTRAINT "client_payments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
