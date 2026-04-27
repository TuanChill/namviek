import { useState } from 'react';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CellTrigger } from './shared';
import { formatDateValue } from '../constants';
import type { CellProps } from './shared';

export function DateCell({ field, value, onSave }: CellProps) {
  const cfg = field.config ?? {};
  const includeTime = cfg.includeTime ?? false;

  const parseStored = (): Date | undefined => {
    if (!value?.dateValue) return undefined;
    const d = new Date(value.dateValue);
    return isNaN(d.getTime()) ? undefined : d;
  };

  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [timeDraft, setTimeDraft] = useState('00:00');
  const display = value?.dateValue ? formatDateValue(value.dateValue, cfg) : null;

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) {
      const d = parseStored();
      setSelectedDate(d);
      if (d && includeTime) {
        setTimeDraft(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
      } else {
        setTimeDraft('00:00');
      }
    }
  };

  const handleDaySelect = (day: Date | undefined) => {
    setSelectedDate(day);
    if (!includeTime) {
      if (day) onSave({ dateValue: format(day, 'yyyy-MM-dd') });
      setOpen(false);
    }
  };

  const handleApply = () => {
    if (!selectedDate) { setOpen(false); return; }
    let iso: string;
    if (includeTime) {
      const [hh, mm] = timeDraft.split(':').map(Number);
      const d = new Date(selectedDate);
      d.setHours(hh ?? 0, mm ?? 0, 0, 0);
      iso = d.toISOString();
    } else {
      iso = format(selectedDate, 'yyyy-MM-dd');
    }
    onSave({ dateValue: iso });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button className="w-full text-left min-h-5">
          <CellTrigger empty={!display}>{display ?? '—'}</CellTrigger>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={selectedDate} onSelect={handleDaySelect} captionLayout="dropdown" initialFocus />
        {includeTime && (
          <div className="border-t p-3 flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">Time</p>
            <Input type="time" value={timeDraft} onChange={e => setTimeDraft(e.target.value)} className="h-8 text-sm" />
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleApply}>Apply</Button>
              {value?.dateValue && (
                <Button size="sm" variant="outline" className="h-7 text-xs"
                  onClick={() => { onSave({ dateValue: null }); setOpen(false); }}>Clear</Button>
              )}
            </div>
          </div>
        )}
        {!includeTime && value?.dateValue && (
          <div className="border-t p-2">
            <Button size="sm" variant="ghost" className="w-full h-7 text-xs text-muted-foreground"
              onClick={() => { onSave({ dateValue: null }); setOpen(false); }}>
              <X size={12} /> Clear date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
