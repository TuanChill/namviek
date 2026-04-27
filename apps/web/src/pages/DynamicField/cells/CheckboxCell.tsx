import { Checkbox } from '@/components/ui/checkbox';
import type { CellProps } from './shared';

export function CheckboxCell({ value, onSave }: CellProps) {
  return (
    <Checkbox
      checked={value?.boolValue ?? false}
      onCheckedChange={v => onSave({ boolValue: Boolean(v) })}
    />
  );
}
