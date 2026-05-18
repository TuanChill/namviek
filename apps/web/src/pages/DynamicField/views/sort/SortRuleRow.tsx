import { ArrowDown, ArrowUp, Trash2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { getFieldMeta, getIconByName } from '../../constants';
import { getSortDirectionLabelsForFieldType } from './constants';
import type { Field } from '../../types';
import type { SortDirection, SortRule } from './types';

interface SortRuleRowProps {
  rule: SortRule;
  fields: Field[];
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (patch: Partial<Omit<SortRule, 'id'>>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function SortRuleRow({
  rule,
  fields,
  isFirst,
  isLast,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: SortRuleRowProps) {
  const field = fields.find(f => f.id === rule.fieldId);
  const directionLabels = getSortDirectionLabelsForFieldType(field?.type ?? 'text');

  const handleFieldChange = (fieldId: string) => {
    onUpdate({ fieldId });
  };

  const handleDirectionChange = (direction: SortDirection) => {
    onUpdate({ direction });
  };

  return (
    <div className="flex items-center gap-1.5">
      <Select value={rule.fieldId} onValueChange={handleFieldChange}>
        <SelectTrigger className="h-8 text-xs w-36 shrink-0">
          <SelectValue placeholder="Select field…" />
        </SelectTrigger>
        <SelectContent>
          {fields.map(f => {
            const FieldIcon = f.config?.customIcon ? getIconByName(f.config.customIcon) : getFieldMeta(f.type).Icon;
            return (
              <SelectItem key={f.id} value={f.id} className="text-xs">
                <span className="flex items-center gap-1.5">
                  <FieldIcon size={13} className="text-muted-foreground" />
                  <span className="truncate">{f.name}</span>
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      <Select value={rule.direction} onValueChange={v => handleDirectionChange(v as SortDirection)}>
        <SelectTrigger className="h-8 text-xs w-36 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="asc" className="text-xs">{directionLabels.asc}</SelectItem>
          <SelectItem value="desc" className="text-xs">{directionLabels.desc}</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={onMoveUp}
          disabled={isFirst}
        >
          <ArrowUp size={13} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={onMoveDown}
          disabled={isLast}
        >
          <ArrowDown size={13} />
        </Button>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 size={13} />
      </Button>
    </div>
  );
}