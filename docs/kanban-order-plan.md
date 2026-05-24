# Kanban Drag-and-Drop Ordering Plan (DynRecord.order)

## Goal
Enable card reordering in Kanban view so that:
- Dragging within a column updates card order.
- Dragging to another column updates the group field and card order.
- New order is computed using midpoint float ranking between neighbor cards.

## Chosen Data Model
Use a single global order field on the record itself.

Important:
- `order` must be `Float` (not `Int`) to support midpoint ranking.

### Schema change
- Add `order Float` to `DynRecord`.
- Add index for efficient sorting:
  - `@@index([databaseId, order])`

Notes:
- This keeps implementation simple and avoids a new table.
- Order is global per database (not per view).

## Part 1: Backend Implementation Plan

### 1) Add a move endpoint for Kanban
Create a dedicated endpoint to move a record in Kanban with one server-side transaction.

Suggested shape:
- Route: `POST /api/records/:recordId/move-kanban`
- Body:
  - `databaseId: string`
  - `viewId: string`
  - `groupFieldId: string`
  - `toGroupKey: string`
  - `beforeRecordId?: string | null`
  - `afterRecordId?: string | null`

Server responsibilities:
- Validate record, view, and group field belong to the database.
- Update group field value for cross-column moves.
- Compute new `order` using neighbor records in destination column.
- Persist changes atomically.

### 2) Midpoint ranking algorithm
Use float midpoint strategy.

Given neighbors in destination column:
- If both neighbors exist:
  - `newOrder = (prevOrder + nextOrder) / 2`
- If only `prev` exists (insert at end):
  - `newOrder = prevOrder + STEP`
- If only `next` exists (insert at start):
  - `newOrder = nextOrder - STEP`
- If neither exists (first card in column):
  - `newOrder = 0`

Constants:
- `STEP = 1024`
- `MIN_GAP = 1e-6`

### 3) Rebalance when gap is too small
If `nextOrder - prevOrder < MIN_GAP`, rebalance destination column:
- Sort current column cards by `order` (and stable tiebreaker by `id`).
- Reassign orders as `0, 1024, 2048, ...`.
- Recompute midpoint and apply final move.

### 4) Read path updates for Kanban
Update Kanban paging query to sort records by:
1. `order ASC`
2. stable tie-breaker (`id ASC` or existing filtered id order)

This ensures card positions remain stable after refresh.

### 5) Record creation default order
When creating a new record, initialize `order` near the end of the database sequence:
- `max(order) + STEP`
- If no records, use `0`

This avoids null/undefined ordering.

How this is done (server flow):
1. Query the current max order for the same `databaseId`.
2. Compute:
  - if max exists: `newOrder = maxOrder + STEP`
  - if empty database: `newOrder = 0`
3. Create the record with both:
  - next `rowNumber`
  - computed `order`

Prisma example to get max order in the current database:

```ts
const maxOrderAgg = await prisma.dynRecord.aggregate({
  where: {
    databaseId,
    archivedAt: null,
  },
  _max: { order: true },
});

const maxOrder = maxOrderAgg._max.order;
const STEP = 1024;
const newOrder = maxOrder == null ? 0 : Number(maxOrder) + STEP;
```

Then use `newOrder` when creating the record.

Reference constants:
- `STEP = 1024`

Example sequence:
- Existing max order = `3072` -> new record gets `4096`
- Existing max order = `4096` -> next gets `5120`
- No records yet -> first record gets `0`

Why append on create:
- New records naturally appear at the end of the current ordered sequence.
- We avoid expensive reshuffling during normal inserts.
- Midpoint logic is still used only for drag-and-drop repositioning.

## Part 2: Frontend Implementation Plan

### 1) Add drag-and-drop in Kanban
In Kanban UI:
- Add card drag source metadata: `recordId`, `fromGroupKey`, `fromIndex`.
- Resolve drop target metadata: `toGroupKey`, `toIndex`.
- Derive `beforeRecordId` and `afterRecordId` from destination list.

### 1.1) Simple no-library drag-and-drop (required UX)
Implement drag-and-drop manually with native pointer/mouse events. Do not add any DnD package.

Behavior rules:
- Hold a card and drag it.
- Dragged card becomes faded while dragging.
- While hovering another card, preview position is always before target card.
- Show a horizontal 3px bar above the target card.

Minimal event model:
- `pointerdown` on card handle/card starts drag state.
- `pointermove` tracks pointer and determines current target card.
- `pointerup` commits drop.
- `pointercancel` or invalid drop resets drag state.

State needed in Kanban view:
- `dragState`: `{ recordId, fromGroupKey, fromIndex } | null`
- `hoverState`: `{ toGroupKey, targetRecordId } | null`
- `pendingMove`: `{ recordId, requestId } | null` (for optimistic request tracking)

Preview rules:
- If hovering card `X`, insertion index is index of `X` (before `X`).
- If hovering empty column body, insertion index is `0`.
- If hovering below all cards in a column, insertion index is end of list.

