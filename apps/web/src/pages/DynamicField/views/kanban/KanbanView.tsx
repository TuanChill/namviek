import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type DragEvent, type SetStateAction } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../api';
import { moveKanbanRecord } from './kanban-move.api';
import { KanbanColumn } from './KanbanColumn';
import type { KanbanColumnData } from './KanbanColumn';
import type { DynRecord, DynView, Field, FieldValuePayload, ViewGroupByConfig } from '../../types';
import type { KanbanDragState, KanbanHoverState, KanbanMoveOutcome } from './kanban-dnd.types';
import { applyGroupValueToRecord, computeOrderBetween } from './kanban-dnd.utils';

const KANBAN_PAGE_SIZE = 100;

interface KanbanViewProps {
  databaseId: string;
  fields: Field[];
  records: DynRecord[];
  loading: boolean;
  view: DynView;
  onSetRecords: Dispatch<SetStateAction<DynRecord[]>>;
  onHydrateRecords: (records: DynRecord[]) => void;
  onSetValue: (record: DynRecord, field: Field, payload: FieldValuePayload) => void;
  onAddRecord: (initialValues?: Array<{ field: Field; payload: FieldValuePayload }>) => void;
  groupCounts?: Record<string, number>;
}

interface ColumnPagingState {
  recordIds: string[];
  cursor: string | null;
  hasMore: boolean;
  loading: boolean;
  initialized: boolean;
}

function getDateValueForColumn(
  columnKey: string,
  granularity: NonNullable<ViewGroupByConfig['granularity']> | undefined,
): string | null {
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

  if (/^\d{4}-\d{2}-\d{2}$/.test(columnKey)) {
    return columnKey;
  }

  return null;
}

function getInitialValuesForColumn(
  groupField: Field,
  columnKey: string,
  granularity: NonNullable<ViewGroupByConfig['granularity']> | undefined,
): Array<{ field: Field; payload: FieldValuePayload }> {
  if (columnKey === '__none__') {
    return [];
  }

  if (groupField.type === 'select') {
    return [{ field: groupField, payload: { selectValue: columnKey } }];
  }

  if (groupField.type === 'multi_select') {
    return [{ field: groupField, payload: { multiSelectValue: [columnKey] } }];
  }

  if (groupField.type === 'date') {
    const dateValue = getDateValueForColumn(columnKey, granularity);
    if (!dateValue) return [];
    return [{ field: groupField, payload: { dateValue } }];
  }

  return [];
}

function getDateGroupKey(
  dateStr: string,
  granularity: NonNullable<ViewGroupByConfig['granularity']> | undefined,
): string {
  const year = dateStr.slice(0, 4);
  const month = dateStr.slice(5, 7);

  if (granularity === 'month') {
    return `${year}-${month}`;
  }

  if (granularity === 'quarter') {
    const monthNum = Number.parseInt(month, 10);
    if (Number.isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return dateStr.slice(0, 10);
    }
    const quarter = Math.floor((monthNum - 1) / 3) + 1;
    return `${year}-Q${quarter}`;
  }

  return dateStr.slice(0, 10);
}

function getRecordGroupKey(
  record: DynRecord,
  field: Field,
  granularity: NonNullable<ViewGroupByConfig['granularity']> | undefined,
): string {
  const fv = record.fieldValues.find(v => v.fieldId === field.id);
  if (!fv) return '__none__';
  if (field.type === 'select') return fv.selectValue ?? '__none__';
  if (field.type === 'multi_select') return fv.multiSelectValue?.[0] ?? '__none__';
  if (field.type === 'date' || field.type === 'created_time' || field.type === 'updated_time') {
    const dateStr = fv.dateValue ?? (field.type === 'created_time' ? record.createdAt : field.type === 'updated_time' ? record.updatedAt : null);
    return dateStr ? getDateGroupKey(dateStr, granularity) : '__none__';
  }
  return '__none__';
}

