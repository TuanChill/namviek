import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KanbanCard } from './KanbanCard';
import type { DynRecord, DynView, Field, FieldValuePayload } from '../../types';

export interface KanbanColumnData {
  key: string;
  label: string;
  color?: string | null;
  records: DynRecord[];
}

interface KanbanColumnProps {
  col: KanbanColumnData;
  fields: Field[];
  view: DynView;
  onSetValue: (record: DynRecord, field: Field, payload: FieldValuePayload) => void;
  onAddRecord: () => void;
}

export function KanbanColumn({ col, fields, view, onSetValue, onAddRecord }: KanbanColumnProps) {
  return (
    <div className="flex flex-col gap-2 min-w-[260px] max-w-[260px]">
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
          <KanbanCard
            key={record.id}
            record={record}
            fields={fields}
            view={view}
            onSetValue={onSetValue}
          />
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
  );
}
