-- DropIndex
DROP INDEX "activity_logs_created_at_idx";

-- DropIndex
DROP INDEX "activity_logs_project_id_idx";

-- DropIndex
DROP INDEX "activity_logs_user_id_idx";

-- DropIndex
DROP INDEX "attachments_budget_item_id_idx";

-- DropIndex
DROP INDEX "attachments_contractor_id_idx";

-- DropIndex
DROP INDEX "attachments_entity_type_idx";

-- DropIndex
DROP INDEX "attachments_payment_id_idx";

-- DropIndex
DROP INDEX "attachments_project_id_idx";

-- DropIndex
DROP INDEX "budget_items_category_id_idx";

-- DropIndex
DROP INDEX "categories_project_id_idx";

-- DropIndex
DROP INDEX "contractor_assignments_contractor_id_idx";

-- DropIndex
DROP INDEX "contractors_name_idx";

-- DropIndex
DROP INDEX "contractors_tax_id_idx";

-- DropIndex
DROP INDEX "notifications_created_at_idx";

-- DropIndex
DROP INDEX "notifications_user_id_is_read_idx";

-- DropIndex
DROP INDEX "payments_contractor_id_idx";

-- DropIndex
DROP INDEX "payments_due_date_idx";

-- DropIndex
DROP INDEX "payments_project_id_idx";

-- DropIndex
DROP INDEX "payments_status_idx";

-- DropIndex
DROP INDEX "project_contractors_project_id_idx";

-- DropIndex
DROP INDEX "project_members_user_id_idx";

-- DropIndex
DROP INDEX "projects_created_at_idx";

-- DropIndex
DROP INDEX "projects_status_idx";

-- DropIndex
DROP INDEX "users_email_idx";

-- CreateIndex
CREATE INDEX "activity_logs_project_id_created_at_idx" ON "activity_logs"("project_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "activity_logs_user_id_created_at_idx" ON "activity_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "attachments_entity_type_project_id_idx" ON "attachments"("entity_type", "project_id");

-- CreateIndex
CREATE INDEX "attachments_entity_type_budget_item_id_idx" ON "attachments"("entity_type", "budget_item_id");

-- CreateIndex
CREATE INDEX "attachments_entity_type_contractor_id_idx" ON "attachments"("entity_type", "contractor_id");

-- CreateIndex
CREATE INDEX "attachments_entity_type_payment_id_idx" ON "attachments"("entity_type", "payment_id");

-- CreateIndex
CREATE INDEX "budget_items_category_id_sort_order_idx" ON "budget_items"("category_id", "sort_order");

-- CreateIndex
CREATE INDEX "categories_project_id_sort_order_idx" ON "categories"("project_id", "sort_order");

-- CreateIndex
CREATE INDEX "contractors_is_active_name_idx" ON "contractors"("is_active", "name");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at" DESC);

-- CreateIndex
CREATE INDEX "payments_project_id_status_idx" ON "payments"("project_id", "status");

-- CreateIndex
CREATE INDEX "payments_project_id_contractor_id_idx" ON "payments"("project_id", "contractor_id");

-- CreateIndex
CREATE INDEX "payments_status_due_date_idx" ON "payments"("status", "due_date");

-- CreateIndex
CREATE INDEX "payments_project_id_created_at_idx" ON "payments"("project_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "projects_status_created_at_idx" ON "projects"("status", "created_at" DESC);
