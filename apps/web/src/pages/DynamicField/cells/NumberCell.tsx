import { useState } from 'react';
import { Hash } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CellTrigger } from './shared';
import { formatNumberValue } from '../constants';
import type { CellProps } from './shared';

export function NumberCell({ field, value, onSave }: CellProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const display = formatNumberValue(value?.numberValue, field.config ?? {});

  const commit = () => {
    onSave({ numberValue: draft === '' ? null : parseFloat(draft) });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={v => { setOpen(v); if (v) setDraft(value?.numberValue ?? ''); }}>
      <PopoverTrigger asChild>
        <button className="w-full text-left min-h-5">
          <CellTrigger empty={!display}>
            {display
              ? <span className="flex items-center gap-1.5 text-sm"><Hash size={12} className="text-muted-foreground shrink-0" />{display}</span>
              : '—'}
          </CellTrigger>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-3 flex flex-col gap-3" align="start">
        <p className="text-xs font-medium text-muted-foreground">Number</p>
        <Input type="number" autoFocus value={draft} onChange={e => setDraft(e.target.value)}
          className="h-8 text-sm"
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setOpen(false); }} />
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 h-7 text-xs" onClick={commit}>Apply</Button>
          {value?.numberValue != null && (
            <Button size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => { onSave({ numberValue: null }); setOpen(false); }}>Clear</Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
