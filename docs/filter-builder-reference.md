# Dynamic Field Filter Builder Reference

Purpose: document how the Dynamic Field filter builder is modeled, persisted, and executed so future changes are safe and fast.

Status note:

- The web app still owns filter editing UX.
- Record matching now runs on the backend, not in the browser.

## 1) Where It Lives

- UI container: `apps/web/src/pages/DynamicField/views/filter/FilterBuilder.tsx`
- Group UI: `apps/web/src/pages/DynamicField/views/filter/FilterGroupBlock.tsx`
- Rule row UI: `apps/web/src/pages/DynamicField/views/filter/FilterRuleRow.tsx`
- Value controls: `apps/web/src/pages/DynamicField/views/filter/ValueInput.tsx`
- Types/AST: `apps/web/src/pages/DynamicField/views/filter/types.ts`
- Operator config: `apps/web/src/pages/DynamicField/views/filter/constants.ts`
- Tree helpers: `apps/web/src/pages/DynamicField/views/filter/utils.ts`
- Debounced save trigger: `apps/web/src/pages/DynamicField/views/components/ViewManagerTabBar.tsx`
- Raw SQL filter builder: `packages/database/filter-sql.ts`
- Backend query hook-in: `packages/database/queries.ts` via `getFilteredDynRecords(databaseId, filter)`
- API endpoint: `POST /api/databases/:id/records/filter`
- Runtime fetch integration: `apps/web/src/pages/DynamicFieldPage.tsx` via `api.records.listFiltered(selectedDb.id, activeView?.config?.filter)`

## 2) Data Model (AST)

The filter is a tree with groups and rules.

- Root type: `ViewFilter` (alias of `FilterGroup`)
- Group:
  - `id`
  - `type: 'group'`
  - `conjunction: 'AND' | 'OR'`
  - `children: (FilterRule | FilterGroup)[]`
- Rule:
  - `id`
  - `type: 'rule'`
  - `fieldId`
  - `operator`
  - `dateMode?` (date fields only)
  - `value` (shape depends on field/operator)

The full tree is persisted in `Filter.config` (separate table), linked 1:1 to a view.

Persistence details:

- Database table: `dyn_filters` (Prisma model: `Filter`)
- Relationship: `Filter.viewId` -> `DynView.id` (unique, `ON DELETE CASCADE`)
- API write path (unchanged): `PATCH /api/views/:viewId` with body `{ config: ... }`
- API filter path: `POST /api/databases/:id/records/filter` with body `{ filter }`
- Query write path (split/merge): `updateDatabaseView(viewId, { config })`
- Query filter path: `getFilteredDynRecords(databaseId, filter)`

Important distinction:

- Filter settings live in `Filter.config`
- Other view settings (groupBy, calendar, timeline, card layout) stay in `DynView.config`
- Field-level settings (format, icon, etc.) live in `Field.config`

Delete behavior:

- Deleting a view deletes its filter row automatically via FK cascade.
- Deleting a database deletes views, which also deletes filter rows transitively.

## 3) Operators and Inputs

`constants.ts` is the single source of truth:

- `OPERATOR_LABELS`
- `FIELD_OPERATOR_CONFIG`
- `getOperatorsForFieldType`
- `getDefaultOperator`
- `getValueInputVariant`

Input variants used by the rule value cell:

- `text`
- `number`
- `select`
- `multi_select`
- `checkbox`
- `person`
- `date`
- `none` (for empty/not-empty operators)

## 4) Date Filtering Model

Supported date operators:

- `is`
- `is_before`
- `is_after`
- `is_on_or_before`
- `is_on_or_after`
- `is_empty`
- `is_not_empty`

Date modes:

- Absolute: `exact_date`, `custom_range`
- Relative: `today`, `yesterday`, `tomorrow`, `current_week`, `last_week`, `next_week`, `current_month`, `last_month`, `next_month`

Evaluator behavior in `apply.ts`:

- `is`: value date/range inclusive of start/end day bounds
- `is_before`: strictly before start of selected day/range start
- `is_after`: strictly after end of selected day/range end
- `is_on_or_before`: inclusive upper bound
- `is_on_or_after`: inclusive lower bound

## 5) Backend Filter Process (Raw SQL)

Current flow:

1. User edits the AST in `FilterBuilder.tsx`.
2. The builder updates local UI state immediately.
3. `ViewManagerTabBar.tsx` debounces the save for about 1 second.
4. After the debounce, the web app persists the filter through `PATCH /api/views/:viewId`.
5. The API stores the tree in `Filter.config` through `updateDatabaseView(...)`.
6. `DynamicFieldPage.tsx` requests matching rows from `POST /api/databases/:id/records/filter`.
7. The API calls `getFilteredDynRecords(databaseId, filter)`.
8. `getFilteredDynRecords(...)` loads field metadata and builds SQL using `buildFilteredRecordIdsQuery(...)` in `packages/database/filter-sql.ts`.
9. The backend executes the generated SQL to fetch only matching record IDs.
10. Prisma loads matched records with full `fieldValues + field` include shape.
11. Only matching records are returned to the browser.

