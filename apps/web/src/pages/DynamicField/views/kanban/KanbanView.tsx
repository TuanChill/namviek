import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { KanbanColumn } from './KanbanColumn';
import type { KanbanColumnData } from './KanbanColumn';
import type { DynRecord, DynView, Field, FieldValuePayload } from '../../types';

interface KanbanViewProps {
  fields: Field[];
  records: DynRecord[];
  loading: boolean;
  view: DynView;
  onSetValue: (record: DynRecord, field: Field, payload: FieldValuePayload) => void;
  onAddRecord: () => void;
}

function getRecordGroupKey(record: DynRecord, field: Field): string {
  const fv = record.fieldValues.find(v => v.fieldId === field.id);
  if (!fv) return '__none__';
  if (field.type === 'select') return fv.selectValue ?? '__none__';
  if (field.type === 'multi_select') return fv.multiSelectValue?.[0] ?? '__none__';
  if (field.type === 'date' || field.type === 'created_time' || field.type === 'updated_time') {
    const dateStr = fv.dateValue ?? (field.type === 'created_time' ? record.createdAt : field.type === 'updated_time' ? record.updatedAt : null);
    return dateStr ? dateStr.slice(0, 10) : '__none__';
  }
  return '__none__';
}

function buildColumns(records: DynRecord[], groupField: Field): KanbanColumnData[] {
  const columns: Map<string, KanbanColumnData> = new Map();

  if (groupField.type === 'select' || groupField.type === 'multi_select') {
    // Build ordered columns from field options (No value goes last)
    for (const opt of groupField.options ?? []) {
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
    // Date grouping by day (No date goes last)
    for (const record of records) {
      const key = getRecordGroupKey(record, groupField);
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

  return Array.from(columns.values());
}

export function KanbanView({ fields, records, loading, view, onSetValue, onAddRecord }: KanbanViewProps) {
  const groupByConfig = (view.config as any)?.groupBy;
  const groupField = useMemo(() => {
    if (!groupByConfig?.fieldId) {
      // Default to first select/multi_select field
      return fields.find(f => f.type === 'select' || f.type === 'multi_select') ?? null;
    }
    return fields.find(f => f.id === groupByConfig.fieldId) ?? null;
  }, [fields, groupByConfig]);

  const columns = useMemo(() => {
    if (!groupField) return [];
    return buildColumns(records, groupField);
  }, [records, groupField]);

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
      {columns.map(col => (
        <KanbanColumn
          key={col.key}
          col={col}
          fields={fields}
          view={view}
          onSetValue={onSetValue}
          onAddRecord={onAddRecord}
        />
      ))}
    </div>
  );
}
