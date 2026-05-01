# View System Implementation Plan (Spreadsheet + Kanban First)

This document lists exactly what will be implemented next for the dynamic-field view system.

Scope for this iteration:
- Implement fully: Spreadsheet view, Kanban view.
- Prepare now (placeholder only): Calendar view, Timeline view.
- Add View Manager in header tabs.
- Enforce "at least one default view per database".

Out of scope for this iteration:
- Full Calendar business logic.
- Full Timeline/Gantt business logic.

## 1) Database Layer (`packages/database`)

### 1.1 Prisma schema changes
1. Add enum `DynViewType` with values:
   - `spreadsheet`
   - `kanban`
   - `calendar`
   - `timeline`
2. Add new model `DynView` with fields:
   - `id` (uuid)
   - `databaseId` (FK -> `DynDatabase`)
   - `name` (string)
   - `icon` (string, nullable)
   - `type` (`DynViewType`)
   - `position` (int)
   - `isDefault` (boolean, default `false`)
   - `config` (json, nullable)
   - `createdAt`, `updatedAt`
3. Add relation from `DynDatabase` to `DynView[]`.
4. Add constraints/indexes:
   - index on (`databaseId`, `position`)
   - index on (`databaseId`, `type`)
   - unique default view per database via partial unique index in SQL migration:
     - unique (`databaseId`) where `isDefault = true`

### 1.2 Migration and data backfill
1. Create migration for new enum/model.
2. Backfill existing databases:
   - create 1 default `spreadsheet` view named `Spreadsheet` if none exists.
3. Add SQL safety checks/triggers where needed so a database cannot end with zero views.

### 1.3 Query functions (`queries.ts`)
Implement these query functions:
1. `getDatabaseViews(databaseId)`
2. `createDatabaseView(input)`
3. `updateDatabaseView(viewId, patch)`
4. `deleteDatabaseView(viewId)` with invariant checks (cannot delete last view)
5. `setDefaultDatabaseView(databaseId, viewId)` (single transaction)
6. `reorderDatabaseViews(databaseId, orderedViewIds)`
7. `ensureDefaultView(databaseId)` helper (used by create flows and migration safety)

### 1.4 Export updates
1. Export new types/functions from `packages/database/index.ts`.
2. Regenerate Prisma client after schema change.

## 2) API Layer (`apps/api`)

### 2.1 View API endpoints
Add REST endpoints:
1. `GET /api/databases/:id/views`
2. `POST /api/databases/:id/views`
3. `PATCH /api/views/:viewId`
4. `DELETE /api/views/:viewId`
5. `POST /api/databases/:id/views/reorder`
6. `POST /api/databases/:id/views/:viewId/default`

### 2.2 Validation rules
Validate API payloads for:
1. `type` must be one of enum values.
2. `groupBy` is allowed only for field types:
   - `select`
   - `multi_select`
   - `date`
   - `created_time`
   - `updated_time`
3. For date-like groupBy fields, `granularity` must be one of:
   - `day`
   - `month`
   - `quarter`
4. Reject deleting the last remaining view.
5. Reject state where no default view exists.

### 2.3 Database creation flow updates
Update existing create flows:
1. `POST /api/databases`:
   - accept optional default view input (name/type/icon/config)
   - if omitted, create default `Spreadsheet` view automatically
2. Template creation flow (`template.service.ts`):
   - create default view after database creation
   - guarantee invariant before returning success

### 2.4 Optional SSE extension (if needed this iteration)
1. Add view stream events only if required by frontend UX in this phase:
   - `VIEW_CREATED`, `VIEW_UPDATED`, `VIEW_DELETED`, `VIEW_REORDERED`, `VIEW_DEFAULT_CHANGED`
2. If SSE is not needed immediately, defer and rely on refetch after mutations.

## 3) Web Layer (`apps/web`)

### 3.1 New folder structure (modular views)
Refactor dynamic-field area into dedicated view modules:
1. `src/pages/DynamicField/views/spreadsheet/`
2. `src/pages/DynamicField/views/kanban/`
3. `src/pages/DynamicField/views/calendar/` (placeholder)
4. `src/pages/DynamicField/views/timeline/` (placeholder)
5. Shared view manager UI under:
   - `src/pages/DynamicField/views/components/`

### 3.2 Spreadsheet isolation
1. Extract current table/spreadsheet rendering from `DynamicFieldPage` into spreadsheet module.
2. Keep behavior parity (field editing, records, cells, selection).
3. Keep existing hooks compatible (`useFields`, `useRecords`, etc.) and adapt where needed.

### 3.3 Kanban implementation for dynamic database
1. Build Kanban using dynamic records (not dummy project data).
2. Grouping behavior:
   - by `select` / `multi_select`
   - by date-like fields with granularity options
3. Read/write filter/sort/groupBy from view config.
4. Render empty states and unsupported-config fallback messages.

### 3.4 Calendar and Timeline placeholders
1. Create placeholder view components under the new folders.
2. Render "Coming soon" with basic metadata and a return action.
3. Keep tabs routable/selectable so users can create/select these views now.

### 3.5 View Manager tab bar (header)
1. Replace fixed tabs with DB-driven tabs from view API.
2. Capabilities:
   - create view
   - switch active view
   - per-tab options menu
   - delete view
   - set default view
   - rename view
   - choose icon
3. Add view config dialog from tab options:
   - field order
   - max width
   - filter
   - sort
   - groupBy
4. Ensure deleting active view switches to default/fallback view.

### 3.6 API client updates (web)
1. Add `views` client methods in dynamic field API layer.
2. Add types for `DynView`, `DynViewType`, `ViewConfig`.
3. Add hooks:
   - `useViews(databaseId)`
   - mutation helpers for create/update/delete/reorder/default.

### 3.7 Create New Database dialog updates
1. Add required default-view selection in database creation UI.
2. Prevent submit until valid default view input is provided.
3. Keep backend fallback for old clients.

## 4) Integration and Safety Rules

1. Every database must always have at least one view.
2. Exactly one default view must exist per database.
3. View deletion is blocked for the last remaining view.
4. GroupBy restrictions are enforced in API (not only UI).
5. Existing databases are automatically upgraded with a default Spreadsheet view.

## 5) Test and Verification Plan

### 5.1 Database/API tests
1. Create database without view input -> default Spreadsheet view is created.
2. Cannot delete last view.
3. Changing default view updates exactly one row to `isDefault = true`.
4. Invalid groupBy payload is rejected with 400.
5. Existing databases after migration have >= 1 view and 1 default.

### 5.2 Web tests/manual checks
1. Tab bar loads dynamic views per database.
2. Create/rename/delete/reorder/default actions reflect immediately.
3. Spreadsheet view works after refactor with no regression.
4. Kanban renders dynamic records and applies groupBy.
5. Calendar/Timeline placeholders render correctly and are selectable.

## 6) Delivery Order (exact sequence)

1. Prisma schema + migration + backfill.
2. Database query functions + exports.
3. API endpoints + validation + create-flow updates.
4. Web API client + view hooks/types.
5. Web folder refactor and Spreadsheet isolation.
6. Dynamic Kanban implementation.
7. Calendar/Timeline placeholder folders and return views.
8. Header View Manager tab bar + config dialog.
9. End-to-end verification and fixes.

## 7) Done Criteria for This Iteration

1. Spreadsheet and Kanban are production-ready for dynamic databases.
2. Calendar and Timeline exist as placeholders with routable/return views.
3. Header tab View Manager is fully functional.
4. All database/API invariants for default view are enforced.
5. Existing data remains functional after migration.
