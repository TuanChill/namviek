// Shared types and primitives used by all cell components
import type { Field, FieldValue, FieldValuePayload, DynRecord } from '../types';

export interface CellProps {
  field: Field;
  value?: FieldValue;
  onSave: (p: FieldValuePayload) => void;
}

export interface ActiveProps {
  isActive?: boolean;
  onActivate?: () => void;
  onDeactivate?: () => void;
}

export type CellEditorProps = CellProps & { record: DynRecord } & ActiveProps;

// ─── OptionChip ───────────────────────────────────────────────────────────────

export function OptionChip({ label, color }: { label: string; color?: string | null }) {
  const c = color ?? '#6366f1';
  return (
    <span
      style={{ background: `${c}22`, color: c, border: `1px solid ${c}44` }}
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
    >
      {label}
    </span>
  );
}

// ─── CellTrigger ──────────────────────────────────────────────────────────────

export function CellTrigger({ children, empty = false }: { children: React.ReactNode; empty?: boolean }) {
  return (
    <div className={`w-full min-h-5 text-left text-sm cursor-pointer flex flex-wrap items-center gap-1 ${empty ? 'text-muted-foreground/40' : ''}`}>
      {children}
    </div>
  );
}
