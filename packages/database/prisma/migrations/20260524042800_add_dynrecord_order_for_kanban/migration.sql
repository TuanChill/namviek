-- AlterTable
ALTER TABLE "dyn_records" ADD COLUMN     "order" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "dyn_records_databaseId_order_idx" ON "dyn_records"("databaseId", "order");
