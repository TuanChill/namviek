-- CreateEnum
CREATE TYPE "DynViewType" AS ENUM ('spreadsheet', 'kanban', 'calendar', 'timeline');

-- CreateTable
CREATE TABLE "dyn_views" (
    "id" TEXT NOT NULL,
    "databaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "type" "DynViewType" NOT NULL,
    "position" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dyn_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dyn_views_databaseId_position_idx" ON "dyn_views"("databaseId", "position");

-- CreateIndex
CREATE INDEX "dyn_views_databaseId_type_idx" ON "dyn_views"("databaseId", "type");

-- AddForeignKey
ALTER TABLE "dyn_views" ADD CONSTRAINT "dyn_views_databaseId_fkey" FOREIGN KEY ("databaseId") REFERENCES "dyn_databases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
