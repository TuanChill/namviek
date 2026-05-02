-- AlterTable
ALTER TABLE "dyn_field_options"
ALTER COLUMN "position" TYPE DOUBLE PRECISION USING "position"::DOUBLE PRECISION;
