import { formatDateValue } from '../constants';
import type { Field } from '../types';
import type { DynRecord } from '../types';

interface Props {
  field: Field;
  record: DynRecord;
}

export function ComputedCell({ field, record }: Props) {
  const cls = 'text-xs text-muted-foreground select-none';
  switch (field.type) {
    case 'id':           return <span className={cls}>#{record.rowNumber}</span>;
    case 'created_time': return <span className={cls}>{formatDateValue(record.createdAt, {})}</span>;
    case 'updated_time': return <span className={cls}>{formatDateValue(record.updatedAt, {})}</span>;
    case 'created_by':   return <span className={cls}>System</span>;
    case 'updated_by':   return <span className={cls}>System</span>;
    default:             return null;
  }
}
