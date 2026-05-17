import { Trash2 } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ValueInput } from './ValueInput';
import { getOperatorsForFieldType, OPERATOR_LABELS } from './constants';
import { getFieldMeta, getIconByName } from '../../constants';
import type { Field, DynUser } from '../../types';
import type { FilterRule, FilterOperator, DateMode } from './types';

interface FilterRuleRowProps {
  rule: FilterRule;
  fields: Field[];
  users: DynUser[];
  onUpdate: (patch: Partial<Omit<FilterRule, 'id' | 'type'>>) => void;
  onDelete: () => void;
}

export function FilterRuleRow({ rule, fields, users, onUpdate, onDelete }: FilterRuleRowProps) {
  const field = fields.find(f => f.id === rule.fieldId);
  const operators = field ? getOperatorsForFieldType(field.type) : [];

  const handleFieldChange = (fieldId: string) => {
    const newField = fields.find(f => f.id === fieldId);
    if (!newField) return;
    const newOps = getOperatorsForFieldType(newField.type);
    const firstOp = newOps[0]?.operator ?? 'is';
    const isDateField = newField.type === 'date' || newField.type === 'created_time' || newField.type === 'updated_time';
    onUpdate({ 
      fieldId, 
      operator: firstOp as FilterOperator, 
      value: null, 
      dateMode: isDateField ? 'exact_date' : undefined 
    });
  };

  const handleOperatorChange = (op: FilterOperator) => {
    // Reset value when operator changes to/from empty-check
    const wasEmpty = rule.operator === 'is_empty' || rule.operator === 'is_not_empty';
    const isNowEmpty = op === 'is_empty' || op === 'is_not_empty';
    onUpdate({ operator: op, value: wasEmpty !== isNowEmpty ? null : rule.value });
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* Field selector — fixed width */}
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

      {/* Operator selector — fixed width */}
      <Select
        value={rule.operator}
        onValueChange={v => handleOperatorChange(v as FilterOperator)}
        disabled={operators.length === 0}
      >
        <SelectTrigger className="h-8 text-xs w-36 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {operators.map(({ operator }) => (
            <SelectItem key={operator} value={operator} className="text-xs">
              {OPERATOR_LABELS[operator]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value input — grows to fill remaining space */}
      <div className="flex-1 min-w-0">
        {field && (
          <ValueInput
            field={field}
            operator={rule.operator}
            value={rule.value}
            dateMode={rule.dateMode}
            users={users}
            onChange={value => onUpdate({ value })}
            onDateModeChange={dateMode => onUpdate({ dateMode: dateMode as DateMode })}
          />
        )}
      </div>

      {/* Delete button — shrink-0 to stay at end */}
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
