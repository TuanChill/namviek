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
- Timeline rendering:
  - `apps/web/src/pages/DynamicField/views/timeline/TimelineView.tsx`
  - props: `fields, records, loading, view`
  - renders a horizontal Gantt-style timeline grouped by optional `groupBy` field
  - each record becomes a bar placed by `startDateFieldId`; end position from `endDateFieldId` (falls back to start date)
  - date range auto-calculated from records (month boundaries); defaults to current month when no records
  - column width: 96 px per day; row height: 88 px
  - groups: when `groupBy` is set and returns > 1 group, each group is a collapsible section capped at `groupHeight` px (default 300, clamp 180-900) with independent horizontal scroll
  - today line: vertical blue indicator rendered when today falls within the date range
  - weekday highlighting: configurable per-weekday diagonal-stripe overlay via `highlightedWeekdays` (defaults to Sunday=0, Tuesday=2)
  - assignee avatars: shown on each bar when `assigneeFieldId` resolves to a `person` field
  - dash color: colored stripe at top of each bar driven by `colorFieldId` (select/multi_select option color)
  - empty states: no date fields, no start field configured, no records with start date
  - scrolls all groups horizontally in sync (via `useRef` map of pane elements)
  - auto-scrolls to today on mount
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
- `timeline?: ViewTimelineConfig`
  - `startDateFieldId?: string` — required to render bars; without it an empty state is shown
  - `endDateFieldId?: string` — bar width end; falls back to start date when omitted
  - `groupHeight?: number` — max px height per group section (clamped 180–900, default 300); only applied when > 1 group
  - `assigneeFieldId?: string` — resolves a `person` field; shows avatar stack on bars
  - `colorFieldId?: string` — resolves a `select` or `multi_select` field; maps option color to bar dash stripe
  - `highlightedWeekdays?: number[]` — 0–6 (Sun–Sat) days to stripe-highlight; defaults to `[0, 2]` (Sun, Tue)

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
   - `apps/web/src/pages/DynamicField/views/components/EditViewDialog.tsx`
   - `apps/web/src/pages/DynamicField/views/kanban/KanbanView.tsx`
   - `apps/web/src/pages/DynamicField/views/calendar/CalendarView.tsx`
   - `apps/web/src/pages/DynamicField/views/timeline/TimelineView.tsx`
5. If schema changes: add Prisma migration under `packages/database/prisma/migrations/`.

### Calendar-specific notes
- Edit View dialog shows calendar settings (start/end date selectors, mode) only when `view.type === 'calendar'`.
- "Fields shown on cards" section is hidden for calendar views (only relevant for kanban/timeline).
- `ViewCalendarConfig` is defined in `apps/web/src/pages/DynamicField/types.ts`.
- `DynamicFieldPage.tsx` passes `onAddRecord` (returns created record), `onSetValue`, and `onUpdateView` to `CalendarView`.

### Timeline-specific notes
- Edit View dialog shows timeline settings only when `view.type === 'timeline'`:
  - Start date field, End date field, Max group height, Assignee field, Dash color field, Highlight weekdays.
- "Fields shown on cards" section is shown for timeline (same as kanban); respects `view.config.hiddenFieldIds`.
- Edit View dialog uses a scrollable body (`ScrollArea`) with a fixed header and footer; necessary because timeline settings are long.
- `ViewTimelineConfig` is defined in `apps/web/src/pages/DynamicField/types.ts`.
- `DynamicFieldPage.tsx` passes only `fields, records, loading, view` to `TimelineView` (no add-record or set-value callbacks).
- `EditViewDialog` is extracted to `apps/web/src/pages/DynamicField/views/components/EditViewDialog.tsx`.

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