function buildColumns(
  records: DynRecord[],
  groupField: Field,
  granularity: NonNullable<ViewGroupByConfig['granularity']> | undefined,
): KanbanColumnData[] {
  const columns: Map<string, KanbanColumnData> = new Map();

  if (groupField.type === 'select' || groupField.type === 'multi_select') {
    // Build ordered columns from field options (No value goes last)
    const orderedOptions = [...(groupField.options ?? [])].sort((a, b) => {
      const aPos = Number.isFinite(a.position) ? a.position : Number.MAX_SAFE_INTEGER;
      const bPos = Number.isFinite(b.position) ? b.position : Number.MAX_SAFE_INTEGER;
      if (aPos !== bPos) return aPos - bPos;

      const labelCompare = a.label.localeCompare(b.label);
      if (labelCompare !== 0) return labelCompare;

      return a.id.localeCompare(b.id);
    });
    for (const opt of orderedOptions) {
      columns.set(opt.id, { key: opt.id, label: opt.label, color: opt.color, records: [] });
    }
    columns.set('__none__', { key: '__none__', label: 'No value', color: null, records: [] });
    for (const record of records) {
      const fv = record.fieldValues.find(v => v.fieldId === groupField.id);
      const key = groupField.type === 'select' ? (fv?.selectValue ?? '__none__') : (fv?.multiSelectValue?.[0] ?? '__none__');
      // key is optionId for select
      if (columns.has(key)) {
        columns.get(key)!.records.push(record);
      } else {
        columns.get('__none__')!.records.push(record);
      }
    }
  } else {
    // Date grouping by selected granularity (No date goes last)
    for (const record of records) {
      const key = getRecordGroupKey(record, groupField, granularity);
      if (key !== '__none__' && !columns.has(key)) {
        columns.set(key, { key, label: key, color: null, records: [] });
      }
      if (key === '__none__') {
        if (!columns.has('__none__')) columns.set('__none__', { key: '__none__', label: 'No date', color: null, records: [] });
      }
      columns.get(key)!.records.push(record);
    }
    // Ensure No date is last
    if (columns.has('__none__')) {
      const noDate = columns.get('__none__')!;
      columns.delete('__none__');
      columns.set('__none__', noDate);
    }
  }

  for (const column of columns.values()) {
    column.records.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.id.localeCompare(b.id);
    });
  }

  return Array.from(columns.values());
}

function buildOptimisticMove(
  records: DynRecord[],
  movedRecordId: string,
  toGroupKey: string,
  targetRecordId: string | null,
  groupField: Field,
  granularity: NonNullable<ViewGroupByConfig['granularity']> | undefined,
): KanbanMoveOutcome | null {
  const movedRecord = records.find(record => record.id === movedRecordId);
  if (!movedRecord) return null;

  const remaining = records.filter(record => record.id !== movedRecordId);
  const destination = remaining
    .filter(record => getRecordGroupKey(record, groupField, granularity) === toGroupKey)
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.id.localeCompare(b.id);
    });

  const targetIndex = targetRecordId
    ? destination.findIndex(record => record.id === targetRecordId)
    : -1;

  const insertIndex = targetIndex >= 0 ? targetIndex : destination.length;

  const beforeRecord = destination[insertIndex] ?? null;
  const afterRecord = insertIndex > 0 ? destination[insertIndex - 1] : null;
  const nextOrder = beforeRecord?.order;
  const prevOrder = afterRecord?.order;

  const withGroup = applyGroupValueToRecord(movedRecord, groupField, toGroupKey, granularity);
  const movedWithOrder: DynRecord = {
    ...withGroup,
    order: computeOrderBetween(prevOrder, nextOrder),
  };

  const nextRecords = [...remaining, movedWithOrder];
  return {
    records: nextRecords,
    beforeRecordId: beforeRecord?.id ?? null,
    afterRecordId: afterRecord?.id ?? null,
  };
}

