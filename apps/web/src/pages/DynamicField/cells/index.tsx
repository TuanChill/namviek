// Barrel — re-export all cell components and the main dispatcher
export { OptionChip, CellTrigger } from './shared';
export type { CellProps, ActiveProps, CellEditorProps } from './shared';
export { SelectCell } from './SelectCell';
export { MultiSelectCell } from './MultiSelectCell';
export { DateCell } from './DateCell';
export { NumberCell } from './NumberCell';
export { TextCell } from './TextCell';
export { CheckboxCell } from './CheckboxCell';
export { ComputedCell } from './ComputedCell';
export { PersonCell, PersonChip } from './PersonCell';

// ─── CellEditor dispatcher ────────────────────────────────────────────────────

import { SelectCell } from './SelectCell';
import { MultiSelectCell } from './MultiSelectCell';
import { DateCell } from './DateCell';
import { NumberCell } from './NumberCell';
import { TextCell } from './TextCell';
import { CheckboxCell } from './CheckboxCell';
import { ComputedCell } from './ComputedCell';
import { PersonCell } from './PersonCell';
import { COMPUTED_TYPES } from '../constants';
import type { CellEditorProps } from './shared';

export function CellEditor({
  field, value, onSave, record, isActive, onActivate, onDeactivate,
}: CellEditorProps) {
  if (COMPUTED_TYPES.includes(field.type)) return <ComputedCell field={field} record={record} />;

  switch (field.type) {
    case 'select':       return <SelectCell field={field} value={value} onSave={onSave} />;
    case 'multi_select': return <MultiSelectCell field={field} value={value} onSave={onSave} />;
    case 'date':         return <DateCell field={field} value={value} onSave={onSave} />;
    case 'number':       return <NumberCell field={field} value={value} onSave={onSave} />;
    case 'checkbox':     return <CheckboxCell field={field} value={value} onSave={onSave} />;
    case 'person':       return <PersonCell field={field} value={value} onSave={onSave} />;
    default:             return (
      <TextCell
        field={field} value={value} onSave={onSave}
        isActive={isActive} onActivate={onActivate} onDeactivate={onDeactivate}
      />
    );
  }
}
