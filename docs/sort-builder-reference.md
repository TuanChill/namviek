# Dynamic Field Sort Builder Reference

Purpose: document how the Dynamic Field sort builder is modeled, persisted, and executed so future changes stay aligned with the backend SQL path.

Status note:

- The web app owns sort editing UX.
- Record ordering now runs on the backend through raw SQL.
- The browser only saves sort config and requests records by active view id.

## 1) Where It Lives

- UI container: `apps/web/src/pages/DynamicField/views/components/ViewManagerTabBar.tsx`
- Sort popover UI: `apps/web/src/pages/DynamicField/views/sort/SortBuilder.tsx`
- Single sort row UI: `apps/web/src/pages/DynamicField/views/sort/SortRuleRow.tsx`
- Sort types: `apps/web/src/pages/DynamicField/views/sort/types.ts`
- Sort constants: `apps/web/src/pages/DynamicField/views/sort/constants.ts`
- Sort tree helpers: `apps/web/src/pages/DynamicField/views/sort/utils.ts`
- View config type: `apps/web/src/pages/DynamicField/types.ts`
- Backend SQL builder: `packages/database/sort-sql.ts`
- Backend query integration: `packages/database/queries.ts`
- Records API hook-in: `apps/api/src/index.ts`
- Runtime fetch integration: `apps/web/src/pages/DynamicFieldPage.tsx` via `api.records.list(selectedDb.id, activeView?.id)`

## 2) Data Model

Sort config is stored as an ordered array on the view config.

- View config field: `ViewConfig.sort`
- Type: `ViewSort`
- Sort rule:
  - `id`
  - `fieldId`
  - `direction: 'asc' | 'desc'`

Important details:

- Sort order is significant: earlier rules have higher priority.
- Rules are edited as a flat list, not a nested tree.
- The backend ignores invalid or deleted fields safely.

Persistence details:

- Sort settings live in `DynView.config.sort`
- Sort is saved through `PATCH /api/views/:viewId` with `config` merged in the browser
- The records endpoint loads by active view id: `GET /api/databases/:id/records?viewId=...`
- Backend resolves the view, reads its sort config, and returns ordered records

## 3) UI Behavior

The sort builder is intentionally minimal and mirrors the filter builder pattern.

- Add multiple sort rules
- Delete a sort rule
- Reorder rules using up/down buttons
- Change the field on a row
- Change the direction on a row

Direction labels are field-type aware:

- text / url / email / select / multi_select / person / id: `A → Z` and `Z → A`
- number: `1 → 9` and `9 → 1`
- date / created_time / updated_time: `first → last` and `last → first`
- checkbox: `unchecked → checked` and `checked → unchecked`
- file: currently uses text-style labels

## 4) Backend Sort Process

Current flow:

1. User edits the sort rows in `SortBuilder.tsx`.
2. The builder updates local UI state immediately.
3. `ViewManagerTabBar.tsx` saves the updated view config through `PATCH /api/views/:viewId`.
4. The API stores the updated config via `updateDatabaseView(...)`.
5. `DynamicFieldPage.tsx` requests records from `GET /api/databases/:id/records?viewId=...`.
6. The API loads the view, extracts `config.sort`, and passes it into `packages/database/queries.ts`.
7. `packages/database/queries.ts` builds a raw SQL record-id query using `buildSortOrderClause(...)`.
8. The query returns ordered record ids.
9. The records are hydrated and then reassembled in the same SQL order before returning to the browser.

Important implications:

- The browser should not sort records after fetch.
- Record order is controlled by backend SQL, not by client-side array sorting.
- Sorting is stable through a `rowNumber` fallback when no valid sort rules exist.

## 5) Backend SQL Builder

`packages/database/sort-sql.ts` is the sort counterpart to the filter SQL helper.

- `buildSortOrderClause(sort, fields)` returns a SQL fragment for `ORDER BY`
- `buildSortedRecordIdsQuery(databaseId, sort, fields)` builds a standalone record-id query
- `buildFilteredRecordIdsQuery(...)` can accept an optional `orderBy` fragment so filter and sort can share the same raw SQL path

Field-type ordering behavior:

- text-like fields use case-insensitive lexical sorting
- select and person fields are sorted by stringized values
- number fields are sorted numerically
- date fields are sorted by date value
- checkbox fields are sorted by boolean value
- file fields are sorted by attachment count
- created/updated time fields use the record timestamps

Null handling:

- The builder applies deterministic `NULLS LAST` semantics to keep empty values predictable.

## 6) API Contract

Records endpoint:

- `GET /api/databases/:id/records?viewId=...`

Behavior:

- If `viewId` is provided, the backend resolves the view and uses its sort config.
- If `viewId` is absent, records default to `rowNumber` order.
- The same endpoint still returns hydrated records with `fieldValues + field`.

View update contract:

- `PATCH /api/views/:viewId` with `{ config: ... }`
- The frontend merges `sort` into `config` before saving

## 7) Safe Extension Checklist

When changing sort behavior:

1. Update the sort types.
  - File: `apps/web/src/pages/DynamicField/views/sort/types.ts`
  - Keep `ViewSort` ordered and flat.

2. Update the UI labels if needed.
  - File: `apps/web/src/pages/DynamicField/views/sort/constants.ts`
  - Add a label mapping for any new field type.

3. Update the SQL builder.
  - File: `packages/database/sort-sql.ts`
  - Add field-type-specific sort expressions.

4. Validate the API config.
  - File: `apps/api/src/index.ts`
  - Reject malformed sort entries early.

5. Preserve record order after hydration.
  - File: `packages/database/queries.ts`
  - Reassemble hydrated rows using the SQL id order.

6. Keep the browser fetch keyed to the active view id.
  - File: `apps/web/src/pages/DynamicFieldPage.tsx`
  - Reload when the active view changes or its config is updated.

## 8) Quick Testing Scenarios

- Multi-sort priority: sort by one field, then break ties with another.
- Reordering rows: moving a sort rule up should change result order.
- Field deletion: deleted fields should be ignored without breaking the query.
- Empty values: nulls and empties remain deterministic.
- Save/reload: updating sort should refresh the view and the new order should appear immediately.
- Filter + sort together: filtered rows should still be returned in the configured sort order.
