/**
 * Dynamic value input dispatcher.
 * Reads `getValueInputVariant(fieldType, operator)` from constants
 * to decide which control to render — no conditionals scattered elsewhere.
 */

import { useState } from 'react';
import { Check, ChevronDown, Calendar as CalendarIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { getValueInputVariant, RELATIVE_DATE_MODES, DATE_MODE_LABELS, DATE_MODES_ORDERED } from './constants';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import type { Field, DynUser } from '../../types';
import type { FilterOperator, DateMode } from './types';

function parseYmdLocal(value?: string): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function formatYmd(value: Date): string {
  return format(value, 'yyyy-MM-dd');
}

interface ValueInputProps {
  field: Field;
  operator: FilterOperator;
  value: unknown;
  dateMode?: DateMode;
  users: DynUser[];
  onChange: (value: unknown) => void;
  onDateModeChange?: (mode: DateMode) => void;
}

export function ValueInput({
  field,
  operator,
  value,
  dateMode = 'exact_date',
  users,
  onChange,
  onDateModeChange,
}: ValueInputProps) {
  const variant = getValueInputVariant(field.type, operator);

  if (variant === 'none') return null;

  switch (variant) {
    case 'text':
      return (
        <Input
          className="h-8 text-xs"
          placeholder="Enter a value"
          value={typeof value === 'string' ? value : ''}
          onChange={e => onChange(e.target.value)}
        />
      );

    case 'number':
      return (
        <Input
          type="number"
          className="h-8 text-xs"
          placeholder="Enter a number"
          value={typeof value === 'number' ? String(value) : (typeof value === 'string' ? value : '')}
          onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />
      );

    case 'select':
      return (
        <SelectOptionPicker
          options={field.options ?? []}
          value={typeof value === 'string' ? value : ''}
          onChange={onChange}
          placeholder="Select..."
          multi={false}
        />
      );

    case 'multi_select':
      return (
        <SelectOptionPicker
          options={field.options ?? []}
          value={Array.isArray(value) ? value as string[] : []}
          onChange={onChange}
          placeholder="Select..."
          multi
        />
      );

    case 'checkbox':
      return (
        <Select
          value={value === true || value === 'true' ? 'true' : 'false'}
          onValueChange={v => onChange(v === 'true')}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Checked</SelectItem>
            <SelectItem value="false">Unchecked</SelectItem>
          </SelectContent>
        </Select>
      );

    case 'person':
      return (
        <PersonPicker
          users={users}
          value={Array.isArray(value) ? value as string[] : []}
          onChange={onChange}
        />
      );

    case 'date':
      return (
        <DateValueInput
          dateMode={dateMode}
          value={value}
          onChange={onChange}
          onDateModeChange={onDateModeChange ?? (() => {})}
        />
      );

    default:
      return null;
  }
}

// ─── Select option picker ─────────────────────────────────────────────────────

interface OptionItem { id: string; label: string; color?: string | null; }

function SelectOptionPicker({
  options,
  value,
  onChange,
  placeholder,
  multi,
}: {
  options: OptionItem[];
  value: string | string[];
  onChange: (v: unknown) => void;
  placeholder: string;
  multi: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedIds = multi ? (value as string[]) : (value ? [value as string] : []);

  const toggle = (id: string) => {
    if (!multi) {
      onChange(id === (value as string) ? null : id);
      setOpen(false);
      return;
    }
    const next = selectedIds.includes(id)
      ? selectedIds.filter(v => v !== id)
      : [...selectedIds, id];
    onChange(next);
  };

  const selectedLabels = options
    .filter(o => selectedIds.includes(o.id))
    .map(o => o.label);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center justify-between gap-2 h-8 w-full px-2 rounded-md border border-input bg-background text-xs hover:bg-accent transition-colors min-w-0">
          <span className="truncate text-left flex-1 text-muted-foreground">
            {selectedLabels.length > 0 ? selectedLabels.join(', ') : placeholder}
          </span>
          <ChevronDown size={12} className="shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="start">
        {options.length === 0 ? (
          <p className="text-xs text-muted-foreground px-2 py-1.5">No options</p>
        ) : (
          options.map(opt => (
            <button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-accent text-xs"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: opt.color ?? '#6366f1' }}
              />
              <span className="flex-1 text-left">{opt.label}</span>
              {selectedIds.includes(opt.id) && <Check size={11} className="text-primary shrink-0" />}
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}

// ─── Person picker ────────────────────────────────────────────────────────────

function PersonPicker({
  users,
  value,
  onChange,
}: {
  users: DynUser[];
  value: string[];
  onChange: (v: unknown) => void;
}) {
  const [open, setOpen] = useState(false);

  const toggle = (id: string) => {
    const next = value.includes(id) ? value.filter(v => v !== id) : [...value, id];
    onChange(next);
  };

  const selectedNames = users.filter(u => value.includes(u.id)).map(u => u.name);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center justify-between gap-2 h-8 w-full px-2 rounded-md border border-input bg-background text-xs hover:bg-accent transition-colors min-w-0">
          <span className="truncate text-left flex-1 text-muted-foreground">
            {selectedNames.length > 0 ? selectedNames.join(', ') : 'Select user…'}
          </span>
          <ChevronDown size={12} className="shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1" align="start">
        {users.length === 0 ? (
          <p className="text-xs text-muted-foreground px-2 py-1.5">No users</p>
        ) : (
          users.map(u => (
            <button
              key={u.id}
              onClick={() => toggle(u.id)}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-accent text-xs"
            >
              <span className="flex-1 text-left">{u.name}</span>
              {value.includes(u.id) && <Check size={11} className="text-primary shrink-0" />}
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}


// ─── Date value input ─────────────────────────────────────────────────────────

function DateValueInput({
  dateMode,
  value,
  onChange,
  onDateModeChange,
}: {
  dateMode: DateMode;
  value: unknown;
  onChange: (v: unknown) => void;
  onDateModeChange: (m: DateMode) => void;
}) {
  const isRelative = RELATIVE_DATE_MODES.has(dateMode);

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      {/* Date mode selector */}
      <Select value={dateMode} onValueChange={v => onDateModeChange(v as DateMode)}>
        <SelectTrigger className="h-8 text-xs w-36 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_MODES_ORDERED.map(m => (
            <SelectItem key={m} value={m} className="text-xs">
              {DATE_MODE_LABELS[m]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date picker — hidden for relative modes */}
      {!isRelative && dateMode === 'exact_date' && (
        <DatePickerButton
          value={typeof value === 'string' ? value : ''}
          onChange={onChange}
        />
      )}

      {!isRelative && dateMode === 'custom_range' && (
        <DateRangePickerButton
          value={value as { from?: string; to?: string } | null}
          onChange={onChange}
        />
      )}
    </div>
  );
}

function DatePickerButton({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: unknown) => void;
}) {
  const [open, setOpen] = useState(false);
  const date = parseYmdLocal(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-2 flex-1"
        >
          <CalendarIcon size={13} />
          <span className="text-xs">
            {date ? format(date, 'MMM d, yyyy') : 'Pick a date'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            if (d) {
              onChange(formatYmd(d));
              setOpen(false);
            }
          }}
          disabled={(date) => date > new Date('2099-12-31')}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

function DateRangePickerButton({
  value,
  onChange,
}: {
  value: { from?: string; to?: string } | null;
  onChange: (v: unknown) => void;
}) {
  const [open, setOpen] = useState(false);
  const from = parseYmdLocal(value?.from);
  const to = parseYmdLocal(value?.to);

  const selectedRange: DateRange | undefined = from || to ? { from, to } : undefined;

  const handleRangeSelect = (range: DateRange | undefined) => {
    if (!range?.from) {
      onChange({ from: undefined, to: undefined });
      return;
    }

    onChange({
      from: formatYmd(range.from),
      to: range.to ? formatYmd(range.to) : undefined,
    });
  };

  const displayText = value?.from && value?.to 
    ? `${format(from!, 'MMM d')} → ${format(to!, 'MMM d, yyyy')}`
    : value?.from
    ? `From ${format(from!, 'MMM d, yyyy')}`
    : 'Pick date range';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-2 flex-1"
        >
          <CalendarIcon size={13} />
          <span className="text-xs">{displayText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          defaultMonth={from}
          selected={selectedRange}
          onSelect={handleRangeSelect}
          numberOfMonths={2}
          disabled={(date) => date > new Date('2099-12-31')}
          initialFocus
        />
        {value?.from && (
          <div className="p-2 border-t text-xs text-muted-foreground">
            From: {from ? format(from, 'MMM d, yyyy') : value.from}
            {value?.to && ` → To: ${to ? format(to, 'MMM d, yyyy') : value.to}`}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