export function KanbanView({
  databaseId,
  fields,
  records,
  loading,
  view,
  onSetRecords,
  onHydrateRecords,
  onSetValue,
  onAddRecord,
  groupCounts,
}: KanbanViewProps) {
  const [columnPaging, setColumnPaging] = useState<Record<string, ColumnPagingState>>({});
  const [dragState, setDragState] = useState<KanbanDragState | null>(null);
  const [hoverState, setHoverState] = useState<KanbanHoverState | null>(null);
  const columnPagingRef = useRef<Record<string, ColumnPagingState>>({});
  const requestVersionRef = useRef(0);
  const moveRequestRef = useRef(0);
  const rollbackSnapshotRef = useRef<DynRecord[] | null>(null);
  const groupByConfig = view.config?.groupBy;

  useEffect(() => {
    columnPagingRef.current = columnPaging;
  }, [columnPaging]);

  const groupField = useMemo(() => {
    if (!groupByConfig?.fieldId) {
      // Default to first select/multi_select field
      return fields.find(f => f.type === 'select' || f.type === 'multi_select') ?? null;
    }
    return fields.find(f => f.id === groupByConfig.fieldId) ?? null;
  }, [fields, groupByConfig]);

  const columns = useMemo(() => {
    if (!groupField) return [];
    return buildColumns(records, groupField, groupByConfig?.granularity);
  }, [records, groupField, groupByConfig?.granularity]);

  useEffect(() => {
    requestVersionRef.current += 1;
    setColumnPaging({});
    setDragState(null);
    setHoverState(null);
  }, [databaseId, view.id, groupField?.id, groupByConfig?.granularity]);

  useEffect(() => {
    setColumnPaging(prev => {
      const next: Record<string, ColumnPagingState> = {};

      for (const column of columns) {
        const seededIds = column.records.map(record => record.id);
        const existing = prev[column.key];
        next[column.key] = existing
          ? {
              ...existing,
              recordIds: Array.from(new Set([...existing.recordIds, ...seededIds])),
            }
          : {
              recordIds: seededIds,
              cursor: null,
              hasMore: seededIds.length > 0,
              loading: false,
              initialized: false,
            };
      }

      return next;
    });
  }, [columns]);

  const loadColumnPage = useCallback(async (columnKey: string, reset = false) => {
    if (!groupField) {
      return;
    }

    const current = columnPagingRef.current[columnKey];
    if (current?.loading) {
      return;
    }
    if (!reset && (!current?.hasMore || !current.cursor)) {
      return;
    }

    const requestVersion = requestVersionRef.current;

    setColumnPaging(prev => ({
      ...prev,
      [columnKey]: {
        recordIds: reset ? [] : (prev[columnKey]?.recordIds ?? []),
        cursor: reset ? null : (prev[columnKey]?.cursor ?? null),
        hasMore: reset ? true : (prev[columnKey]?.hasMore ?? true),
        loading: true,
        initialized: prev[columnKey]?.initialized ?? false,
      },
    }));

    try {
      const page = await api.records.listKanbanGroupPage(databaseId, {
        viewId: view.id,
        groupFieldId: groupField.id,
        groupKey: columnKey,
        cursor: reset ? null : current?.cursor,
        limit: KANBAN_PAGE_SIZE,
      });

      if (requestVersionRef.current !== requestVersion) {
        return;
      }

      onHydrateRecords(page.items);
      const nextIds = page.items.map(record => record.id);

      setColumnPaging(prev => ({
        ...prev,
        [columnKey]: {
          recordIds: reset
            ? nextIds
            : Array.from(new Set([...(prev[columnKey]?.recordIds ?? []), ...nextIds])),
          cursor: page.nextCursor,
          hasMore: page.hasMore,
          loading: false,
          initialized: true,
        },
      }));
    } catch (error) {
      if (requestVersionRef.current !== requestVersion) {
        return;
      }

      console.error('Failed to load Kanban column page:', error);
      setColumnPaging(prev => ({
        ...prev,
        [columnKey]: {
          recordIds: reset ? [] : (prev[columnKey]?.recordIds ?? []),
          cursor: reset ? null : (prev[columnKey]?.cursor ?? null),
          hasMore: reset ? true : (prev[columnKey]?.hasMore ?? true),
          loading: false,
          initialized: prev[columnKey]?.initialized ?? false,
        },
      }));
    }
  }, [databaseId, groupField, onHydrateRecords, view.id]);

  useEffect(() => {
    if (loading || !groupField) {
      return;
    }

    for (const column of columns) {
      const state = columnPagingRef.current[column.key];
      if (!state || state.initialized || state.loading) {
        continue;
      }

      void loadColumnPage(column.key, true);
    }
  }, [columns, groupField, loadColumnPage, loading]);

  const handleDragStartCard = useCallback((groupKey: string, recordId: string, event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', recordId);
    setDragState({ recordId, fromGroupKey: groupKey });
    setHoverState({ toGroupKey: groupKey, targetRecordId: recordId });
  }, []);

  const handleDragOverCard = useCallback((groupKey: string, recordId: string | null, event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const draggedRecordId = dragState?.recordId || event.dataTransfer.getData('text/plain');
    if (!draggedRecordId) return;
    setHoverState({ toGroupKey: groupKey, targetRecordId: recordId });
  }, [dragState]);

  const handleDragEndCard = useCallback(() => {
    window.setTimeout(() => {
      setDragState(null);
      setHoverState(null);
    }, 0);
  }, []);

  const handleDropCard = useCallback(async (groupKey: string, recordId: string | null, event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const draggedRecordId = dragState?.recordId || event.dataTransfer.getData('text/plain');

    if (!draggedRecordId || !groupField) {
      setHoverState(null);
      return;
    }

    const outcome = buildOptimisticMove(
      records,
      draggedRecordId,
      groupKey,
      recordId,
      groupField,
      groupByConfig?.granularity,
    );

    if (!outcome) {
      setDragState(null);
      setHoverState(null);
      return;
    }

    rollbackSnapshotRef.current = records;
    onSetRecords(outcome.records);

    const requestId = ++moveRequestRef.current;

    setDragState(null);
    setHoverState(null);

    try {
      await moveKanbanRecord(draggedRecordId, {
        databaseId,
        viewId: view.id,
        groupFieldId: groupField.id,
        toGroupKey: groupKey,
        beforeRecordId: outcome.beforeRecordId,
        afterRecordId: outcome.afterRecordId,
      });
    } catch (error) {
      if (moveRequestRef.current !== requestId) {
        return;
      }

      if (rollbackSnapshotRef.current) {
        onSetRecords(rollbackSnapshotRef.current);
      }
      toast.error('Failed to move card. Position has been restored.');
    }
  }, [databaseId, dragState, groupByConfig?.granularity, groupField, onSetRecords, records, view.id]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 size={22} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!groupField) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground p-8">
        <p className="text-sm font-medium">No groupable field available</p>
        <p className="text-xs text-center">Add a <strong>Select</strong> or <strong>Multi-select</strong> field to use Kanban view.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 items-stretch gap-1 overflow-x-auto overflow-y-hidden p-4">
      {columns.map(col => {
        const pagingState = columnPaging[col.key];
        const columnRecords = col.records;

        return (
          <KanbanColumn
            key={col.key}
            col={col}
            fields={fields}
            view={view}
            onSetValue={onSetValue}
            hasMore={pagingState?.hasMore ?? false}
            loadingMore={pagingState?.loading ?? false}
            onLoadMore={(columnKey) => {
              void loadColumnPage(columnKey);
            }}
            totalCount={groupCounts ? (groupCounts[col.key] ?? 0) : columnRecords.length}
            draggingRecordId={dragState?.recordId ?? null}
            hoverState={hoverState}
            onDragStartCard={handleDragStartCard}
            onDragOverCard={handleDragOverCard}
            onDropCard={handleDropCard}
            onDragEndCard={handleDragEndCard}
            onAddRecord={() => {
              const initialValues = getInitialValuesForColumn(groupField, col.key, groupByConfig?.granularity);
              onAddRecord(initialValues);
            }}
          />
        );
      })}
    </div>
  );
}