### 1.2) Frontend file split (easy-to-read structure)
Create focused files so each file has one responsibility.

Proposed files/components for this implementation:
- `apps/web/src/pages/DynamicField/views/kanban/KanbanDragProvider.tsx`
  - Owns drag state, hover state, pending optimistic requests, and rollback snapshots.
- `apps/web/src/pages/DynamicField/views/kanban/KanbanCardDraggable.tsx`
  - Wraps existing card and handles `pointerdown` start + dragged visual state (faded).
- `apps/web/src/pages/DynamicField/views/kanban/KanbanDropIndicator.tsx`
  - Renders the 3px horizontal preview bar above current target card.
- `apps/web/src/pages/DynamicField/views/kanban/kanban-dnd.types.ts`
  - Shared types for drag state, hover state, move payload, and rollback snapshot.
- `apps/web/src/pages/DynamicField/views/kanban/kanban-dnd.utils.ts`
  - Pure helper functions:
    - find target from pointer position
    - compute insert-before index
    - derive `beforeRecordId` / `afterRecordId`
    - apply optimistic move / rollback move
- `apps/web/src/pages/DynamicField/views/kanban/kanban-move.api.ts`
  - Small API adapter for move endpoint request payload.

Files to update (integration points):
- `apps/web/src/pages/DynamicField/views/kanban/KanbanView.tsx`
  - Connect provider, handle drop commit flow, trigger optimistic reorder and backend request.
- `apps/web/src/pages/DynamicField/views/kanban/KanbanColumn.tsx`
  - Render drop targets, wire hover detection, render preview indicator.
- `apps/web/src/pages/DynamicField/views/kanban/KanbanCard.tsx`
  - Use draggable wrapper and faded style while dragging.
- `apps/web/src/pages/DynamicField/api.ts`
  - Add move-record API function.

### 2) Call move endpoint on drop
On successful drop:
- Call move API with neighbor IDs and destination group.
- Optimistically update local list immediately for smooth UX.
- Roll back optimistic state if API fails.

### 2.1) Realtime optimistic update-first flow (required)
Drop flow must be frontend-first and backend-simultaneous in effect:
1. On drop, compute destination insertion point from `hoverState`.
2. Immediately apply reorder in client state (same-column reorder or cross-column move).
3. In the same drop handler, call backend move endpoint with:
  - moved record id
  - destination group key
  - `beforeRecordId` and `afterRecordId`
4. If backend succeeds:
  - keep current client state unchanged.
5. If backend fails:
  - show error message.
  - rollback to pre-drop snapshot.

Rollback contract:
- Capture a snapshot of affected columns before optimistic mutation.
- Restore snapshot only if the request that failed is the latest request for that record.
- Ignore stale failures from older requests.

### 3) Keep pagination behavior
Do not change current per-column pagination design.
Only ensure merged column list is displayed using order returned from backend.

### 4) Drag-and-drop UI details

### Visual classes/states
- Dragged card:
  - `opacity: 0.45`
  - optional `cursor: grabbing`
- Hover target card:
  - render a top-aligned bar: `height: 3px`
  - full width of card content area
  - visually distinct color (existing primary token)

### Target hit testing
- Use element refs per card for geometry lookup (`getBoundingClientRect`).
- Determine nearest card in hovered column from pointer Y.
- Always map to insert-before-target behavior.

### Simplicity constraints
- No drag ghost clone required.
- No animated reflow requirement for first version.
- No keyboard DnD in first version.

### 5) Code readability rules for frontend implementation
- Keep UI components free of backend payload shaping.
- Keep API payload shaping in one file (`kanban-move.api.ts`).
- Keep pointer math and reorder logic in utility file (`kanban-dnd.utils.ts`) with pure functions.
- Keep provider small and event-focused; avoid mixing rendering logic and move math.

## Scope

### In scope
- Kanban drag within same column.
- Kanban drag across columns (group field update + order update).
- Midpoint float ordering with periodic rebalance.

### Out of scope (for first pass)
- Per-view order model (this plan intentionally uses global `DynRecord.order`).
- Multi-record bulk move.
- Real-time conflict resolution beyond last-write-wins.

## Risks and Trade-offs
- Global order on `DynRecord` means ordering is shared across views using these records.
- Concurrent moves may produce close values quickly; rebalance mitigates this.
- If non-Kanban features later rely on `order`, behavior expectations should be documented.

## Implementation Steps
1. Add `order` field and index in Prisma schema.
2. Run migration and regenerate client.
3. Add backend move service + API route.
4. Update Kanban query sorting to use `order`.
5. Add frontend drag-and-drop and API integration.
6. Add tests for midpoint, boundary inserts, cross-group move, and rebalance.

## Validation Checklist
- Move inside same column preserves exact drop position.
- Move to another column updates group field correctly.
- Refresh keeps the same visual order.
- Insert at top and bottom works.
- Empty-column drop works.
- Dense-order scenario triggers rebalance and still places correctly.
