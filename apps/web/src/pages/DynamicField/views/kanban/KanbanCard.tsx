import { useUsers } from '../../hooks/useUsers';
import { KanbanCardContent } from './KanbanCardLayout';
import type { DynRecord, DynView, Field, FieldValuePayload } from '../../types';

interface KanbanCardProps {
  record: DynRecord;
  fields: Field[];
  view: DynView;
  onSetValue: (record: DynRecord, field: Field, payload: FieldValuePayload) => void;
}

export function KanbanCard({ record, fields, view, onSetValue }: KanbanCardProps) {
  const { users } = useUsers();

  void onSetValue;

  return (
    <KanbanCardContent
      record={record}
      fields={fields}
      view={view}
      users={users}
      className="hover:shadow-md"
    />
  );
}
