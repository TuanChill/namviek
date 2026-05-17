# Dynamic Field Filter Builder Reference

Purpose: document how the Dynamic Field filter builder is modeled, rendered, and evaluated so future changes are safe and fast.

## 1) Where It Lives

- UI container: `apps/web/src/pages/DynamicField/views/filter/FilterBuilder.tsx`
- Group UI: `apps/web/src/pages/DynamicField/views/filter/FilterGroupBlock.tsx`
- Rule row UI: `apps/web/src/pages/DynamicField/views/filter/FilterRuleRow.tsx`
- Value controls: `apps/web/src/pages/DynamicField/views/filter/ValueInput.tsx`
- Types/AST: `apps/web/src/pages/DynamicField/views/filter/types.ts`
- Operator config: `apps/web/src/pages/DynamicField/views/filter/constants.ts`
- Tree helpers: `apps/web/src/pages/DynamicField/views/filter/utils.ts`
- Runtime evaluator: `apps/web/src/pages/DynamicField/views/filter/apply.ts`
- Integration point: `apps/web/src/pages/DynamicFieldPage.tsx` via `applyFilter(records, fields, activeView?.config?.filter)`

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

The full tree is persisted in `DynView.config.filter`.

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

## 5) Runtime Evaluation

`applyFilter` is pure and synchronous.

- Returns original records for null/empty filter
- Builds `fieldMap` once, then evaluates each record recursively
- `AND` group: all children must pass
- `OR` group: at least one child must pass

Type-specific evaluators:

- Text-like: case-insensitive string compare/contains
- Number: numeric comparisons (`eq`, `gt`, `lte`, etc.)
- Select/multi-select/person: membership checks
- Checkbox: boolean compare on `is`
- File: empty/not-empty based on attachment array length
- Date-like: parsed ISO date + range resolution

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
4. Implement evaluator logic in `apply.ts` for affected field types.
5. Verify value UI behavior in `ValueInput.tsx`.

When adding a new filterable field type:

1. Add field type config in `FIELD_OPERATOR_CONFIG`.
2. Ensure `apply.ts` can evaluate that field type.
3. Confirm value payload shape in rule `value` is consistent.

## 8) Quick Testing Scenarios

- Date `is_before` and `is_after` around same boundary date.
- Relative date modes (today/current week/current month).
- Nested group logic: `(A AND B) OR C`.
- Empty checks for text, multi-select, person, and file fields.
- Field switch in a rule resets operator/value appropriately.
