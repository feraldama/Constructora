-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MeasurementUnit" ADD VALUE 'LITER';
ALTER TYPE "MeasurementUnit" ADD VALUE 'INCH';

-- CreateTable
CREATE TABLE "apu_templates" (
    "id" TEXT NOT NULL,
    "rubro" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" "MeasurementUnit" NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apu_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apu_template_materials" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "consumption_per_unit" DECIMAL(12,4) NOT NULL,
    "waste_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apu_template_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apu_template_labor" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cost_per_unit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apu_template_labor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "project_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "total_amount" DECIMAL(14,2) NOT NULL,
    "supplier" TEXT,
    "invoice_ref" TEXT,
    "purchase_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_method" "PaymentMethod",
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "apu_templates_rubro_sort_order_idx" ON "apu_templates"("rubro", "sort_order");

-- CreateIndex
CREATE INDEX "apu_templates_is_active_name_idx" ON "apu_templates"("is_active", "name");

-- CreateIndex
CREATE UNIQUE INDEX "apu_templates_rubro_name_key" ON "apu_templates"("rubro", "name");

-- CreateIndex
CREATE INDEX "apu_template_materials_template_id_idx" ON "apu_template_materials"("template_id");

-- CreateIndex
CREATE INDEX "apu_template_materials_material_id_idx" ON "apu_template_materials"("material_id");

-- CreateIndex
CREATE UNIQUE INDEX "apu_template_materials_template_id_material_id_key" ON "apu_template_materials"("template_id", "material_id");

-- CreateIndex
CREATE INDEX "apu_template_labor_template_id_idx" ON "apu_template_labor"("template_id");

-- CreateIndex
CREATE INDEX "purchases_material_id_purchase_date_idx" ON "purchases"("material_id", "purchase_date" DESC);

-- CreateIndex
CREATE INDEX "purchases_project_id_purchase_date_idx" ON "purchases"("project_id", "purchase_date" DESC);

-- CreateIndex
CREATE INDEX "purchases_purchase_date_idx" ON "purchases"("purchase_date" DESC);

-- AddForeignKey
ALTER TABLE "apu_template_materials" ADD CONSTRAINT "apu_template_materials_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "apu_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apu_template_materials" ADD CONSTRAINT "apu_template_materials_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apu_template_labor" ADD CONSTRAINT "apu_template_labor_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "apu_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
