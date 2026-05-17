/**
 * SINGLE SOURCE OF TRUTH for filter operators.
 *
 * To add a new operator:
 *   1. Add its key to FilterOperator in types.ts
 *   2. Add its label in OPERATOR_LABELS below
 *   3. Add it to the relevant field entries in FIELD_OPERATOR_CONFIG below
 *
 * To add support for a new field type:
 *   1. Add an entry to FIELD_OPERATOR_CONFIG below
 *
 * Nothing else needs to change — all components read from these definitions.
 */

import type { FieldType } from '../../types';
import type { FilterOperator } from './types';

// ─── Operator labels ──────────────────────────────────────────────────────────

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  is:                 'is',
  is_not:             'is not',
  contains:           'contains',
  does_not_contain:   'does not contain',
  eq:                 '=',
  neq:                '≠',
  gt:                 '>',
  lt:                 '<',
  gte:                '≥',
  lte:                '≤',
  is_before:          'is before',
  is_after:           'is after',
  is_on_or_before:    'is on or before',
  is_on_or_after:     'is on or after',
  is_empty:           'is empty',
  is_not_empty:       'is not empty',
};

// ─── Value input variants ─────────────────────────────────────────────────────
//
// Determines which input control renders in the value column of a FilterRuleRow.
//
//  'text'         → plain text input
//  'number'       → numeric input
//  'select'       → single option picker (field.options)
//  'multi_select' → multi-pill option picker (field.options)
//  'checkbox'     → Checked / Unchecked select
//  'person'       → user avatar picker
//  'date'         → DateMode selector + optional date picker
//  'none'         → no value input (is_empty / is_not_empty)

export type ValueInputVariant =
  | 'text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'checkbox'
  | 'person'
  | 'date'
  | 'none';

// ─── Field → operator config ──────────────────────────────────────────────────

export interface OperatorConfig {
  operator: FilterOperator;
  valueInput: ValueInputVariant;
}

export type FieldOperatorConfig = OperatorConfig[];

/**
 * For every filterable field type, define the ordered list of operators
 * and the value-input variant each operator uses.
 *
 * ADD A NEW FIELD TYPE HERE to make it filterable.
 */
export const FIELD_OPERATOR_CONFIG: Partial<Record<FieldType, FieldOperatorConfig>> = {
  text: [
    { operator: 'is',               valueInput: 'text' },
    { operator: 'is_not',           valueInput: 'text' },
    { operator: 'contains',         valueInput: 'text' },
    { operator: 'does_not_contain', valueInput: 'text' },
    { operator: 'is_empty',         valueInput: 'none' },
    { operator: 'is_not_empty',     valueInput: 'none' },
  ],

  number: [
    { operator: 'eq',           valueInput: 'number' },
    { operator: 'neq',          valueInput: 'number' },
    { operator: 'gt',           valueInput: 'number' },
    { operator: 'lt',           valueInput: 'number' },
    { operator: 'gte',          valueInput: 'number' },
    { operator: 'lte',          valueInput: 'number' },
    { operator: 'is_empty',     valueInput: 'none' },
    { operator: 'is_not_empty', valueInput: 'none' },
  ],

  select: [
    { operator: 'is',           valueInput: 'select' },
    { operator: 'is_not',       valueInput: 'select' },
    { operator: 'is_empty',     valueInput: 'none' },
    { operator: 'is_not_empty', valueInput: 'none' },
  ],

  multi_select: [
    { operator: 'contains',         valueInput: 'multi_select' },
    { operator: 'does_not_contain', valueInput: 'multi_select' },
    { operator: 'is_empty',         valueInput: 'none' },
    { operator: 'is_not_empty',     valueInput: 'none' },
  ],

  checkbox: [
    { operator: 'is', valueInput: 'checkbox' },
  ],

  person: [
    { operator: 'contains',         valueInput: 'person' },
    { operator: 'does_not_contain', valueInput: 'person' },
    { operator: 'is_empty',         valueInput: 'none' },
    { operator: 'is_not_empty',     valueInput: 'none' },
  ],

  file: [
    { operator: 'is_empty',     valueInput: 'none' },
    { operator: 'is_not_empty', valueInput: 'none' },
  ],

  date: [
    { operator: 'is',              valueInput: 'date' },
    { operator: 'is_before',       valueInput: 'date' },
    { operator: 'is_after',        valueInput: 'date' },
    { operator: 'is_on_or_before', valueInput: 'date' },
    { operator: 'is_on_or_after',  valueInput: 'date' },
    { operator: 'is_empty',        valueInput: 'none' },
    { operator: 'is_not_empty',    valueInput: 'none' },
  ],

  // url / email — same operators as text
  url: [
    { operator: 'is',               valueInput: 'text' },
    { operator: 'is_not',           valueInput: 'text' },
    { operator: 'contains',         valueInput: 'text' },
    { operator: 'does_not_contain', valueInput: 'text' },
    { operator: 'is_empty',         valueInput: 'none' },
    { operator: 'is_not_empty',     valueInput: 'none' },
  ],

  email: [
    { operator: 'is',               valueInput: 'text' },
    { operator: 'is_not',           valueInput: 'text' },
    { operator: 'contains',         valueInput: 'text' },
    { operator: 'does_not_contain', valueInput: 'text' },
    { operator: 'is_empty',         valueInput: 'none' },
    { operator: 'is_not_empty',     valueInput: 'none' },
  ],
};

// ─── Derived helpers (do not edit — computed from FIELD_OPERATOR_CONFIG) ──────

/** Returns the ordered operator list for a given field type, or [] if not filterable. */
export function getOperatorsForFieldType(fieldType: FieldType): OperatorConfig[] {
  return FIELD_OPERATOR_CONFIG[fieldType] ?? [];
}

/** Returns the default (first) operator for a field type. */
export function getDefaultOperator(fieldType: FieldType): FilterOperator {
  return getOperatorsForFieldType(fieldType)[0]?.operator ?? 'is';
}

/** Returns the value-input variant for a specific field + operator combination. */
export function getValueInputVariant(
  fieldType: FieldType,
  operator: FilterOperator,
): ValueInputVariant {
  const config = getOperatorsForFieldType(fieldType);
  return config.find(c => c.operator === operator)?.valueInput ?? 'none';
}

/** Returns true when the operator does not require a value input. */
export function isEmptyCheckOperator(operator: FilterOperator): boolean {
  return operator === 'is_empty' || operator === 'is_not_empty';
}

// ─── Date mode labels ─────────────────────────────────────────────────────────

import type { DateMode } from './types';

/** Set of date modes that resolve dynamically — no picker needed. */
export const RELATIVE_DATE_MODES = new Set<DateMode>([
  'today', 'yesterday', 'tomorrow',
  'current_week', 'last_week', 'next_week',
  'current_month', 'last_month', 'next_month',
]);

/** Ordered list of all DateMode values for the mode selector dropdown. */
export const DATE_MODES_ORDERED: DateMode[] = [
  'exact_date', 'custom_range',
  'today', 'yesterday', 'tomorrow',
  'current_week', 'last_week', 'next_week',
  'current_month', 'last_month', 'next_month',
];

export const DATE_MODE_LABELS: Record<DateMode, string> = {
  exact_date:    'Exact date',
  custom_range:  'Custom range',
  today:         'Today',
  yesterday:     'Yesterday',
  tomorrow:      'Tomorrow',
  current_week:  'Current week',
  last_week:     'Last week',
  next_week:     'Next week',
  current_month: 'Current month',
  last_month:    'Last month',
  next_month:    'Next month',
};
