/**
 * Pure, side-effect-free function that applies a ViewFilter AST to a list of records.
 * No API calls. Import and call wherever filtered records are needed.
 */

import {
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  addDays, subDays,
  addWeeks, subWeeks,
  addMonths, subMonths,
  parseISO, isValid,
  isBefore, isAfter,
} from 'date-fns';
import type { DynRecord, Field } from '../../types';
import type { FilterGroup, FilterRule, ViewFilter, RelativeDateMode, DateMode } from './types';
import type { FilterOperator } from './types';

// ─── Public API ───────────────────────────────────────────────────────────────

export function applyFilter(
  records: DynRecord[],
  fields: Field[],
  filter: ViewFilter | null | undefined,
): DynRecord[] {
  if (!filter || filter.children.length === 0) return records;
  const fieldMap = new Map(fields.map(f => [f.id, f]));
  return records.filter(r => evaluateGroup(filter, r, fieldMap));
}

// ─── Tree evaluation ──────────────────────────────────────────────────────────

function evaluateGroup(
  group: FilterGroup,
  record: DynRecord,
  fieldMap: Map<string, Field>,
): boolean {
  if (group.children.length === 0) return true;

  const results = group.children.map(child =>
    child.type === 'rule'
      ? evaluateRule(child, record, fieldMap)
      : evaluateGroup(child, record, fieldMap),
  );

  return group.conjunction === 'AND'
    ? results.every(Boolean)
    : results.some(Boolean);
}

function evaluateRule(
  rule: FilterRule,
  record: DynRecord,
  fieldMap: Map<string, Field>,
): boolean {
  const field = fieldMap.get(rule.fieldId);
  if (!field) return true; // unknown field — don't filter out

  const fv = record.fieldValues.find(v => v.fieldId === rule.fieldId);

  switch (field.type) {
    case 'text':
    case 'url':
    case 'email':
      return evalText(rule.operator, fv?.textValue ?? null, String(rule.value ?? ''));

    case 'number':
      return evalNumber(rule.operator, fv?.numberValue != null ? Number(fv.numberValue) : null, rule.value);

    case 'select':
      return evalSelect(rule.operator, fv?.selectValue ?? null, rule.value);

    case 'multi_select':
      return evalMultiSelect(rule.operator, fv?.multiSelectValue ?? [], rule.value);

    case 'checkbox':
      return evalCheckbox(rule.operator, fv?.boolValue ?? null, rule.value);

    case 'person':
      return evalPerson(rule.operator, fv?.personValue ?? [], rule.value);

    case 'file': {
      const files = (fv?.jsonValue as unknown[]) ?? [];
      return evalEmpty(rule.operator, files.length > 0);
    }

    case 'date':
    case 'created_time':
    case 'updated_time': {
      const raw = fv?.dateValue ?? fv?.textValue ?? null;
      return evalDate(rule.operator, raw, rule.dateMode, rule.value);
    }

    default:
      return true;
  }
}

// ─── Type-specific evaluators ─────────────────────────────────────────────────

function evalText(op: FilterOperator, cellValue: string | null, filterValue: string): boolean {
  const cell = (cellValue ?? '').toLowerCase();
  const fv = filterValue.toLowerCase();
  switch (op) {
    case 'is':               return cell === fv;
    case 'is_not':           return cell !== fv;
    case 'contains':         return cell.includes(fv);
    case 'does_not_contain': return !cell.includes(fv);
    case 'is_empty':         return cell === '';
    case 'is_not_empty':     return cell !== '';
    default: return true;
  }
}

function evalNumber(op: FilterOperator, cellValue: number | null, filterValue: unknown): boolean {
  if (op === 'is_empty')     return cellValue === null;
  if (op === 'is_not_empty') return cellValue !== null;

  const fv = Number(filterValue);
  if (cellValue === null || Number.isNaN(fv)) return false;

  switch (op) {
    case 'eq':  return cellValue === fv;
    case 'neq': return cellValue !== fv;
    case 'gt':  return cellValue > fv;
    case 'lt':  return cellValue < fv;
    case 'gte': return cellValue >= fv;
    case 'lte': return cellValue <= fv;
    default: return true;
  }
}

function evalSelect(op: FilterOperator, cellValue: string | null, filterValue: unknown): boolean {
  switch (op) {
    case 'is':           return cellValue === String(filterValue ?? '');
    case 'is_not':       return cellValue !== String(filterValue ?? '');
    case 'is_empty':     return !cellValue;
    case 'is_not_empty': return !!cellValue;
    default: return true;
  }
}

