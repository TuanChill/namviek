import { useState } from 'react';
import { X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { OptionChip, CellTrigger } from './shared';
import type { CellProps } from './shared';

export function MultiSelectCell({ field, value, onSave }: CellProps) {
  const [open, setOpen] = useState(false);
  const selected = value?.multiSelectValue ?? [];

  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id];
    onSave({ multiSelectValue: next });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="w-full text-left min-h-5">
          <CellTrigger empty={selected.length === 0}>
            {selected.length === 0 ? '—' : selected.map(id => {
              const opt = field.options.find(o => o.id === id);
              return opt ? <OptionChip key={id} label={opt.label} color={opt.color} /> : null;
            })}
          </CellTrigger>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1" align="start">
        {field.options.length === 0 ? (
          <p className="text-xs text-muted-foreground px-2 py-1.5">No options defined</p>
        ) : (
          field.options.map(opt => (
            <label key={opt.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer">
              <Checkbox checked={selected.includes(opt.id)} onCheckedChange={() => toggle(opt.id)} />
              <OptionChip label={opt.label} color={opt.color} />
            </label>
          ))
        )}
        {selected.length > 0 && (
          <button onClick={() => { onSave({ multiSelectValue: [] }); setOpen(false); }}
            className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs rounded hover:bg-accent text-muted-foreground mt-0.5 border-t border-border">
            <X size={12} /> Clear all
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
