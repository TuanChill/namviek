# Kanban Pagination Handoff

## Goal

Make Kanban pagination load more records only for the column the user is currently scrolling.

Spreadsheet pagination can stay global as-is.

## Problem Observed

The current Kanban view uses a shared `loadMore` path from the parent view. That means:

- multiple columns can react to the same load cycle
- scrolling one column can make other columns appear to trigger loading too
- the column footer/loading state is still coupled to the global pagination state

## What We Determined

The right shape is not a single shared loader for all Kanban columns.

Each Kanban column needs:

- its own pagination cursor
- its own `loadMore` function
- its own active/ownership lock while loading
- its own filter/sort context passed from the parent

## Recommended Approach

### 1. Add per-column paging state in the Kanban view layer

Track state by group key:

- `cursor`
- `hasMore`
- `loading`
- `items`

This should live in the Kanban-specific data flow, not in the spreadsheet/shared loader.

### 2. Make each column request its own page

When the scroll threshold is reached for a column, call a loader bound to that column key.

That loader should use:

- the current database id
- the current Kanban filter/sort config
- the column group key
- the column cursor

### 3. Keep loading ownership local to the current column

Only the column that initiated the load should show the loading footer/spinner.

### 4. Preserve existing spreadsheet behavior

Spreadsheet can continue using the existing global `loadMoreRecords` implementation.

## Important Note About Backend Support

The backend paging API currently pages by database/view, but Kanban needs page-by-column behavior.

That means the backend should support a Kanban-specific page request that accepts:

- `viewId`
- `groupFieldId`
- `groupKey`
- `cursor`
- `limit`

This lets the server return only the records for one group while still honoring filter and sort rules.

## Files Involved

- `apps/web/src/pages/DynamicField/views/kanban/KanbanView.tsx`
- `apps/web/src/pages/DynamicField/views/kanban/KanbanColumn.tsx`
- `apps/web/src/pages/DynamicFieldPage.tsx`
- `apps/web/src/pages/DynamicField/hooks/useRecords.ts`
- `apps/web/src/pages/DynamicField/api.ts`
- `apps/api/src/index.ts`
- `packages/database/queries.ts`
- `packages/database/filter-sql.ts`

## Current Status

Already addressed:

- Kanban headers show full group totals instead of loaded-only counts.
- Spreadsheet threshold loading was adjusted earlier.

Still needed for the final Kanban fix:

- remove the shared Kanban loader dependency
- add per-column paging/cursors
- make the backend return paged records for a specific Kanban group

## Suggested Next Step

Implement the Kanban-only backend page endpoint first, then wire the column loader to that endpoint.
