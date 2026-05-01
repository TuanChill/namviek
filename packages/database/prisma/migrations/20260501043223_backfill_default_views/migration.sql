-- Backfill: insert a default Spreadsheet view for every database that has no views yet
INSERT INTO dyn_views (id, "databaseId", name, type, position, "isDefault", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  d.id,
  'Spreadsheet',
  'spreadsheet'::"DynViewType",
  0,
  true,
  NOW(),
  NOW()
FROM dyn_databases d
WHERE NOT EXISTS (
  SELECT 1 FROM dyn_views v WHERE v."databaseId" = d.id
);
