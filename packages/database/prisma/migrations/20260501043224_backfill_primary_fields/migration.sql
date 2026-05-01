-- Backfill: mark the earliest text field in each database as isPrimary = true
-- for databases that don't yet have a primary field.
UPDATE "dyn_fields" df
SET "isPrimary" = true
WHERE df.id IN (
  SELECT DISTINCT ON ("databaseId") id
  FROM "dyn_fields"
  WHERE type = 'text'
    AND "databaseId" NOT IN (
      SELECT DISTINCT "databaseId" FROM "dyn_fields" WHERE "isPrimary" = true
    )
  ORDER BY "databaseId", position ASC
);

-- For databases that still have no primary field (no text field at all),
-- insert a synthetic "Name" field at position -1 so it sorts first.
INSERT INTO "dyn_fields" (id, "databaseId", name, type, position, required, "isPrimary", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  db.id,
  'Name',
  'text',
  -1,
  false,
  true,
  NOW(),
  NOW()
FROM "dyn_databases" db
WHERE db.id NOT IN (
  SELECT DISTINCT "databaseId" FROM "dyn_fields" WHERE "isPrimary" = true
);
