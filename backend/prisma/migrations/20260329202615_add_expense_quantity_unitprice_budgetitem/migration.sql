/*
  Warnings:

  - You are about to drop the column `subtotal` on the `budget_items` table. All the data in the column will be lost.
  - You are about to drop the column `unit_price` on the `budget_items` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "GlobalRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('MATERIALS', 'EQUIPMENT', 'OVERHEAD', 'PERMITS', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CHECK', 'OTHER');

-- AlterTable
ALTER TABLE "budget_items" DROP COLUMN "subtotal",
DROP COLUMN "unit_price",
ADD COLUMN     "cost_subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "cost_unit_price" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "sale_subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "sale_unit_price" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "budget_summaries" ADD COLUMN     "gross_profit" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "profit_margin" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "total_cost_items" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "total_expenses" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "total_revenue" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "certificate_id" TEXT,
ADD COLUMN     "payment_method" "PaymentMethod";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "global_role" "GlobalRole" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "project_expenses" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(14,2) NOT NULL,
    "expense_type" "ExpenseType" NOT NULL,
    "expense_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoice_ref" TEXT,
    "notes" TEXT,
    "budget_item_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "contractor_id" TEXT NOT NULL,
    "certificate_number" INTEGER NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "status" "CertificateStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_items" (
    "id" TEXT NOT NULL,
    "certificate_id" TEXT NOT NULL,
    "budget_item_id" TEXT NOT NULL,
    "previous_quantity" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "current_quantity" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "accumulated_quantity" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "current_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificate_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress_entries" (
    "id" TEXT NOT NULL,
    "budget_item_id" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "recorded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "progress_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_expenses_project_id_expense_type_idx" ON "project_expenses"("project_id", "expense_type");

-- CreateIndex
CREATE INDEX "project_expenses_project_id_expense_date_idx" ON "project_expenses"("project_id", "expense_date" DESC);

-- CreateIndex
CREATE INDEX "project_expenses_budget_item_id_idx" ON "project_expenses"("budget_item_id");

-- CreateIndex
CREATE INDEX "certificates_project_id_status_idx" ON "certificates"("project_id", "status");

-- CreateIndex
CREATE INDEX "certificates_project_id_contractor_id_idx" ON "certificates"("project_id", "contractor_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_project_id_certificate_number_key" ON "certificates"("project_id", "certificate_number");

-- CreateIndex
CREATE INDEX "certificate_items_certificate_id_idx" ON "certificate_items"("certificate_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_items_certificate_id_budget_item_id_key" ON "certificate_items"("certificate_id", "budget_item_id");

-- CreateIndex
CREATE INDEX "progress_entries_budget_item_id_date_idx" ON "progress_entries"("budget_item_id", "date" DESC);

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "certificates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_expenses" ADD CONSTRAINT "project_expenses_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_expenses" ADD CONSTRAINT "project_expenses_budget_item_id_fkey" FOREIGN KEY ("budget_item_id") REFERENCES "budget_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "contractors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_items" ADD CONSTRAINT "certificate_items_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "certificates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_items" ADD CONSTRAINT "certificate_items_budget_item_id_fkey" FOREIGN KEY ("budget_item_id") REFERENCES "budget_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_entries" ADD CONSTRAINT "progress_entries_budget_item_id_fkey" FOREIGN KEY ("budget_item_id") REFERENCES "budget_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_entries" ADD CONSTRAINT "progress_entries_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
