import { useEffect, useMemo, useRef } from 'react';
import {
  differenceInCalendarDays,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
} from 'date-fns';
import { GanttChart, Loader2 } from 'lucide-react';
import { useUsers } from '../../hooks/useUsers';
import type { DynRecord, DynView, Field, ViewGroupByConfig } from '../../types';

interface TimelineViewProps {
  fields: Field[];
  records: DynRecord[];
  loading: boolean;
  view: DynView;
}

interface TimelineItem {
  id: string;
  title: string;
  start: Date;
  end: Date;
  groupKey: string;
  groupLabel: string;
  assigneeIds: string[];
  dashColor: string;
}

interface TimelineGroup {
  key: string;
  label: string;
  items: TimelineItem[];
}

const DAY_CELL_WIDTH = 96;
const DEFAULT_GROUP_HEIGHT = 300;
const GROUP_TITLE_HEIGHT = 44;
const ROW_HEIGHT = 88;
const DEFAULT_DASH_COLOR = '#94a3b8';
const WEEKDAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const BASE_COLUMN_STYLE = {
  backgroundColor: '#f8fafc',
  borderRight: '1px solid #e2e8f0',
} as const;

const HIGHLIGHT_COLUMN_STYLE = {
  backgroundColor: '#e2e8f0',
  borderRight: '1px solid #cbd5e1',
  backgroundImage: 'repeating-linear-gradient(135deg, transparent 0px, transparent 14px, rgba(148,163,184,0.25) 14px, rgba(148,163,184,0.25) 16px)',
} as const;

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

function getOptionLabel(field: Field, optionId: string | null | undefined): string {
  if (!optionId) return 'No value';
  const option = (field.options ?? []).find(opt => opt.id === optionId);
  return option?.label ?? 'No value';
}

function getDateGroupLabel(date: Date, granularity: NonNullable<ViewGroupByConfig['granularity']> | undefined): string {
  if (granularity === 'quarter') {
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    return `Q${quarter} ${format(date, 'yyyy')}`;
  }

  if (granularity === 'month') {
    return format(date, 'MMM yyyy');
  }

  return format(date, 'MMM d, yyyy');
}

function getGroupForRecord(
  record: DynRecord,
  groupField: Field | null,
  granularity: NonNullable<ViewGroupByConfig['granularity']> | undefined,
): { key: string; label: string } {
  if (!groupField) {
    return { key: '__all__', label: 'All records' };
  }

  const fv = record.fieldValues.find(v => v.fieldId === groupField.id);

  if (groupField.type === 'select') {
    const key = fv?.selectValue ?? '__none__';
    return { key, label: key === '__none__' ? 'No value' : getOptionLabel(groupField, key) };
  }

  if (groupField.type === 'multi_select') {
    const key = fv?.multiSelectValue?.[0] ?? '__none__';
    return { key, label: key === '__none__' ? 'No value' : getOptionLabel(groupField, key) };
  }

  const dateValue = groupField.type === 'created_time'
    ? parseDateValue(record.createdAt)
    : groupField.type === 'updated_time'
      ? parseDateValue(record.updatedAt)
      : parseDateValue(fv?.dateValue);

  if (!dateValue) return { key: '__none__', label: 'No date' };
  const label = getDateGroupLabel(dateValue, granularity);
  return { key: label, label };
}

function getBarPosition(
  start: Date,
  end: Date,
  rangeStart: Date,
  dayCount: number,
): { left: number; width: number } {
  const startOffset = Math.max(0, differenceInCalendarDays(startOfDay(start), rangeStart));
  const endOffset = Math.min(dayCount - 1, differenceInCalendarDays(startOfDay(end), rangeStart));
  const safeEndOffset = Math.max(startOffset, endOffset);
  const widthInDays = safeEndOffset - startOffset + 1;

  return {
    left: startOffset * DAY_CELL_WIDTH + 4,
    width: Math.max(36, widthInDays * DAY_CELL_WIDTH - 8),
  };
}

