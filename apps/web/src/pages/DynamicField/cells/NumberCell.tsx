import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CellTrigger } from './shared';
import { formatNumberValue } from '../constants';
import type { CellProps } from './shared';

export function NumberCell({ field, value, onSave }: CellProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const config = field.config ?? {};
  const display = formatNumberValue(value?.numberValue, config);
  const showAs = config.showAs ?? 'number';
  const color = config.color ?? '#10b981';
  const showNumber = config.showNumber ?? true;
  const divideBy = config.divideBy ?? 100;

  const numValueRaw = value?.numberValue;
  const numValue = typeof numValueRaw === 'string' ? parseFloat(numValueRaw) : (numValueRaw ?? 0);
  const percent = Math.min(100, Math.max(0, (numValue / divideBy) * 100));

  let DisplayComponent;
  if (value?.numberValue == null) {
    DisplayComponent = '—';
  } else if (showAs === 'bar') {
    DisplayComponent = (
      <div className="flex items-center gap-2 w-full min-w-[100px]">
        {showNumber && <span className="text-sm">{display}</span>}
        <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden" style={{ backgroundColor: `${color}22` }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, backgroundColor: color }} />
        </div>
      </div>
    );
  } else if (showAs === 'ring') {
    const radius = 8;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    DisplayComponent = (
      <div className="flex items-center gap-2">
        {showNumber && <span className="text-sm">{display}</span>}
        <svg className="w-5 h-5 -rotate-90 shrink-0" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r={radius} fill="none" strokeWidth="3" className="text-muted" style={{ stroke: `${color}22` }} />
          <circle
            cx="10"
            cy="10"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300"
          />
        </svg>
      </div>
    );
  } else {
    DisplayComponent = (
      <span className="flex items-center gap-1.5 text-sm">
        {/* <Hash size={12} className="text-muted-foreground shrink-0" /> */}
        {display}
      </span>
    );
  }

  const commit = () => {
    onSave({ numberValue: draft === '' ? null : parseFloat(draft) });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={v => { setOpen(v); if (v) setDraft(value?.numberValue ?? ''); }}>
      <PopoverTrigger asChild>
        <button className="w-full text-left min-h-5">
          <CellTrigger empty={value?.numberValue == null}>
            {DisplayComponent}
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
