import { useState, useRef, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Field, FieldValue, FieldValuePayload, DynRecord } from './types';
import { COMPUTED_TYPES, formatDateValue, formatNumberValue } from './constants';

// ─── Option chip ──────────────────────────────────────────────────────────────

export function OptionChip({ label, color }: { label: string; color?: string | null }) {
  const c = color ?? '#6366f1';
  return (
    <span style={{ background: `${c}22`, color: c, border: `1px solid ${c}44` }}
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium">
      {label}
    </span>
  );
}

// ─── Dropdown wrapper (closes on outside click) ───────────────────────────────

function Dropdown({ trigger, children, open, setOpen }: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [setOpen]);

  return (
    <div ref={ref} className="relative w-full">
      {trigger}
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 min-w-40 rounded-md border bg-popover shadow-lg p-1">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Select cell ──────────────────────────────────────────────────────────────

function SelectCell({ field, value, onSave }: CellProps) {
  const [open, setOpen] = useState(false);
  const selectedId = value?.selectValue;
  const selectedOpt = field.options.find(o => o.id === selectedId);

  return (
    <Dropdown
      open={open} setOpen={setOpen}
      trigger={
        <button onClick={() => setOpen(v => !v)} className="w-full text-left">
          {selectedOpt
            ? <OptionChip label={selectedOpt.label} color={selectedOpt.color} />
            : <span className="text-muted-foreground/40">—</span>}
        </button>
      }
    >
      {field.options.length === 0
        ? <p className="text-xs text-muted-foreground p-2">No options defined</p>
        : <>
          {selectedOpt && (
            <button onClick={() => { onSave({ selectValue: null }); setOpen(false); }}
              className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs rounded hover:bg-accent text-muted-foreground">
              <X size={12} /> Clear
            </button>
          )}
          {field.options.map(opt => (
            <button key={opt.id}
              onClick={() => { onSave({ selectValue: opt.id }); setOpen(false); }}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-accent">
              {opt.id === selectedId && <Check size={12} className="text-primary shrink-0" />}
              <OptionChip label={opt.label} color={opt.color} />
            </button>
          ))}
        </>
      }
    </Dropdown>
  );
}

// ─── Multi-select cell ────────────────────────────────────────────────────────

function MultiSelectCell({ field, value, onSave }: CellProps) {
  const [open, setOpen] = useState(false);
  const selected = value?.multiSelectValue ?? [];

  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id];
    onSave({ multiSelectValue: next });
  };

  return (
    <Dropdown
      open={open} setOpen={setOpen}
      trigger={
        <button onClick={() => setOpen(v => !v)} className="w-full text-left flex flex-wrap gap-1 min-h-5">
          {selected.length === 0
            ? <span className="text-muted-foreground/40">—</span>
            : selected.map(id => {
              const opt = field.options.find(o => o.id === id);
              return opt ? <OptionChip key={id} label={opt.label} color={opt.color} /> : null;
            })}
        </button>
      }
    >
      {field.options.length === 0
        ? <p className="text-xs text-muted-foreground p-2">No options defined</p>
        : field.options.map(opt => (
          <label key={opt.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer">
            <Checkbox checked={selected.includes(opt.id)} onCheckedChange={() => toggle(opt.id)} />
            <OptionChip label={opt.label} color={opt.color} />
          </label>
        ))
      }
    </Dropdown>
  );
}

// ─── Date cell ────────────────────────────────────────────────────────────────

function DateCell({ field, value, onSave }: CellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const cfg = field.config ?? {};
  const inputType = cfg.includeTime ? 'datetime-local' : 'date';

  const display = value?.dateValue ? formatDateValue(value.dateValue, cfg) : null;

  if (!editing) {
    return (
      <button
        onClick={() => {
          const raw = value?.dateValue ?? '';
          setDraft(inputType === 'date' ? raw.slice(0, 10) : raw.slice(0, 16));
          setEditing(true);
        }}
        className="w-full text-left text-sm"
      >
        {display ?? <span className="text-muted-foreground/40">—</span>}
      </button>
    );
  }

  const commit = () => { setEditing(false); onSave({ dateValue: draft || null }); };

  return (
    <Input
      type={inputType}
      autoFocus
      value={draft}
      onChange={e => setDraft(e.target.value)}
      className="h-7 text-xs"
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
    />
  );
}

// ─── Number cell ──────────────────────────────────────────────────────────────

function NumberCell({ field, value, onSave }: CellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const display = formatNumberValue(value?.numberValue, field.config ?? {});

  if (!editing) {
    return (
      <button onClick={() => { setDraft(value?.numberValue ?? ''); setEditing(true); }} className="w-full text-left text-sm">
        {display || <span className="text-muted-foreground/40">—</span>}
      </button>
    );
  }

  const commit = () => { setEditing(false); onSave({ numberValue: draft === '' ? null : parseFloat(draft) }); };

  return (
    <Input type="number" autoFocus value={draft} onChange={e => setDraft(e.target.value)}
      className="h-7 text-xs" onBlur={commit} onKeyDown={e => e.key === 'Enter' && commit()} />
  );
}

// ─── Text cell ────────────────────────────────────────────────────────────────

function TextCell({ value, onSave }: CellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  if (!editing) {
    return (
      <button onClick={() => { setDraft(value?.textValue ?? ''); setEditing(true); }} className="w-full text-left text-sm">
        {value?.textValue || <span className="text-muted-foreground/40">—</span>}
      </button>
    );
  }

  const commit = () => { setEditing(false); onSave({ textValue: draft || null }); };
  return (
    <Input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
      className="h-7 text-xs" onBlur={commit} onKeyDown={e => e.key === 'Enter' && commit()} />
  );
}

// ─── Checkbox cell ────────────────────────────────────────────────────────────

function CheckboxCell({ value, onSave }: CellProps) {
  return (
    <Checkbox
      checked={value?.boolValue ?? false}
      onCheckedChange={v => onSave({ boolValue: Boolean(v) })}
    />
  );
}

// ─── Computed cell ────────────────────────────────────────────────────────────

function ComputedCell({ field, record }: { field: Field; record: DynRecord }) {
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

// ─── Dispatcher ───────────────────────────────────────────────────────────────

interface CellProps {
  field: Field;
  value?: FieldValue;
  onSave: (p: FieldValuePayload) => void;
}

export function CellEditor({ field, value, onSave, record }: CellProps & { record: DynRecord }) {
  if (COMPUTED_TYPES.includes(field.type)) return <ComputedCell field={field} record={record} />;

  switch (field.type) {
    case 'select':       return <SelectCell field={field} value={value} onSave={onSave} />;
    case 'multi_select': return <MultiSelectCell field={field} value={value} onSave={onSave} />;
    case 'date':         return <DateCell field={field} value={value} onSave={onSave} />;
    case 'number':       return <NumberCell field={field} value={value} onSave={onSave} />;
    case 'checkbox':     return <CheckboxCell field={field} value={value} onSave={onSave} />;
    default:             return <TextCell field={field} value={value} onSave={onSave} />;
  }
}

// ─── Field type badge (for header) ────────────────────────────────────────────

export function FieldTypeBadge({ field }: { field: Field }) {
  const { Icon } = { Icon: (() => null) as React.ComponentType<{ size?: number }> };
  void Icon; // unused — we import from constants in the parent
  return (
    <Badge variant="secondary" className="text-xs font-normal gap-1">
      {field.name}
    </Badge>
  );
}
