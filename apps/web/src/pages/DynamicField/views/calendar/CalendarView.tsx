import { useEffect, useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { DynRecord, DynView, Field, FieldValuePayload, ViewConfig } from '../../types';

interface CalendarViewProps {
  fields: Field[];
  records: DynRecord[];
  loading: boolean;
  view: DynView;
  onUpdateView: (viewId: string, patch: { config?: ViewConfig }) => void;
  onAddRecord: () => Promise<DynRecord | undefined>;
  onSetValue: (record: DynRecord, field: Field, payload: FieldValuePayload) => Promise<void>;
}

interface CalendarItem {
  id: string;
  title: string;
  start: Date;
  end: Date;
}

interface AddRecordPopoverProps {
  onCreate: (name: string) => Promise<void>;
  triggerClassName: string;
  labelClassName?: string;
  iconOnly?: boolean;
}

type CalendarMode = 'month' | 'week';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function AddRecordPopover({ onCreate, triggerClassName, labelClassName, iconOnly = false }: AddRecordPopoverProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  const submit = async () => {
    await onCreate(name);
    setName('');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={triggerClassName}>
          <Plus size={12} />
          {!iconOnly && <span className={labelClassName}>Record</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Record name"
            className="h-8 text-xs"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                void submit();
              }
            }}
          />
          <Button size="sm" className="h-8 text-xs" onClick={() => { void submit(); }}>
            Create
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function parseDateValue(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getRecordFieldDate(record: DynRecord, field: Field | null): Date | null {
  if (!field) return null;

  if (field.type === 'created_time') {
    return parseDateValue(record.createdAt);
  }

  if (field.type === 'updated_time') {
    return parseDateValue(record.updatedAt);
  }

  const fv = record.fieldValues.find(v => v.fieldId === field.id);
  return parseDateValue(fv?.dateValue);
}

export function CalendarView({ fields, records, loading, view, onUpdateView, onAddRecord, onSetValue }: CalendarViewProps) {
  const calendarCfg = view.config?.calendar;
  const [mode, setMode] = useState<CalendarMode>(calendarCfg?.mode ?? 'month');
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());

  useEffect(() => {
    setMode(view.config?.calendar?.mode ?? 'month');
  }, [view.id, view.config?.calendar?.mode]);

  const dateFields = useMemo(
    () => fields.filter(f => f.type === 'date' || f.type === 'created_time' || f.type === 'updated_time'),
    [fields],
  );

  const primaryField = useMemo(() => fields.find(f => f.isPrimary) ?? fields[0] ?? null, [fields]);

  const startField = useMemo(
    () => fields.find(f => f.id === calendarCfg?.startDateFieldId) ?? null,
    [fields, calendarCfg?.startDateFieldId],
  );

  const endField = useMemo(
    () => fields.find(f => f.id === calendarCfg?.endDateFieldId) ?? null,
    [fields, calendarCfg?.endDateFieldId],
  );

  const items = useMemo<CalendarItem[]>(() => {
    if (!startField) return [];

    return records.flatMap(record => {
      const start = getRecordFieldDate(record, startField);
      if (!start) return [];

      const endRaw = getRecordFieldDate(record, endField) ?? start;
      const startAt = start <= endRaw ? start : endRaw;
      const endAt = start <= endRaw ? endRaw : start;

      const titleFv = primaryField ? record.fieldValues.find(v => v.fieldId === primaryField.id) : null;
      const title = titleFv?.textValue?.trim() || `Record #${record.rowNumber}`;

      return [{ id: record.id, title, start: startAt, end: endAt }];
    });
  }, [records, startField, endField, primaryField]);

  const saveMode = (nextMode: CalendarMode) => {
    setMode(nextMode);
    onUpdateView(view.id, {
      config: {
        ...(view.config ?? {}),
        calendar: {
          ...(view.config?.calendar ?? {}),
          mode: nextMode,
        },
      },
    });
  };

  const movePrev = () => setAnchorDate(prev => (mode === 'month' ? subMonths(prev, 1) : subWeeks(prev, 1)));
  const moveNext = () => setAnchorDate(prev => (mode === 'month' ? addMonths(prev, 1) : addWeeks(prev, 1)));
  const moveToday = () => setAnchorDate(new Date());

  const handleCreateRecordAtDate = async (day: Date, inputName: string) => {
    const record = await onAddRecord();
    if (!record) return;

    const defaultName = `Record #${record.rowNumber}`;
    if (primaryField) {
      await onSetValue(record, primaryField, { textValue: inputName.trim() || defaultName });
    }

    const isoDate = format(day, 'yyyy-MM-dd');
    if (startField?.type === 'date') {
      await onSetValue(record, startField, { dateValue: isoDate });
    }
    if (endField?.type === 'date' && endField.id !== startField?.id) {
      await onSetValue(record, endField, { dateValue: isoDate });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 size={22} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (dateFields.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground p-8">
        <p className="text-sm font-medium">No date field available</p>
        <p className="text-xs text-center">
          Add a <strong>Date</strong> field, then choose it as Start date in <strong>Edit view</strong>.
        </p>
      </div>
    );
  }

  if (!startField) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground p-8">
        <p className="text-sm font-medium">Start date field is not configured</p>
        <p className="text-xs text-center">
          Open <strong>Edit view</strong> and set a Start date field for this calendar.
        </p>
      </div>
    );
  }

  const monthLabel = format(anchorDate, 'MMMM yyyy');
  const weekStart = startOfWeek(anchorDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(anchorDate, { weekStartsOn: 0 });
  const weekLabel = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;

  return (
    <div className="flex flex-1 flex-col p-4 gap-3 overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">{mode === 'month' ? monthLabel : weekLabel}</div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border p-0.5">
            <Button
              variant={mode === 'month' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => saveMode('month')}
            >
              <CalendarDays size={13} className="mr-1" /> Month
            </Button>
            <Button
              variant={mode === 'week' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => saveMode('week')}
            >
              <CalendarRange size={13} className="mr-1" /> Week
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="size-8" onClick={movePrev}>
              <ChevronLeft size={15} />
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={moveToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" className="size-8" onClick={moveNext}>
              <ChevronRight size={15} />
            </Button>
          </div>
        </div>
      </div>

      {mode === 'month' ? (
        <MonthGrid currentDate={anchorDate} items={items} onAddRecordAtDate={handleCreateRecordAtDate} />
      ) : (
        <WeekGrid currentDate={anchorDate} items={items} onAddRecordAtDate={handleCreateRecordAtDate} />
      )}
    </div>
  );
}

function MonthGrid({
  currentDate,
  items,
  onAddRecordAtDate,
}: {
  currentDate: Date;
  items: CalendarItem[];
  onAddRecordAtDate: (day: Date, name: string) => Promise<void>;
}) {
  const monthStart = startOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });

  const days: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) {
    days.push(d);
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="grid grid-cols-7 gap-px mb-1">
        {WEEKDAY_LABELS.map(label => (
          <div key={label} className="text-xs font-medium text-muted-foreground text-center py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden flex-1 min-h-0">
        {days.map(day => {
          const dayStart = startOfDay(day);
          const dayEnd = endOfDay(day);
          const dayItems = items.filter(item =>
            isWithinInterval(dayStart, { start: startOfDay(item.start), end: endOfDay(item.end) }) ||
            isWithinInterval(dayEnd, { start: startOfDay(item.start), end: endOfDay(item.end) }) ||
            (dayStart <= startOfDay(item.start) && dayEnd >= endOfDay(item.end))
          );

          return (
            <div
              key={day.toISOString()}
              className={`group bg-background min-h-[112px] p-1.5 flex flex-col gap-1 ${
                isSameMonth(day, currentDate) ? 'hover:bg-accent/20 transition-colors' : 'bg-muted/30'
              }`}
            >
              <span
                className={`text-xs font-medium self-end size-5 flex items-center justify-center rounded-full ${
                  isSameDay(day, new Date()) ? 'bg-primary text-primary-foreground' : 'text-foreground'
                }`}
              >
                {format(day, 'd')}
              </span>

              {dayItems.slice(0, 3).map(item => (
                <div
                  key={`${item.id}-${day.toISOString()}`}
                  className="text-[10px] rounded px-1.5 py-0.5 truncate border border-primary/30 bg-primary/10 text-primary"
                  title={item.title}
                >
                  {item.title}
                </div>
              ))}

              {dayItems.length > 3 && (
                <span className="text-[10px] text-muted-foreground px-1">
                  +{dayItems.length - 3} more
                </span>
              )}

              <AddRecordPopover
                onCreate={name => onAddRecordAtDate(day, name)}
                triggerClassName="mt-auto text-[10px] text-muted-foreground hover:text-foreground w-fit inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                labelClassName="text-[10px]"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({
  currentDate,
  items,
  onAddRecordAtDate,
}: {
  currentDate: Date;
  items: CalendarItem[];
  onAddRecordAtDate: (day: Date, name: string) => Promise<void>;
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="flex flex-1 gap-2 min-h-0">
      {days.map(day => {
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);
        const dayItems = items.filter(item =>
          isWithinInterval(dayStart, { start: startOfDay(item.start), end: endOfDay(item.end) }) ||
          isWithinInterval(dayEnd, { start: startOfDay(item.start), end: endOfDay(item.end) }) ||
          (dayStart <= startOfDay(item.start) && dayEnd >= endOfDay(item.end))
        );

        return (
          <div key={day.toISOString()} className="group flex-1 min-w-0 border rounded-lg p-2 flex flex-col gap-2 overflow-hidden">
            <div className="pb-1 border-b">
              <div className="flex items-start justify-between gap-1">
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">{format(day, 'EEE')}</div>
                  <div className={`text-sm font-semibold ${isSameDay(day, new Date()) ? 'text-primary' : ''}`}>
                    {format(day, 'MMM d')}
                  </div>
                </div>

                <AddRecordPopover
                  onCreate={name => onAddRecordAtDate(day, name)}
                  triggerClassName="inline-flex items-center justify-center size-5 rounded text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                  iconOnly
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto flex flex-col gap-1">
              {dayItems.length === 0 ? (
                <div className="text-xs text-muted-foreground py-1">No records</div>
              ) : (
                dayItems.map(item => (
                  <div
                    key={`${item.id}-${day.toISOString()}`}
                    className="text-xs rounded-md border border-primary/30 bg-primary/10 text-primary px-2 py-1"
                    title={item.title}
                  >
                    <div className="font-medium truncate">{item.title}</div>
                    {!isSameDay(item.start, item.end) && (
                      <div className="text-[10px] opacity-80">
                        {format(item.start, 'MMM d')} - {format(item.end, 'MMM d')}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
