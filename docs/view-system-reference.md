# View System Reference (Quick)

Purpose: quick technical map for the Dynamic View system (database -> API -> web) so future work can continue fast.

## 1) Where Things Live

### Database layer
- Prisma schema:
  - `packages/database/prisma/schema.prisma`
  - Models: `DynDatabase`, `DynView`, `Field`, `DynRecord`, etc.
  - Key view fields:
    - `DynView.type`: `spreadsheet | kanban | calendar | timeline`
    - `DynView.position`: tab order
    - `DynView.isDefault`: default view
    - `DynView.config`: per-view JSON config (`groupBy`, `hiddenFieldIds`, ...)
- Migrations:
  - `packages/database/prisma/migrations/20260501043222_add_dyn_views/`
  - `packages/database/prisma/migrations/20260501043223_backfill_default_views/`
  - `packages/database/prisma/migrations/20260501043224_backfill_primary_fields/`
- Query functions:
  - `packages/database/queries.ts`
  - View queries:
    - `getDatabaseViews`
    - `createDatabaseView`
    - `updateDatabaseView`
    - `deleteDatabaseView` (cannot delete default or last view)
    - `setDefaultDatabaseView`
    - `reorderDatabaseViews`
    - `ensureDefaultView`
  - Field protection:
    - `deleteField` throws for primary field
    - `ensurePrimaryField` helper exists

### API layer
- Main API entry:
  - `apps/api/src/index.ts`
- Field routes:
  - `apps/api/src/services/field.service.ts`
- Template creation flow:
  - `apps/api/src/services/template.service.ts`

View endpoints in `apps/api/src/index.ts`:
- `GET /api/databases/:id/views`
- `POST /api/databases/:id/views`
- `PATCH /api/views/:viewId`
- `DELETE /api/views/:viewId`
- `POST /api/databases/:id/views/reorder`
- `POST /api/databases/:id/views/:viewId/default`

Database creation behavior in `apps/api/src/index.ts`:
- `POST /api/databases` creates:
  - primary text field: `Name` (`isPrimary=true`)
  - default view: Spreadsheet (unless overridden)

Template creation behavior in `apps/api/src/services/template.service.ts`:
- first template field is set `isPrimary=true` when it is text
- default view is ensured via `ensureDefaultView`

### Web layer
- Page integration:
  - `apps/web/src/pages/DynamicFieldPage.tsx`
- Types:
  - `apps/web/src/pages/DynamicField/types.ts`
  - `ViewConfig.hiddenFieldIds` is supported
- API client:
  - `apps/web/src/pages/DynamicField/api.ts` (`api.views.*`)
- View state hook:
  - `apps/web/src/pages/DynamicField/hooks/useViews.ts`
  - includes `moveView(viewId, direction)`
- View tab + edit UI:
  - `apps/web/src/pages/DynamicField/views/components/ViewManagerTabBar.tsx`
  - features:
    - Add view dropdown (no create modal)
    - Per-tab menu: Edit, Rename, Move left/right, Set default, Delete
    - Delete disabled for default and last view
    - Edit dialog: name, icon, groupBy, date granularity, default toggle, fields shown on cards
- Kanban rendering:
  - `apps/web/src/pages/DynamicField/views/kanban/KanbanView.tsx`
  - `apps/web/src/pages/DynamicField/views/kanban/KanbanCard.tsx`
  - `apps/web/src/pages/DynamicField/views/kanban/KanbanColumn.tsx`
  - card preview respects `view.config.hiddenFieldIds`
- Calendar rendering:
  - `apps/web/src/pages/DynamicField/views/calendar/CalendarView.tsx`
  - props: `fields, records, loading, view, onUpdateView, onAddRecord, onSetValue`
  - month mode: 7-column grid; records placed by `startDateFieldId`
  - week mode: 7 vertical day-columns for the current week
  - per-cell add record via `AddRecordPopover` (name input + Create); auto-fills start/end date fields
  - add buttons visible on hover only (`opacity-0 group-hover:opacity-100`)
  - empty states: no date fields configured, no start field set
  - mode changes saved back to `view.config` via `onUpdateView`

## 2) Data Contract (View Config)

Defined in `apps/web/src/pages/DynamicField/types.ts`:
- `groupBy`
  - `fieldId`
  - `fieldType`: `select | multi_select | date | created_time | updated_time`
  - `granularity`: `day | month | quarter` (date-like only)
- `hiddenFieldIds?: string[]`
  - used by Kanban card preview to hide fields per view
- `calendar?: ViewCalendarConfig`
  - `startDateFieldId?: string` — field used to place records on the grid
  - `endDateFieldId?: string` — optional field for record end date
  - `mode?: 'month' | 'week'` — default `'month'`
  - only fields with type `date | created_time | updated_time` are shown as options

Stored in DB as `DynView.config` JSON.

## 3) Behavior Rules

- View order is database-backed via `DynView.position`.
- "Move left/right" updates order through `POST /api/databases/:id/views/reorder`.
- Default view cannot be deleted.
- Last remaining view cannot be deleted.
- Primary field cannot be deleted.
- Every database should have:
  - at least one default view
  - one primary text field

## 4) Fast Change Guide

If you need to change view behavior:
1. Update types in `apps/web/src/pages/DynamicField/types.ts`.
2. Update API payload/validation in `apps/api/src/index.ts`.
3. Update persistence query in `packages/database/queries.ts`.
4. Update UI in:
   - `apps/web/src/pages/DynamicField/views/components/ViewManagerTabBar.tsx`
   - `apps/web/src/pages/DynamicField/views/kanban/KanbanView.tsx`
   - `apps/web/src/pages/DynamicField/views/calendar/CalendarView.tsx`
5. If schema changes: add Prisma migration under `packages/database/prisma/migrations/`.

### Calendar-specific notes
- Edit View dialog shows calendar settings (start/end date selectors, mode) only when `view.type === 'calendar'`.
- "Fields shown on cards" section is hidden for calendar views (only relevant for kanban/timeline).
- `ViewCalendarConfig` is defined in `apps/web/src/pages/DynamicField/types.ts`.
- `DynamicFieldPage.tsx` passes `onAddRecord` (returns created record), `onSetValue`, and `onUpdateView` to `CalendarView`.

## 5) Useful Commands

- Web typecheck:
  - `cd apps/web && npx tsc --noEmit`
- API typecheck:
  - `cd apps/api && npx tsc --noEmit`
- DB migrate deploy:
  - `cd packages/database && npx prisma migrate deploy`
- Run web:
  - `pnpm --filter web dev`
- Run api:
  - `pnpm --filter api dev`

## 6) Known Note

`packages/database` currently has pre-existing TypeScript strict optional errors (`TS2375`) unrelated to this view map doc. API and web typechecks pass.