function evalMultiSelect(op: FilterOperator, cellValues: string[], filterValue: unknown): boolean {
  const fv = Array.isArray(filterValue) ? (filterValue as string[]) : [];
  switch (op) {
    case 'contains':         return fv.every(v => cellValues.includes(v));
    case 'does_not_contain': return !fv.some(v => cellValues.includes(v));
    case 'is_empty':         return cellValues.length === 0;
    case 'is_not_empty':     return cellValues.length > 0;
    default: return true;
  }
}

function evalCheckbox(op: FilterOperator, cellValue: boolean | null, filterValue: unknown): boolean {
  const expected = filterValue === true || filterValue === 'true';
  if (op === 'is') return (cellValue ?? false) === expected;
  return true;
}

function evalPerson(op: FilterOperator, cellValues: string[], filterValue: unknown): boolean {
  const fv = Array.isArray(filterValue) ? (filterValue as string[]) : [];
  switch (op) {
    case 'contains':         return fv.every(v => cellValues.includes(v));
    case 'does_not_contain': return !fv.some(v => cellValues.includes(v));
    case 'is_empty':         return cellValues.length === 0;
    case 'is_not_empty':     return cellValues.length > 0;
    default: return true;
  }
}

function evalEmpty(op: FilterOperator, hasValue: boolean): boolean {
  if (op === 'is_empty')     return !hasValue;
  if (op === 'is_not_empty') return hasValue;
  return true;
}

function evalDate(
  op: FilterOperator,
  rawValue: string | null,
  dateMode: DateMode | undefined,
  filterValue: unknown,
): boolean {
  if (op === 'is_empty')     return !rawValue;
  if (op === 'is_not_empty') return !!rawValue;

  const cellDate = rawValue ? parseISO(rawValue) : null;
  if (!cellDate || !isValid(cellDate)) return false;

  const { start: rangeStart, end: rangeEnd } = resolveDateRange(dateMode, filterValue);
  if (!rangeStart) return false;

  const effectiveEnd = rangeEnd ?? rangeStart;

  switch (op) {
    case 'is':
      return !isBefore(cellDate, startOfDay(rangeStart)) && !isAfter(cellDate, endOfDay(effectiveEnd));
    case 'is_before':
      return isBefore(cellDate, startOfDay(rangeStart));
    case 'is_after':
      return isAfter(cellDate, endOfDay(effectiveEnd));
    case 'is_on_or_before':
      return !isAfter(cellDate, endOfDay(effectiveEnd));
    case 'is_on_or_after':
      return !isBefore(cellDate, startOfDay(rangeStart));
    default: return true;
  }
}

// ─── Date range resolver ──────────────────────────────────────────────────────

function resolveDateRange(
  dateMode: DateMode | undefined,
  filterValue: unknown,
): { start: Date | null; end: Date | null } {
  const now = new Date();

  switch (dateMode as DateMode | undefined) {
    case 'today':         return { start: startOfDay(now),          end: endOfDay(now) };
    case 'yesterday':     return { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) };
    case 'tomorrow':      return { start: startOfDay(addDays(now, 1)), end: endOfDay(addDays(now, 1)) };
    case 'current_week':  return { start: startOfWeek(now),         end: endOfWeek(now) };
    case 'last_week':     return { start: startOfWeek(subWeeks(now, 1)), end: endOfWeek(subWeeks(now, 1)) };
    case 'next_week':     return { start: startOfWeek(addWeeks(now, 1)), end: endOfWeek(addWeeks(now, 1)) };
    case 'current_month': return { start: startOfMonth(now),        end: endOfMonth(now) };
    case 'last_month':    return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
    case 'next_month':    return { start: startOfMonth(addMonths(now, 1)), end: endOfMonth(addMonths(now, 1)) };

    case 'exact_date': {
      const d = filterValue ? parseISO(String(filterValue)) : null;
      if (!d || !isValid(d)) return { start: null, end: null };
      return { start: d, end: d };
    }

    case 'custom_range': {
      const range = filterValue as { from?: string; to?: string } | null;
      const from = range?.from ? parseISO(range.from) : null;
      const to   = range?.to   ? parseISO(range.to)   : null;
      return {
        start: from && isValid(from) ? from : null,
        end:   to   && isValid(to)   ? to   : null,
      };
    }

    default: {
      // Fallback: treat filterValue as a raw ISO date string
      const d = filterValue ? parseISO(String(filterValue)) : null;
      if (!d || !isValid(d)) return { start: null, end: null };
      return { start: d, end: d };
    }
  }
}
