import { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { CellProps, ActiveProps } from './shared';

export function TextCell({ value, onSave, isActive, onActivate, onDeactivate }: CellProps & ActiveProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Enter editing mode when cell becomes active, and auto-focus input
  useEffect(() => {
    if (isActive && !editing) {
      setDraft(value?.textValue ?? '');
      setEditing(true);
    }
    if (!isActive && editing) {
      setEditing(false);
    }
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-focus once the <Input> is mounted
  useEffect(() => {
    if (editing) {
      // rAF ensures the DOM node exists before we focus
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [editing]);

  const commit = () => {
    onSave({ textValue: draft || null });
    onDeactivate?.();
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        className="w-full text-left min-h-5 text-sm"
        onClick={() => { onActivate?.(); setDraft(value?.textValue ?? ''); setEditing(true); }}
      >
        {value?.textValue
          ? <span className="truncate block">{value.textValue}</span>
          : <span className="text-muted-foreground/40">—</span>}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 w-full">
      <Input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        className="h-7 text-xs flex-1 min-w-0"
        onKeyDown={e => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setEditing(false); onDeactivate?.(); }
        }}
      />
      <Button size="icon" variant="ghost" className="size-7 shrink-0" onClick={commit}>
        <Check size={13} />
      </Button>
    </div>
  );
}