Important implications:

- Filter save traffic and record filter traffic are separate calls.
- The debounce is on the view save call, not on the record filter endpoint.
- The browser should not be treated as the source of truth for match logic anymore.
- SQL text and bound params are logged in `getFilteredDynRecords(...)` for debugging.

Raw SQL builder design goals in `packages/database/filter-sql.ts`:

- Keep AST-to-SQL translation readable via small per-type compiler helpers.
- Keep generated SQL safe via positional parameters (`$1`, `$2`, ...).
- Keep runtime record shape stable by using SQL for ID matching, then Prisma for hydration.

Current operator compilation strategy:

- Text-like: `LOWER(...)` comparisons and `LIKE` patterns
- Number: scalar numeric comparisons
- Select: scalar equality/inequality
- Multi-select/person: Postgres array operators (`@>`, `&&`)
- Checkbox: boolean comparison with `COALESCE`
- File: `EXISTS` query with JSON array-length checks
- Date-like: date range bounds from shared `resolveDateRange(...)`

## 6) Important Defaults and UX Rules

- New root filter is empty `AND` group via `makeRootFilter()`.
- New date-like rules initialize `dateMode` to `exact_date`.
- Empty operators (`is_empty`, `is_not_empty`) do not render value input.
- FilterBuilder excludes computed fields from filterable field list:
  - `id`, `created_time`, `created_by`, `updated_time`, `updated_by`

## 7) Safe Extension Checklist

When adding a new operator:

1. Add the operator to `FilterOperator` in `types.ts`.
2. Add label in `OPERATOR_LABELS`.
3. Add operator mapping in `FIELD_OPERATOR_CONFIG` for relevant field types.
4. Implement SQL compiler logic in `packages/database/filter-sql.ts` for affected field types/operators.
5. Verify value UI behavior in `ValueInput.tsx`.

When adding a new filterable field type:

1. Add field type config in `FIELD_OPERATOR_CONFIG`.
2. Ensure `packages/database/filter-sql.ts` can compile that field type.
3. Confirm value payload shape in rule `value` is consistent.

### 7.1) How to Support a New Field in Filter Builder (Step-by-step)

Use this when a new field type should become filterable in the UI and evaluator.

1. Add/update field type definitions.
  - If this is a brand-new product field type, add it to the shared field type source first.
  - Web filter code reads field type from Dynamic Field types.

2. Add operator + input mapping in filter constants.
  - File: `apps/web/src/pages/DynamicField/views/filter/constants.ts`
  - Update `FIELD_OPERATOR_CONFIG` for the new field type.
  - Pick `valueInput` for each operator (`text`, `number`, `select`, `multi_select`, `checkbox`, `person`, `date`, `none`).
  - If needed, add new operator labels to `OPERATOR_LABELS`.

3. Extend filter operator union if you introduced new operators.
  - File: `apps/web/src/pages/DynamicField/views/filter/types.ts`
  - Add operators to `FilterOperator`.

4. Add SQL compiler logic.
  - File: `packages/database/filter-sql.ts`
  - Add or update rule compiler helpers for the field type.
  - Keep SQL parameterized (no inline user values).
  - Keep behavior aligned with empty checks and value shape.

5. Ensure value editor supports the selected `valueInput`.
  - File: `apps/web/src/pages/DynamicField/views/filter/ValueInput.tsx`
  - If existing input variants are enough, no change needed.
  - If not, add a new input variant and renderer.

6. Validate rule initialization/reset behavior.
  - File: `apps/web/src/pages/DynamicField/views/filter/utils.ts`
  - `makeRule` should initialize required defaults (for example date-like `dateMode`).
  - File: `apps/web/src/pages/DynamicField/views/filter/FilterRuleRow.tsx`
  - Ensure field/operator switching resets incompatible value state.

7. Verify persistence and execution contract.
  - Filter tree still persists via `config.filter` API payload.
  - Backend split/merge persists filter into `Filter.config`.
  - Backend record filtering still accepts the same AST via `POST /api/databases/:id/records/filter`.
  - Debug SQL logs show both statement and params for failed/edge cases.

8. Test scenarios for the new field type.
  - Operator semantics: positive + negative cases.
  - Empty/not-empty behavior.
  - Nested group behavior (`AND`/`OR`) with mixed field types.
  - Save/reload consistency and filtered row refresh after the debounced save completes.

## 8) Quick Testing Scenarios

- Date `is_before` and `is_after` around same boundary date.
- Relative date modes (today/current week/current month).
- Nested group logic: `(A AND B) OR C`.
- Empty checks for text, multi-select, person, and file fields.
- Field switch in a rule resets operator/value appropriately.