function getTimelineDashColor(record: DynRecord, colorField: Field | null): string {
  if (!colorField) return DEFAULT_DASH_COLOR;

  const fv = record.fieldValues.find(v => v.fieldId === colorField.id);
  if (!fv) return DEFAULT_DASH_COLOR;

  if (colorField.type === 'select') {
    const opt = colorField.options.find(o => o.id === fv.selectValue);
    return opt?.color ?? DEFAULT_DASH_COLOR;
  }

  if (colorField.type === 'multi_select') {
    const first = fv.multiSelectValue?.[0];
    const opt = colorField.options.find(o => o.id === first);
    return opt?.color ?? DEFAULT_DASH_COLOR;
  }

  return DEFAULT_DASH_COLOR;
}

function getRecordAssigneeIds(record: DynRecord, assigneeField: Field | null): string[] {
  if (!assigneeField || assigneeField.type !== 'person') return [];
  const fv = record.fieldValues.find(v => v.fieldId === assigneeField.id);
  return fv?.personValue ?? [];
}

function getAvatarFallback(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getAvatarColor(seed: string): string {
  const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
  return colors[seed.charCodeAt(0) % colors.length];
}

export function TimelineView({ fields, records, loading, view }: TimelineViewProps) {
  const timelinePaneRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { users } = useUsers();
  const timelineCfg = view.config?.timeline;
  const groupByCfg = view.config?.groupBy;
  const primaryField = useMemo(() => fields.find(f => f.isPrimary) ?? fields[0] ?? null, [fields]);

  const dateFields = useMemo(
    () => fields.filter(f => f.type === 'date' || f.type === 'created_time' || f.type === 'updated_time'),
    [fields],
  );

  const startField = useMemo(
    () => fields.find(f => f.id === timelineCfg?.startDateFieldId) ?? null,
    [fields, timelineCfg?.startDateFieldId],
  );

  const endField = useMemo(
    () => fields.find(f => f.id === timelineCfg?.endDateFieldId) ?? null,
    [fields, timelineCfg?.endDateFieldId],
  );

  const assigneeField = useMemo(
    () => fields.find(f => f.id === timelineCfg?.assigneeFieldId && f.type === 'person') ?? null,
    [fields, timelineCfg?.assigneeFieldId],
  );

  const colorField = useMemo(
    () => fields.find(f => f.id === timelineCfg?.colorFieldId && (f.type === 'select' || f.type === 'multi_select')) ?? null,
    [fields, timelineCfg?.colorFieldId],
  );

  const highlightedWeekdays = useMemo(() => {
    const incoming = timelineCfg?.highlightedWeekdays;
    if (!incoming || incoming.length === 0) return new Set<number>([0, 2]);
    return new Set<number>(incoming.filter(d => d >= 0 && d <= 6));
  }, [timelineCfg?.highlightedWeekdays]);

  const usersById = useMemo(() => {
    return new Map(users.map(user => [user.id, user]));
  }, [users]);

  const hasGrouping = Boolean(groupByCfg?.fieldId);
  const groupField = useMemo(
    () => fields.find(f => f.id === groupByCfg?.fieldId) ?? null,
    [fields, groupByCfg?.fieldId],
  );

  const items = useMemo<TimelineItem[]>(() => {
    if (!startField) return [];

    return records.flatMap(record => {
      const startDate = getRecordFieldDate(record, startField);
      if (!startDate) return [];

      const endDateRaw = getRecordFieldDate(record, endField) ?? startDate;
      const start = startDate <= endDateRaw ? startDate : endDateRaw;
      const end = startDate <= endDateRaw ? endDateRaw : startDate;

      const titleFv = primaryField ? record.fieldValues.find(v => v.fieldId === primaryField.id) : null;
      const title = titleFv?.textValue?.trim() || `Record #${record.rowNumber}`;
      const group = getGroupForRecord(record, hasGrouping ? groupField : null, groupByCfg?.granularity);

      return [{
        id: record.id,
        title,
        start,
        end,
        groupKey: group.key,
        groupLabel: group.label,
        assigneeIds: getRecordAssigneeIds(record, assigneeField),
        dashColor: getTimelineDashColor(record, colorField),
      }];
    });
  }, [records, startField, endField, primaryField, groupField, groupByCfg?.granularity, hasGrouping, assigneeField, colorField]);

  const groups = useMemo<TimelineGroup[]>(() => {
    if (!hasGrouping) {
      return [{ key: '__all__', label: 'All records', items }];
    }

    const grouped = new Map<string, TimelineGroup>();
    for (const item of items) {
      if (!grouped.has(item.groupKey)) {
        grouped.set(item.groupKey, { key: item.groupKey, label: item.groupLabel, items: [] });
      }
      grouped.get(item.groupKey)?.items.push(item);
    }

    return Array.from(grouped.values());
  }, [items, hasGrouping]);

  const hasMultipleGroups = hasGrouping && groups.length > 1;
  const groupHeight = Math.max(180, Math.min(900, timelineCfg?.groupHeight ?? DEFAULT_GROUP_HEIGHT));
  const paneMaxHeight = Math.max(120, groupHeight - GROUP_TITLE_HEIGHT);

  const range = useMemo(() => {
    if (items.length === 0) {
      const now = new Date();
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
    }

    let minDate = items[0].start;
    let maxDate = items[0].end;

    for (const item of items) {
      if (item.start < minDate) minDate = item.start;
      if (item.end > maxDate) maxDate = item.end;
    }

    return {
      start: startOfMonth(minDate),
      end: endOfMonth(maxDate),
    };
  }, [items]);

  const dayCount = differenceInCalendarDays(range.end, range.start) + 1;
  const timelineWidth = dayCount * DAY_CELL_WIDTH;
  const days = useMemo(
    () => Array.from({ length: dayCount }, (_, i) => new Date(range.start.getTime() + i * 24 * 60 * 60 * 1000)),
    [dayCount, range.start],
  );

  const weekSegments = useMemo(() => {
    if (days.length === 0) return [] as Array<{ startIdx: number; endIdx: number; label: string }>;

    const segments: Array<{ startIdx: number; endIdx: number; label: string }> = [];
    let segmentStartIdx = 0;
    let weekNumber = 1;

    for (let i = 0; i < days.length; i += 1) {
      const isLastDay = i === days.length - 1;
      const nextDayIsMonday = !isLastDay && days[i + 1].getDay() === 1;

      if (isLastDay || nextDayIsMonday) {
        segments.push({
          startIdx: segmentStartIdx,
          endIdx: i,
          label: `${format(days[segmentStartIdx], 'MMM')} Week ${weekNumber}`,
        });
        segmentStartIdx = i + 1;
        weekNumber += 1;
      }
    }

    return segments;
  }, [days]);

  const today = startOfDay(new Date());
  const todayOffset = differenceInCalendarDays(today, range.start);
  const showTodayLine = todayOffset >= 0 && todayOffset < dayCount;

  useEffect(() => {
    const targetLeft = showTodayLine
      ? Math.max(0, todayOffset * DAY_CELL_WIDTH - DAY_CELL_WIDTH * 3)
      : 0;

    for (const pane of Object.values(timelinePaneRefs.current)) {
      if (!pane) continue;
      pane.scrollLeft = targetLeft;
    }
  }, [groups, showTodayLine, todayOffset]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 size={22} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (dateFields.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground p-8">
        <GanttChart size={44} className="opacity-30" />
        <p className="text-sm font-semibold">No date fields available</p>
        <p className="text-xs text-center max-w-md">
          Add a Date field first, then configure Start date and End date in Edit view to render the timeline.
        </p>
      </div>
    );
  }

  if (!startField) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground p-8">
        <GanttChart size={44} className="opacity-30" />
        <p className="text-sm font-semibold">Start date field is not configured</p>
        <p className="text-xs text-center max-w-md">
          Open Edit view and choose a Start date field in Timeline settings.
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground p-8">
        <GanttChart size={44} className="opacity-30" />
        <p className="text-sm font-semibold">No records mapped to timeline</p>
        <p className="text-xs text-center max-w-md">
          Records appear here when they have values in the selected Start date field.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 max-h-[calc(100vh-90px)] overflow-y-auto flex-col gap-4 p-4 overflow-y-auto overflow-x-hidden">
      {groups.map((group) => {
        return (
          <section
            key={group.key}
            className="rounded-lg border bg-card min-w-0 overflow-hidden flex flex-col"
            style={hasMultipleGroups ? { maxHeight: groupHeight } : undefined}
          >
            <div className="px-3 py-2 border-b bg-muted/40 flex items-center justify-between">
              <div className="text-sm font-semibold uppercase tracking-wide">{group.label}</div>
              <span className="text-xs px-2 py-1 rounded bg-foreground text-background">
                {group.items.length} booked
              </span>
            </div>

            <div
              className={hasMultipleGroups ? 'overflow-x-auto overflow-y-auto min-h-0' : 'overflow-x-auto min-h-0'}
              style={hasMultipleGroups ? { maxHeight: paneMaxHeight } : undefined}
              ref={(el) => {
                timelinePaneRefs.current[group.key] = el;
              }}
            >
              <div style={{ minWidth: timelineWidth }}>
                <div
                  className="sticky top-0 z-20 border-b bg-card"
                  style={{ width: timelineWidth }}
                >
                  <div className="flex border-b">
                    {weekSegments.map((segment) => {
                      const width = (segment.endIdx - segment.startIdx + 1) * DAY_CELL_WIDTH;
                      return (
                        <div
                          key={`${segment.startIdx}-${segment.endIdx}`}
                          className="h-10 shrink-0 px-3 text-[15px] font-semibold text-foreground/90 flex items-center border-r"
                          style={{ width }}
                        >
                          {segment.label}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex">
                    {days.map(day => (
                      <div
                        key={day.toISOString()}
                        className="h-10 shrink-0 text-[13px] font-medium text-foreground/90 flex items-center justify-center"
                        style={{
                          width: DAY_CELL_WIDTH,
                          ...BASE_COLUMN_STYLE,
                        }}
                      >
                        {`${WEEKDAY_LABEL[day.getDay()]} ${format(day, 'd')}`}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="">
                  {group.items.map(item => {
                    const bar = getBarPosition(item.start, item.end, range.start, dayCount);

                    return (
                      <div
                        key={item.id}
                        className="grid"
                        style={{ gridTemplateColumns: `${timelineWidth}px` }}
                      >
                        <div className="relative" style={{ height: ROW_HEIGHT }}>
                          {days.map((day, idx) => (
                            <div
                              key={`${item.id}-${day.toISOString()}-hl`}
                              className="absolute top-0 bottom-0"
                              style={{
                                left: idx * DAY_CELL_WIDTH,
                                width: DAY_CELL_WIDTH,
                                ...(highlightedWeekdays.has(day.getDay()) ? HIGHLIGHT_COLUMN_STYLE : BASE_COLUMN_STYLE),
                              }}
                            />
                          ))}

                          <div
                            className="absolute inset-0"
                            style={{
                              backgroundImage: 'linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px)',
                              backgroundSize: `${DAY_CELL_WIDTH}px 100%`,
                            }}
                          />

                          {showTodayLine && (
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-blue-500"
                              style={{ left: todayOffset * DAY_CELL_WIDTH + DAY_CELL_WIDTH / 2 }}
                            />
                          )}

                          <div
                            className="absolute top-2 rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white shadow-md"
                            style={{ left: bar.left, width: Math.max(180, bar.width), minHeight: ROW_HEIGHT - 16 }}
                            title={`${item.title} (${format(item.start, 'MMM d')} - ${format(item.end, 'MMM d')})`}
                          >
                            <div
                              className="h-1 w-8 rounded-full mb-2"
                              style={{ backgroundColor: item.dashColor }}
                            />
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate text-foreground">{item.title}</p>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {format(item.start, 'MMM d')} - {format(item.end, 'MMM d')}
                                </p>
                              </div>

                              {assigneeField && item.assigneeIds.length > 0 && (
                                <div className="flex items-center -space-x-2 shrink-0">
                                  {item.assigneeIds.slice(0, 4).map((userId) => {
                                    const user = usersById.get(userId);
                                    if (user?.avatarUrl) {
                                      return (
                                        <img
                                          key={userId}
                                          src={user.avatarUrl}
                                          alt={user.name}
                                          className="w-6 h-6 rounded-full border-2 border-background object-cover"
                                        />
                                      );
                                    }

                                    const fallbackName = user?.name ?? userId;
                                    const fallbackColor = getAvatarColor(fallbackName);
                                    return (
                                      <span
                                        key={userId}
                                        className="w-6 h-6 rounded-full border-2 border-background text-[10px] font-semibold flex items-center justify-center"
                                        style={{ background: `${fallbackColor}22`, color: fallbackColor }}
                                      >
                                        {getAvatarFallback(fallbackName)}
                                      </span>
                                    );
                                  })}

                                  {item.assigneeIds.length > 4 && (
                                    <span className="w-6 h-6 rounded-full border-2 border-background bg-muted text-[10px] font-semibold flex items-center justify-center">
                                      +{item.assigneeIds.length - 4}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
