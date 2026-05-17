-- CreateTable
CREATE TABLE "dyn_filters" (
    "id" TEXT NOT NULL,
    "viewId" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dyn_filters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dyn_filters_viewId_key" ON "dyn_filters"("viewId");

-- Backfill existing filter configs from dyn_views.config.filter
INSERT INTO "dyn_filters" ("id", "viewId", "config", "createdAt", "updatedAt")
SELECT
  'flt_' || "id",
  "id",
  "config" -> 'filter',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "dyn_views"
WHERE "config" IS NOT NULL
  AND "config" ? 'filter'
  AND ("config" -> 'filter') IS NOT NULL;

-- Remove embedded filter key from view config now that it is normalized
UPDATE "dyn_views"
SET "config" = "config" - 'filter'
WHERE "config" IS NOT NULL
  AND "config" ? 'filter';

-- AddForeignKey
ALTER TABLE "dyn_filters" ADD CONSTRAINT "dyn_filters_viewId_fkey"
FOREIGN KEY ("viewId") REFERENCES "dyn_views"("id") ON DELETE CASCADE ON UPDATE CASCADE;
