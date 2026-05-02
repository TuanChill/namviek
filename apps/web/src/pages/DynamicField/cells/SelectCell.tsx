import { useState } from 'react';
import { X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { OptionChip, CellTrigger } from './shared';
import type { CellProps } from './shared';

export function SelectCell({ field, value, onSave }: CellProps) {
  const [open, setOpen] = useState(false);
  const selectedId = value?.selectValue;
  const selectedOpt = field.options?.find(o => o.id === selectedId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="w-full text-left min-h-5">
          <CellTrigger empty={!selectedOpt}>
            {selectedOpt ? <OptionChip label={selectedOpt.label} color={selectedOpt.color} /> : '—'}
          </CellTrigger>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1 gap-1" align="start">
        {(field.options?.length ?? 0) === 0 ? (
          <p className="text-xs text-muted-foreground px-2 py-1.5">No options defined</p>
        ) : (
          <>
            {selectedOpt && (
              <button onClick={() => { onSave({ selectValue: null }); setOpen(false); }}
                className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs rounded hover:bg-accent text-muted-foreground">
                <X size={12} /> Clear
              </button>
            )}
            {field.options?.map(opt => (
              <button key={opt.id} onClick={() => { onSave({ selectValue: opt.id }); setOpen(false); }}
                className={`flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-accent ${opt.id === selectedId ? 'bg-accent' : ''}`}>
                <OptionChip label={opt.label} color={opt.color} />
              </button>
            ))}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
