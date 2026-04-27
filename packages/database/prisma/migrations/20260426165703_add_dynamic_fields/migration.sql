-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('text', 'number', 'select', 'multi_select', 'date', 'person', 'checkbox', 'file', 'url', 'email', 'id', 'created_time', 'created_by', 'updated_time', 'updated_by');

-- CreateTable
CREATE TABLE "dyn_databases" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dyn_databases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dyn_fields" (
    "id" TEXT NOT NULL,
    "databaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FieldType" NOT NULL,
    "position" INTEGER NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dyn_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dyn_field_options" (
    "id" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT,
    "position" INTEGER NOT NULL,

    CONSTRAINT "dyn_field_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dyn_records" (
    "id" TEXT NOT NULL,
    "databaseId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "dyn_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dyn_field_values" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "textValue" TEXT,
    "numberValue" DECIMAL(20,6),
    "selectValue" TEXT,
    "multiSelectValue" TEXT[],
    "dateValue" TIMESTAMPTZ(6),
    "personValue" TEXT[],
    "boolValue" BOOLEAN,
    "jsonValue" JSONB,

    CONSTRAINT "dyn_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dyn_fields_databaseId_position_idx" ON "dyn_fields"("databaseId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "dyn_fields_databaseId_name_key" ON "dyn_fields"("databaseId", "name");

-- CreateIndex
CREATE INDEX "dyn_field_options_fieldId_position_idx" ON "dyn_field_options"("fieldId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "dyn_field_options_fieldId_label_key" ON "dyn_field_options"("fieldId", "label");

-- CreateIndex
CREATE INDEX "dyn_records_databaseId_createdAt_idx" ON "dyn_records"("databaseId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "dyn_records_databaseId_rowNumber_key" ON "dyn_records"("databaseId", "rowNumber");

-- CreateIndex
CREATE INDEX "dyn_field_values_fieldId_textValue_idx" ON "dyn_field_values"("fieldId", "textValue");

-- CreateIndex
CREATE INDEX "dyn_field_values_fieldId_numberValue_idx" ON "dyn_field_values"("fieldId", "numberValue");

-- CreateIndex
CREATE INDEX "dyn_field_values_fieldId_selectValue_idx" ON "dyn_field_values"("fieldId", "selectValue");

-- CreateIndex
CREATE INDEX "dyn_field_values_fieldId_dateValue_idx" ON "dyn_field_values"("fieldId", "dateValue");

-- CreateIndex
CREATE INDEX "dyn_field_values_fieldId_boolValue_idx" ON "dyn_field_values"("fieldId", "boolValue");

-- CreateIndex
CREATE UNIQUE INDEX "dyn_field_values_recordId_fieldId_key" ON "dyn_field_values"("recordId", "fieldId");

-- AddForeignKey
ALTER TABLE "dyn_fields" ADD CONSTRAINT "dyn_fields_databaseId_fkey" FOREIGN KEY ("databaseId") REFERENCES "dyn_databases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dyn_field_options" ADD CONSTRAINT "dyn_field_options_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "dyn_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dyn_records" ADD CONSTRAINT "dyn_records_databaseId_fkey" FOREIGN KEY ("databaseId") REFERENCES "dyn_databases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dyn_field_values" ADD CONSTRAINT "dyn_field_values_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "dyn_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dyn_field_values" ADD CONSTRAINT "dyn_field_values_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "dyn_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;
