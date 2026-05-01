import { useMemo } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUsers } from '../../hooks/useUsers';
import type { DynRecord, DynView, Field, FieldValuePayload } from '../../types';

interface KanbanViewProps {
  fields: Field[];
  records: DynRecord[];
  loading: boolean;
  view: DynView;
  onSetValue: (record: DynRecord, field: Field, payload: FieldValuePayload) => void;
  onAddRecord: () => void;
}

interface KanbanColumn {
  key: string;
  label: string;
  color?: string | null;
  records: DynRecord[];
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

function buildColumns(records: DynRecord[], groupField: Field): KanbanColumn[] {
  const columns: Map<string, KanbanColumn> = new Map();

  if (groupField.type === 'select' || groupField.type === 'multi_select') {
    // Build ordered columns from field options
    columns.set('__none__', { key: '__none__', label: 'No value', color: null, records: [] });
    for (const opt of groupField.options ?? []) {
      columns.set(opt.id, { key: opt.id, label: opt.label, color: opt.color, records: [] });
    }
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
    // Date grouping by day
    columns.set('__none__', { key: '__none__', label: 'No date', color: null, records: [] });
    for (const record of records) {
      const key = getRecordGroupKey(record, groupField);
      if (!columns.has(key)) {
        columns.set(key, { key, label: key === '__none__' ? 'No date' : key, color: null, records: [] });
      }
      columns.get(key)!.records.push(record);
    }
  }

  return Array.from(columns.values());
}

export function KanbanView({ fields, records, loading, view, onAddRecord }: KanbanViewProps) {
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
    <div className="flex flex-1 overflow-x-auto gap-4 p-4">
      {columns.map(col => (
        <div
          key={col.key}
          className="flex flex-col gap-2 min-w-[260px] max-w-[260px]"
        >
          {/* Column header */}
          <div className="flex items-center gap-2 px-1">
            {col.color && (
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: col.color }}
              />
            )}
            <span className="text-sm font-semibold truncate flex-1">{col.label}</span>
            <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
              {col.records.length}
            </span>
          </div>

          {/* Cards */}
          <div className="flex flex-col gap-2">
            {col.records.map(record => (
              <KanbanCard key={record.id} record={record} fields={fields} view={view} />
            ))}
          </div>

          {/* Add record */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs text-muted-foreground"
            onClick={onAddRecord}
          >
            <Plus size={13} className="mr-1" /> Add record
          </Button>
        </div>
      ))}
    </div>
  );
}

function KanbanCard({ record, fields, view }: { record: DynRecord; fields: Field[]; view: DynView }) {
  const { users } = useUsers();
  const usersById = useMemo(() => new Map(users.map(user => [user.id, user.name])), [users]);

  const primaryField = fields.find(f => f.isPrimary) ?? fields[0];
  const titleFv = primaryField ? record.fieldValues.find(v => v.fieldId === primaryField.id) : null;
  const title = titleFv?.textValue ?? `Record #${record.rowNumber}`;

  const hiddenIds = new Set<string>((view.config as any)?.hiddenFieldIds ?? []);
  // Show all visible non-primary fields that aren't hidden in this view.
  const previewFields = fields
    .filter(f => !f.isPrimary && f.type !== 'id' && !hiddenIds.has(f.id));

  return (
    <div className="bg-card border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <p className="text-sm font-medium truncate mb-1">{title}</p>
      {previewFields.map(field => {
        const fv = record.fieldValues.find(v => v.fieldId === field.id);
        if (!fv) return null;
        const display = getDisplayValue(fv, field, usersById);
        if (!display) return null;
        return (
          <div key={field.id} className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <span className="font-medium shrink-0">{field.name}:</span>
            <span className="truncate">{display}</span>
          </div>
        );
      })}
    </div>
  );
}

function getDisplayValue(
  fv: DynRecord['fieldValues'][number],
  field: Field,
  usersById: Map<string, string>,
): string {
  if (field.type === 'text' || field.type === 'url' || field.type === 'email') return fv.textValue ?? '';
  if (field.type === 'number') return fv.numberValue ?? '';
  if (field.type === 'checkbox') return fv.boolValue ? '✓' : '';
  if (field.type === 'date') return fv.dateValue ? fv.dateValue.slice(0, 10) : '';
  if (field.type === 'person') {
    return (fv.personValue ?? []).map(id => usersById.get(id) ?? id).join(', ');
  }
  if (field.type === 'select') {
    const opt = field.options?.find(o => o.id === fv.selectValue);
    return opt?.label ?? fv.selectValue ?? '';
  }
  if (field.type === 'multi_select') {
    return (fv.multiSelectValue ?? [])
      .map(id => field.options?.find(o => o.id === id)?.label ?? id)
      .join(', ');
  }
  return '';
}
