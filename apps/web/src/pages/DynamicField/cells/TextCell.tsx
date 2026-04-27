import { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { CellProps, ActiveProps } from './shared';

export function TextCell({ value, onSave, isActive, onActivate, onDeactivate }: CellProps & ActiveProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Open popover when cell becomes active externally (e.g., keyboard navigation)
  useEffect(() => {
    if (isActive && !open) {
      setDraft(value?.textValue ?? '');
      setOpen(true);
    }
    if (!isActive && open) {
      setOpen(false);
    }
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-focus input once popover is open
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const commit = () => {
    onSave({ textValue: draft || null });
    setOpen(false);
    onDeactivate?.();
  };

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setDraft(value?.textValue ?? '');
      onActivate?.();
    } else {
      onDeactivate?.();
    }
    setOpen(v);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button className="w-full text-left min-h-5 text-sm">
          {value?.textValue
            ? <span className="truncate block">{value.textValue}</span>
            : <span className="text-muted-foreground/40">—</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start" side="bottom">
        <div className="flex items-center gap-1.5">
          <Input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className="h-8 text-xs flex-1 min-w-0"
            placeholder="Enter text…"
            onKeyDown={e => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') { setOpen(false); onDeactivate?.(); }
            }}
          />
          <Button size="icon" variant="ghost" className="size-8 shrink-0" onClick={commit}>
            <Check size={13} />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
