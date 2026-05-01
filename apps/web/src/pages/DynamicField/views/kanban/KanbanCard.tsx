import { CellEditor } from '../../CellEditors';
import type { DynRecord, DynView, Field, FieldValuePayload } from '../../types';

interface KanbanCardProps {
  record: DynRecord;
  fields: Field[];
  view: DynView;
  onSetValue: (record: DynRecord, field: Field, payload: FieldValuePayload) => void;
}

export function KanbanCard({ record, fields, view, onSetValue }: KanbanCardProps) {
  const primaryField = fields.find(f => f.isPrimary) ?? fields[0];
  const titleFv = primaryField ? record.fieldValues.find(v => v.fieldId === primaryField.id) : null;
  const title = titleFv?.textValue ?? `Record #${record.rowNumber}`;

  const hiddenIds = new Set<string>((view.config as any)?.hiddenFieldIds ?? []);
  const previewFields = fields.filter(f => !f.isPrimary && f.type !== 'id' && !hiddenIds.has(f.id));

  return (
    <div className="bg-card border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-sm font-medium truncate mb-1">{title}</p>
      {previewFields.map(field => {
        const fv = record.fieldValues.find(v => v.fieldId === field.id);
        return (
          <div key={field.id} className="flex flex-col gap-1.5 text-xs text-muted-foreground mt-1">
            <span className="font-medium truncate">{field.name}</span>
            <div
              className="rounded-md border border-border/60 px-2 py-1 bg-background/60"
              onClick={e => e.stopPropagation()}
            >
              <CellEditor
                field={field}
                value={fv}
                record={record}
                onSave={payload => onSetValue(record, field, payload)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
