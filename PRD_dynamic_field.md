# Dynamic Fields System — PRD v1.0

> **Stack:** Prisma + PostgreSQL  
> **Version:** 1.0.0  
> **Date:** April 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Field Type Catalogue](#2-field-type-catalogue)
3. [Database Schema Design](#3-database-schema-design)
4. [Query API Design](#4-query-api-design)
5. [Service Layer API](#5-service-layer-api)
6. [Validation Rules](#6-validation-rules)
7. [Performance Considerations](#7-performance-considerations)
8. [Migration Plan](#8-migration-plan)

---

## 1. Overview

### 1.1 Purpose

This document defines the requirements and technical design for a **Dynamic Fields System** — a database-driven property engine modeled after Notion's database fields. It enables users to attach typed, configurable properties to any record in a workspace, with full support for filtering, sorting, and grouping queries.

### 1.2 Goals

- Allow users to define custom typed fields per database/table at runtime without schema migrations.
- Store and retrieve field values with type safety enforced at the application layer.
- Support filter, sort, and group operations across all 15 field types.
- Track record provenance (created/updated by whom and when) automatically.
- Design for extensibility: new field types can be added without breaking existing data.

### 1.3 Out of Scope

- UI/frontend implementation details.
- Multi-tenant workspace isolation (covered in a separate PRD).
- Real-time collaboration / conflict resolution.
- Field formula / rollup types.

---

## 2. Field Type Catalogue

The following 15 field types must be supported. Each type defines how its value is stored, validated, and queried.

| # | Field Type | Storage Column | Description |
|---|-----------|---------------|-------------|
| 1 | `text` | `text_value` | Plain or rich text string. Supports full-text search. |
| 2 | `number` | `number_value` | Numeric value (integer or float). Supports arithmetic comparisons. |
| 3 | `select` | `select_value` | Single option chosen from a predefined option list. |
| 4 | `multi_select` | `multi_select_value` | Array of options chosen from a predefined option list. |
| 5 | `date` | `date_value` | Single date or date-time. Stored as `timestamptz`. |
| 6 | `person` | `person_value` | Array of user UUIDs referencing the `users` table. |
| 7 | `checkbox` | `bool_value` | Boolean true/false toggle. |
| 8 | `file` | `json_value` | Array of file objects: `{ name, url, size, mime }`. |
| 9 | `url` | `text_value` | URL string. Validated as a proper URI. |
| 10 | `email` | `text_value` | Email address string. Validated as RFC 5322 format. |
| 11 | `id` | *(computed)* | Auto-incrementing human-readable row ID. Read-only. Derived from `records.row_number`. |
| 12 | `created_time` | *(computed)* | Timestamp of record creation. Read-only. Derived from `records.created_at`. |
| 13 | `created_by` | *(computed)* | User who created the record. Read-only. Derived from `records.created_by_id`. |
| 14 | `updated_time` | *(computed)* | Timestamp of last update. Read-only. Derived from `records.updated_at`. |
| 15 | `updated_by` | *(computed)* | User who last updated the record. Read-only. Derived from `records.updated_by_id`. |

> **Note:** `url` and `email` reuse `text_value` storage — the type discriminator on the field definition controls validation and display. Computed fields (`id`, `created_time`, `created_by`, `updated_time`, `updated_by`) are **never written** to `field_values`; they are derived at query time from the `records` table.

---

## 3. Database Schema Design

### 3.1 Design Philosophy

The schema follows an **Entity-Attribute-Value (EAV)** pattern with per-type storage columns — a hybrid sometimes called "typed EAV" or "wide sparse table". Each record has one row in `field_values` per defined field. The value is stored in the column that matches the field's type; all other value columns are NULL.

**Why typed EAV over pure JSON?**
- Native type operations: `ORDER BY number_value`, date comparisons, GIN index on arrays.
- Partial indexes: `CREATE INDEX` only on non-null columns for each type.
- Readability: `pg_dump` output remains human-readable; no opaque JSON blobs.

### 3.2 Entity Relationship Overview

```
Workspace
  └── Database (many)
        ├── Field (many)          ← schema / column definitions
        │     └── FieldOption     ← choices for select / multi_select
        ├── Record (many)         ← data rows
        │     └── FieldValue      ← one per Field per Record
        └── View (many)           ← saved filter/sort/group state

User
  ├── records.created_by_id
  ├── records.updated_by_id
  └── field_values.person_value[] (UUIDs)
```

### 3.3 Prisma Schema

#### 3.3.1 Enums

```prisma
enum FieldType {
  text
  number
  select
  multi_select
  date
  person
  checkbox
  file
  url
  email
  id           // computed — no field_values row written
  created_time // computed
  created_by   // computed
  updated_time // computed
  updated_by   // computed
}

enum SortDirection {
  asc
  desc
}
```

#### 3.3.2 User

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  avatarUrl String?
  createdAt DateTime @default(now())

  createdRecords Record[] @relation("RecordCreatedBy")
  updatedRecords Record[] @relation("RecordUpdatedBy")

  @@map("users")
}
```

#### 3.3.3 Workspace

```prisma
model Workspace {
  id        String     @id @default(uuid())
  name      String
  slug      String     @unique
  createdAt DateTime   @default(now())

  databases Database[]

  @@map("workspaces")
}
```

#### 3.3.4 Database

```prisma
model Database {
  id          String   @id @default(uuid())
  workspaceId String
  name        String
  description String?
  icon        String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  fields    Field[]
  records   Record[]
  views     View[]

  @@index([workspaceId])
  @@map("databases")
}
```

#### 3.3.5 Field (Column Definition)

```prisma
model Field {
  id         String    @id @default(uuid())
  databaseId String
  name       String
  type       FieldType
  position   Int       // display order among fields
  required   Boolean   @default(false)
  isPrimary  Boolean   @default(false) // marks the "title" field
  config     Json?     // type-specific config (see Section 3.5)
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  database    Database      @relation(fields: [databaseId], references: [id], onDelete: Cascade)
  options     FieldOption[]
  fieldValues FieldValue[]

  @@unique([databaseId, name])
  @@index([databaseId, position])
  @@map("fields")
}
```

#### 3.3.6 FieldOption (Select & Multi-Select Choices)

```prisma
model FieldOption {
  id       String  @id @default(uuid())
  fieldId  String
  label    String
  color    String? // hex color e.g. "#3B82F6"
  position Int     // display order

  field Field @relation(fields: [fieldId], references: [id], onDelete: Cascade)

  @@unique([fieldId, label])
  @@index([fieldId, position])
  @@map("field_options")
}
```

#### 3.3.7 Record

```prisma
model Record {
  id          String    @id @default(uuid())
  databaseId  String
  rowNumber   Int       // auto-incrementing friendly ID per database
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  createdById String
  updatedById String
  archivedAt  DateTime?

  database    Database     @relation(fields: [databaseId], references: [id], onDelete: Cascade)
  createdBy   User         @relation("RecordCreatedBy", fields: [createdById], references: [id])
  updatedBy   User         @relation("RecordUpdatedBy", fields: [updatedById], references: [id])
  fieldValues FieldValue[]

  @@unique([databaseId, rowNumber])
  @@index([databaseId, createdAt])
  @@index([databaseId, updatedAt])
  @@map("records")
}
```

#### 3.3.8 FieldValue (The EAV Value Row)

```prisma
model FieldValue {
  id               String    @id @default(uuid())
  recordId         String
  fieldId          String

  // Only ONE of the following columns is non-null per row,
  // determined by the parent Field.type.
  textValue        String?          // text, url, email
  numberValue      Decimal?         @db.Decimal(20, 6)
  selectValue      String?          // FieldOption.id
  multiSelectValue String[]         // array of FieldOption.id
  dateValue        DateTime?        @db.Timestamptz(6)
  personValue      String[]         // array of User.id
  boolValue        Boolean?         // checkbox
  jsonValue        Json?            // file: [{ name, url, size, mime }]

  record Record @relation(fields: [recordId], references: [id], onDelete: Cascade)
  field  Field  @relation(fields: [fieldId],  references: [id], onDelete: Cascade)

  @@unique([recordId, fieldId])
  @@index([fieldId, textValue])
  @@index([fieldId, numberValue])
  @@index([fieldId, selectValue])
  @@index([fieldId, dateValue])
  @@index([fieldId, boolValue])
  @@map("field_values")
}
```

#### 3.3.9 View (Saved Filter/Sort/Group State)

```prisma
model View {
  id           String   @id @default(uuid())
  databaseId   String
  name         String
  type         String   @default("grid") // grid | board | calendar | gallery
  filters      Json     @default("[]")
  sorts        Json     @default("[]")
  groups       Json     @default("[]")
  hiddenFields String[] // array of Field.id to hide
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  database Database @relation(fields: [databaseId], references: [id], onDelete: Cascade)

  @@index([databaseId])
  @@map("views")
}
```

### 3.4 PostgreSQL-Level Extras

#### 3.4.1 Per-Database row_number Sequence

```sql
-- Friendly per-database row number (like Notion's ID field)
CREATE TABLE database_sequences (
  database_id UUID PRIMARY KEY,
  last_value  INT  NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION next_row_number(p_db_id UUID)
RETURNS INT AS $$
  INSERT INTO database_sequences (database_id, last_value)
  VALUES (p_db_id, 1)
  ON CONFLICT (database_id)
  DO UPDATE SET last_value = database_sequences.last_value + 1
  RETURNING last_value;
$$ LANGUAGE SQL;
```

#### 3.4.2 GIN Indexes for Array Fields

```sql
-- Multi-select "contains" filter
CREATE INDEX idx_fv_multi_select_gin
  ON field_values USING GIN (multi_select_value);

-- Person "contains user" filter
CREATE INDEX idx_fv_person_gin
  ON field_values USING GIN (person_value);

-- Full-text search on text fields
CREATE INDEX idx_fv_text_fts
  ON field_values USING GIN (to_tsvector('english', coalesce(text_value, '')));
```

#### 3.4.3 Partial Indexes

```sql
-- Only index non-null values to keep index size small
CREATE INDEX idx_fv_number_partial
  ON field_values (field_id, number_value)
  WHERE number_value IS NOT NULL;

CREATE INDEX idx_fv_date_partial
  ON field_values (field_id, date_value)
  WHERE date_value IS NOT NULL;

CREATE INDEX idx_fv_bool_partial
  ON field_values (field_id, bool_value)
  WHERE bool_value IS NOT NULL;
```

### 3.5 Field Config JSON Reference

The `config` column on `Field` stores type-specific settings as a JSON object.

| Field Type | Config Shape | Notes |
|-----------|-------------|-------|
| `number` | `{ "format": "integer"\|"decimal"\|"percent"\|"currency", "precision": 0-6, "currency": "USD" }` | `precision` controls decimal places shown in UI |
| `date` | `{ "includeTime": true\|false, "timeZone": "UTC" }` | Values always stored as UTC `timestamptz` |
| `text` | `{ "richText": true\|false }` | `richText: true` allows markdown/HTML in UI |
| `url` | `{ "previewable": true\|false }` | Controls whether a link preview is shown |
| `file` | `{ "maxFiles": 10, "allowedMime": ["image/*","application/pdf"] }` | `maxFiles: 0` = unlimited |
| `select` / `multi_select` | `{ "allowCreate": true\|false }` | `allowCreate` lets users add new options on the fly |
| All others | `null` or `{}` | No extra config required |

---

## 4. Query API Design

All filter, sort, and group operations are expressed as JSON payloads. The backend translates them into Prisma/SQL queries at runtime.

### 4.1 Filter

#### 4.1.1 FilterClause Shape

```typescript
type FilterOperator =
  | 'equals' | 'not_equals'
  | 'contains' | 'not_contains'
  | 'starts_with' | 'ends_with'
  | 'greater_than' | 'greater_than_or_equal'
  | 'less_than' | 'less_than_or_equal'
  | 'is_any_of' | 'is_none_of'
  | 'contains_all'
  | 'before' | 'after' | 'on_or_before' | 'on_or_after' | 'is_within'
  | 'is_empty' | 'is_not_empty';

type FilterClause = {
  fieldId:  string          // Field.id, or "__created_time" etc. for computed fields
  operator: FilterOperator
  value?:   unknown         // type depends on operator + field type
};

type FilterGroup = {
  logic:   'and' | 'or'
  filters: Array<FilterClause | FilterGroup>  // recursive — supports nesting
};
```

#### 4.1.2 Operators by Field Type

| Field Type | Supported Operators |
|-----------|-------------------|
| `text`, `url`, `email` | `equals`, `not_equals`, `contains`, `not_contains`, `starts_with`, `ends_with`, `is_empty`, `is_not_empty` |
| `number` | `equals`, `not_equals`, `greater_than`, `greater_than_or_equal`, `less_than`, `less_than_or_equal`, `is_empty`, `is_not_empty` |
| `select` | `equals`, `not_equals`, `is_any_of`, `is_none_of`, `is_empty`, `is_not_empty` |
| `multi_select` | `contains`, `not_contains`, `contains_all`, `is_empty`, `is_not_empty` |
| `date` | `equals`, `before`, `after`, `on_or_before`, `on_or_after`, `is_within` (last N days), `is_empty`, `is_not_empty` |
| `person` | `contains` (user id), `not_contains`, `is_empty`, `is_not_empty` |
| `checkbox` | `equals` (`true`\|`false`) |
| `file` | `is_empty`, `is_not_empty` |
| `id` | `equals`, `greater_than`, `less_than` |
| `created_time`, `updated_time` | Same as `date` operators — applied to `records.created_at` / `updated_at` |
| `created_by`, `updated_by` | `equals`, `not_equals`, `is_any_of` — applied to `records.created_by_id` / `updated_by_id` |

#### 4.1.3 Filter Translation (Prisma WHERE)

```typescript
// Example: filter where Status = "Done" AND Priority = "High"
const where: Prisma.RecordWhereInput = {
  databaseId: dbId,
  fieldValues: {
    some: {
      fieldId: 'status-field-id',
      selectValue: 'option-id-done'
    }
  },
  AND: [{
    fieldValues: {
      some: {
        fieldId: 'priority-field-id',
        selectValue: 'option-id-high'
      }
    }
  }]
};

// Multi-select "contains" uses Postgres array overlap.
// Raw SQL fallback when Prisma cannot express array operators:
await prisma.$queryRaw`
  SELECT r.* FROM records r
  JOIN field_values fv ON fv.record_id = r.id
  WHERE fv.field_id = ${fieldId}
  AND   fv.multi_select_value && ARRAY[${optionId}]::text[]
`;
```

### 4.2 Sort

#### 4.2.1 SortClause Shape

```typescript
type SortClause = {
  fieldId:   string          // Field.id or computed field key
  direction: 'asc' | 'desc'
  nulls?:    'first' | 'last'  // default "last"
};

type SortPayload = SortClause[];  // applied in array order (primary, secondary, ...)
```

#### 4.2.2 Sort Translation Strategy

Because field values live in a child table, sorting requires a `LEFT JOIN` per sorted field:

```sql
-- Sort by "Due Date" asc, then "Priority" desc
SELECT r.*
FROM   records r
LEFT JOIN field_values fv1 ON fv1.record_id = r.id AND fv1.field_id = 'due-date-field-id'
LEFT JOIN field_values fv2 ON fv2.record_id = r.id AND fv2.field_id = 'priority-field-id'
WHERE  r.database_id = $1
ORDER BY
  fv1.date_value    ASC  NULLS LAST,
  fv2.select_value  DESC NULLS LAST;

-- Computed fields use the records table directly:
ORDER BY r.created_at DESC, r.row_number ASC
```

#### 4.2.3 Sortable Column per Type

| Field Type | `ORDER BY` Column |
|-----------|-----------------|
| `text`, `url`, `email` | `text_value` (lexicographic) |
| `number` | `number_value` (numeric) |
| `select` | `fv.select_value` joined to `field_options.position` (sort by option order) |
| `multi_select` | `array_length(multi_select_value, 1)` — sort by count; or first element |
| `date` | `date_value` (chronological) |
| `person` | Not directly sortable; falls back to `records.updated_at` |
| `checkbox` | `bool_value` (`false` < `true`) |
| `file` | `jsonb_array_length(json_value)` — sort by file count |
| `id` | `records.row_number` |
| `created_time` | `records.created_at` |
| `updated_time` | `records.updated_at` |
| `created_by`, `updated_by` | `JOIN users ON name` for alphabetic sort |

### 4.3 Group

#### 4.3.1 GroupClause Shape

```typescript
type GroupClause = {
  fieldId:       string          // Field.id or computed field key
  direction?:    'asc' | 'desc'  // order of groups, default "asc"
  hideEmpty?:    boolean         // suppress groups with 0 records
  collapsedIds?: string[]        // UI-collapsed group keys (client-stored)
};
```

#### 4.3.2 Group Key Generation per Type

| Field Type | Group Key | Notes |
|-----------|----------|-------|
| `text`, `url`, `email` | Exact `text_value` | One group per unique string, plus one "Empty" group |
| `number` | Bucketed ranges or exact value | Config can specify bucket size (e.g. 0–10, 10–20) |
| `select` | `FieldOption.id` → label | All options shown even if 0 records (unless `hideEmpty: true`) |
| `multi_select` | Each option is its own group; a record appears in N groups | `UNNEST(multi_select_value)` |
| `date` | Truncated to day / week / month / year (configurable) | `DATE_TRUNC` used in SQL |
| `person` | Each `User.id` → `User.name`; a record appears in N groups | `UNNEST(person_value)` + `JOIN users` |
| `checkbox` | "Checked" / "Unchecked" / "Empty" | 3 groups always |
| `created_by`, `updated_by` | `User.id` → `User.name` | Applied to `records` table columns |
| `created_time`, `updated_time` | Truncated by day/week/month | Same as date grouping |
| `id`, `file` | **Not groupable** | Return error if attempted |

#### 4.3.3 Group Query Patterns

```sql
-- Group by select field (e.g. Status)
SELECT
  COALESCE(fv.select_value, '__empty__') AS group_key,
  fo.label                               AS group_label,
  COUNT(r.id)                            AS record_count
FROM   records r
LEFT JOIN field_values fv
       ON fv.record_id = r.id
      AND fv.field_id  = $fieldId
LEFT JOIN field_options fo
       ON fo.id = fv.select_value
WHERE  r.database_id = $databaseId
GROUP  BY group_key, fo.label, fo.position
ORDER  BY fo.position ASC NULLS LAST;

-- Multi-select group (record appears in multiple groups)
SELECT
  UNNEST(fv.multi_select_value) AS group_key,
  COUNT(DISTINCT r.id)          AS record_count
FROM   records r
JOIN   field_values fv ON fv.record_id = r.id AND fv.field_id = $fieldId
WHERE  r.database_id = $databaseId
GROUP  BY group_key;

-- Date group by month
SELECT
  DATE_TRUNC('month', fv.date_value) AS group_key,
  COUNT(r.id)                        AS record_count
FROM   records r
LEFT JOIN field_values fv ON fv.record_id = r.id AND fv.field_id = $fieldId
WHERE  r.database_id = $databaseId
GROUP  BY group_key
ORDER  BY group_key ASC NULLS LAST;
```

---

## 5. Service Layer API

### 5.1 RecordQueryService

Single entry point for all record fetch operations. Accepts a `QueryInput` and builds the full parameterized SQL / Prisma query.

```typescript
interface QueryInput {
  databaseId: string
  filters?:   FilterGroup
  sorts?:     SortClause[]
  group?:     GroupClause
  pagination: { page: number; pageSize: number }
  fields?:    string[]  // limit which fields are returned
}

interface QueryResult {
  groups?:  GroupResult[]       // present when group is specified
  records:  RecordWithValues[]
  total:    number
  page:     number
  pageSize: number
}

interface GroupResult {
  key:         string
  label:       string
  recordCount: number
  records:     RecordWithValues[]  // populated if group.expandInline
}
```

### 5.2 FieldValueWriteService

```typescript
// Upsert a single field value
async function setFieldValue(
  recordId: string,
  fieldId:  string,
  rawValue: unknown,  // validated & cast by FieldTypeHandler
  actorId:  string
): Promise<FieldValue>

// Bulk upsert (used on record creation)
async function setFieldValues(
  recordId: string,
  values:   { fieldId: string; value: unknown }[],
  actorId:  string
): Promise<FieldValue[]>
```

### 5.3 Computed Field Resolution

Computed fields **never** call `setFieldValue`. They are resolved at read time by projecting from the `records` table:

| Computed Field | Source Column | Return Type |
|---------------|--------------|------------|
| `id` | `records.row_number` | `number` |
| `created_time` | `records.created_at` | ISO 8601 string |
| `created_by` | `records.created_by_id` + JOIN `users` | `{ id, name, avatarUrl }` |
| `updated_time` | `records.updated_at` | ISO 8601 string |
| `updated_by` | `records.updated_by_id` + JOIN `users` | `{ id, name, avatarUrl }` |

---

## 6. Validation Rules

| Field Type | Write Validation |
|-----------|----------------|
| `text` | Max 100,000 characters. If `richText: false`, strip HTML tags. |
| `number` | Must be a valid finite number. `NaN` and `Infinity` rejected. |
| `select` | Value must be an existing `FieldOption.id` for the same field. |
| `multi_select` | Each element must be an existing `FieldOption.id`. Duplicates de-duped. |
| `date` | Must be parseable ISO 8601. Stored as UTC. |
| `person` | Each UUID must exist in the `users` table. Duplicates de-duped. |
| `checkbox` | Coerced to boolean. `"true"` / `"1"` / `1` → `true`; anything else → `false`. |
| `file` | Must be array of `{ name: string, url: string, size: number, mime: string }`. Max files per `config`. |
| `url` | Must match `/^https?:\/\//`. Max 2,048 characters. |
| `email` | Must match RFC 5322 simplified regex. Max 320 characters. |
| `id`, `created_time`, `created_by`, `updated_time`, `updated_by` | **Read-only.** Write attempts return HTTP 400. |

---

## 7. Performance Considerations

### 7.1 Query Optimization

- Always filter on `databaseId` first — limits the scan to a single database's records.
- Use prepared statements / parameterized queries to prevent SQL injection and enable query plan caching.
- Limit raw `$queryRaw` calls to array-operator clauses that Prisma cannot express. All other clauses use Prisma's typed API.
- **Pagination:** use keyset pagination (cursor-based) for large datasets rather than `OFFSET`.

### 7.2 Index Strategy Summary

| Index | Type | Purpose |
|-------|------|---------|
| `field_values(field_id, text_value)` | B-tree | `equals` / `contains` filters on text |
| `field_values(field_id, number_value) WHERE number_value IS NOT NULL` | Partial B-tree | Range queries on numbers |
| `field_values(field_id, date_value) WHERE date_value IS NOT NULL` | Partial B-tree | Date range & sort |
| `field_values(field_id, bool_value) WHERE bool_value IS NOT NULL` | Partial B-tree | Checkbox filter |
| `field_values(field_id, select_value)` | B-tree | Single-select filter & sort |
| `field_values(multi_select_value)` | GIN | Array containment (`@>`) for multi-select |
| `field_values(person_value)` | GIN | Array containment (`@>`) for person |
| `field_values(to_tsvector(text_value))` | GIN | Full-text search |
| `records(database_id, created_at)` | B-tree | Default sort + `created_time` filter |
| `records(database_id, updated_at)` | B-tree | `updated_time` filter & sort |

### 7.3 Scaling Notes

- For databases with > 1M records, consider partitioning `field_values` by `database_id` using PostgreSQL declarative partitioning.
- Views with complex filter+sort combinations can be materialized as background-refreshed cache tables.
- `person` and `multi_select` fields that `UNNEST` rows for grouping can be expensive at scale — consider pre-aggregated counts in a summary table updated by a trigger.

---

## 8. Migration Plan

### 8.1 Prisma Migration Files (in order)

| Migration | Description |
|----------|-------------|
| `0001_create_users` | `users` table + index |
| `0002_create_workspaces` | `workspaces` table |
| `0003_create_databases` | `databases` table + FK to `workspaces` |
| `0004_create_fields_and_options` | `fields` + `field_options` tables + FK + unique constraints |
| `0005_create_records` | `records` table + `row_number` sequence function + indexes |
| `0006_create_field_values` | `field_values` table + all B-tree indexes |
| `0007_gin_indexes` | GIN indexes (run separately — can be `CONCURRENT`) |
| `0008_create_views` | `views` table |

### 8.2 Seed Data

- Seed a default `Workspace` and one `Database` named "Starter DB".
- Create one field of each type to validate the schema end-to-end.
- Insert 100 sample records with randomized values for load-testing indexes.

---

*End of PRD — Dynamic Fields System v1.0*
