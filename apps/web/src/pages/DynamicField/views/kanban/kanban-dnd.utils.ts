import type { DynRecord, Field, ViewGroupByConfig } from '../../types';

const ORDER_STEP = 1024;

function getDateValueForColumnKey(
  columnKey: string,
  granularity: NonNullable<ViewGroupByConfig['granularity']> | undefined,
): string | null {
  if (columnKey === '__none__') return null;

  if (granularity === 'month') {
    if (!/^\d{4}-\d{2}$/.test(columnKey)) return null;
    return `${columnKey}-01`;
  }

  if (granularity === 'quarter') {
    const match = columnKey.match(/^(\d{4})-Q([1-4])$/);
    if (!match) return null;
    const year = match[1];
    const quarter = Number.parseInt(match[2], 10);
    const month = String((quarter - 1) * 3 + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(columnKey)) return columnKey;
  return null;
}

function upsertFieldValue(record: DynRecord, field: Field, patch: Partial<DynRecord['fieldValues'][number]>): DynRecord {
  const idx = record.fieldValues.findIndex(v => v.fieldId === field.id);
  if (idx === -1) {
    return {
      ...record,
      fieldValues: [
        ...record.fieldValues,
        {
          id: `optimistic-${record.id}-${field.id}`,
          fieldId: field.id,
          recordId: record.id,
          field,
          ...patch,
        },
      ],
    };
  }

  const next = [...record.fieldValues];
  next[idx] = { ...next[idx], ...patch };
  return { ...record, fieldValues: next };
}

export function applyGroupValueToRecord(
  record: DynRecord,
  groupField: Field,
  toGroupKey: string,
  granularity: NonNullable<ViewGroupByConfig['granularity']> | undefined,
): DynRecord {
  if (groupField.type === 'select') {
    return upsertFieldValue(record, groupField, { selectValue: toGroupKey === '__none__' ? null : toGroupKey });
  }

  if (groupField.type === 'multi_select') {
    return upsertFieldValue(record, groupField, { multiSelectValue: toGroupKey === '__none__' ? [] : [toGroupKey] });
  }

  if (groupField.type === 'date') {
    return upsertFieldValue(record, groupField, { dateValue: getDateValueForColumnKey(toGroupKey, granularity) });
  }

  return record;
}

export function computeOrderBetween(prevOrder?: number, nextOrder?: number): number {
  if (typeof prevOrder === 'number' && typeof nextOrder === 'number') {
    return (prevOrder + nextOrder) / 2;
  }
  if (typeof prevOrder === 'number') {
    return prevOrder + ORDER_STEP;
  }
  if (typeof nextOrder === 'number') {
    return nextOrder - ORDER_STEP;
  }
  return 0;
}

export function resolveKanbanDropTarget(container: HTMLElement, clientY: number, draggedRecordId?: string | null): string | null {
  const items = Array.from(container.querySelectorAll<HTMLElement>('[data-kanban-record-id]'));
  for (const item of items) {
    const recordId = item.dataset.kanbanRecordId;
    if (!recordId || recordId === draggedRecordId) continue;

    const rect = item.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    if (clientY < midpoint) {
      return recordId;
    }
  }

  return null;
}
