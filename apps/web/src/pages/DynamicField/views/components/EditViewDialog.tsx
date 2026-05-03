import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ICON_OPTIONS } from '../../constants';
import type {
  DynView,
  Field,
  ViewCalendarConfig,
  ViewConfig,
  ViewGroupByConfig,
} from '../../types';

const GROUPBY_FIELD_TYPES: Array<ViewGroupByConfig['fieldType']> = [
  'select', 'multi_select', 'date', 'created_time', 'updated_time',
];
const DATE_LIKE_TYPES: Array<ViewGroupByConfig['fieldType']> = ['date', 'created_time', 'updated_time'];
const GRANULARITIES: Array<NonNullable<ViewGroupByConfig['granularity']>> = ['day', 'month', 'quarter'];
const CALENDAR_MODE_OPTIONS: Array<NonNullable<ViewCalendarConfig['mode']>> = ['month', 'week'];
const DEFAULT_TIMELINE_GROUP_HEIGHT = 300;
const WEEKDAY_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

interface EditViewDialogProps {
  view: DynView;
  fields: Field[];
  isDefault: boolean;
  onClose: () => void;
  onSave: (viewId: string, patch: { name?: string; icon?: string | null; config?: ViewConfig }) => void;
  onSetDefault: (viewId: string) => void;
}

export function EditViewDialog({ view, fields, isDefault, onClose, onSave, onSetDefault }: EditViewDialogProps) {
  const [name, setName] = useState(view.name);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(view.icon ?? null);
  const [groupByFieldId, setGroupByFieldId] = useState<string>(view.config?.groupBy?.fieldId ?? '');
  const [calendarStartDateFieldId, setCalendarStartDateFieldId] = useState<string>(
    view.config?.calendar?.startDateFieldId ?? ''
  );
  const [calendarEndDateFieldId, setCalendarEndDateFieldId] = useState<string>(
    view.config?.calendar?.endDateFieldId ?? ''
  );
  const [calendarMode, setCalendarMode] = useState<NonNullable<ViewCalendarConfig['mode']>>(
    view.config?.calendar?.mode ?? 'month'
  );
  const [timelineStartDateFieldId, setTimelineStartDateFieldId] = useState<string>(
    view.config?.timeline?.startDateFieldId ?? ''
  );
  const [timelineEndDateFieldId, setTimelineEndDateFieldId] = useState<string>(
    view.config?.timeline?.endDateFieldId ?? ''
  );
  const [timelineGroupHeight, setTimelineGroupHeight] = useState<string>(
    String(view.config?.timeline?.groupHeight ?? DEFAULT_TIMELINE_GROUP_HEIGHT)
  );
  const [timelineAssigneeFieldId, setTimelineAssigneeFieldId] = useState<string>(
    view.config?.timeline?.assigneeFieldId ?? ''
  );
  const [timelineColorFieldId, setTimelineColorFieldId] = useState<string>(
    view.config?.timeline?.colorFieldId ?? ''
  );
  const [timelineHighlightedWeekdays, setTimelineHighlightedWeekdays] = useState<Set<number>>(
    new Set(view.config?.timeline?.highlightedWeekdays ?? [0, 2])
  );
  const [granularity, setGranularity] = useState<NonNullable<ViewGroupByConfig['granularity']>>(
    view.config?.groupBy?.granularity ?? 'day'
  );
  const [makeDefault, setMakeDefault] = useState(isDefault);
  const [hiddenFieldIds, setHiddenFieldIds] = useState<Set<string>>(
    new Set(view.config?.hiddenFieldIds ?? [])
  );

  const toggleField = (fieldId: string) =>
    setHiddenFieldIds(prev => {
      const next = new Set(prev);
      if (next.has(fieldId)) next.delete(fieldId); else next.add(fieldId);
      return next;
    });

  const groupableFields = fields.filter(f => GROUPBY_FIELD_TYPES.includes(f.type as ViewGroupByConfig['fieldType']));
  const calendarDateFields = fields.filter(
    f => f.type === 'date' || f.type === 'created_time' || f.type === 'updated_time'
  );
  const personFields = fields.filter(f => f.type === 'person');
  const selectLikeFields = fields.filter(f => f.type === 'select' || f.type === 'multi_select');
  const cardVisibleFields = fields.filter(f => !f.isPrimary && f.type !== 'id');
  const selectedGroupField = groupableFields.find(f => f.id === groupByFieldId) ?? null;
  const isDateLike = selectedGroupField
    ? DATE_LIKE_TYPES.includes(selectedGroupField.type as ViewGroupByConfig['fieldType'])
    : false;

  const toggleHighlightedWeekday = (weekday: number) => {
    setTimelineHighlightedWeekdays(prev => {
      const next = new Set(prev);
      if (next.has(weekday)) next.delete(weekday); else next.add(weekday);
      return next;
    });
  };

  const handleSave = () => {
    const config: ViewConfig = { ...(view.config ?? {}) };
    if (groupByFieldId && selectedGroupField) {
      config.groupBy = {
        fieldId: groupByFieldId,
        fieldType: selectedGroupField.type as ViewGroupByConfig['fieldType'],
        ...(isDateLike ? { granularity } : {}),
      };
    } else {
      delete config.groupBy;
    }

    if (view.type === 'calendar') {
      config.calendar = {
        mode: calendarMode,
        ...(calendarStartDateFieldId ? { startDateFieldId: calendarStartDateFieldId } : {}),
        ...(calendarEndDateFieldId ? { endDateFieldId: calendarEndDateFieldId } : {}),
      };
    } else {
      delete config.calendar;
    }

    if (view.type === 'timeline') {
      const parsedHeight = Number.parseInt(timelineGroupHeight, 10);
      const normalizedGroupHeight = Number.isFinite(parsedHeight)
        ? Math.max(180, Math.min(900, parsedHeight))
        : DEFAULT_TIMELINE_GROUP_HEIGHT;

      config.timeline = {
        groupHeight: normalizedGroupHeight,
        ...(timelineStartDateFieldId ? { startDateFieldId: timelineStartDateFieldId } : {}),
        ...(timelineEndDateFieldId ? { endDateFieldId: timelineEndDateFieldId } : {}),
        ...(timelineAssigneeFieldId ? { assigneeFieldId: timelineAssigneeFieldId } : {}),
        ...(timelineColorFieldId ? { colorFieldId: timelineColorFieldId } : {}),
        highlightedWeekdays: timelineHighlightedWeekdays.size > 0
          ? Array.from(timelineHighlightedWeekdays).sort((a, b) => a - b)
          : [],
      };
    } else {
      delete config.timeline;
    }

    if (view.type !== 'spreadsheet') {
      config.hiddenFieldIds = hiddenFieldIds.size > 0 ? Array.from(hiddenFieldIds) : undefined;
    }

    onSave(view.id, { name: name.trim() || view.name, icon: selectedIcon, config });
    if (makeDefault && !isDefault) onSetDefault(view.id);
    onClose();
  };

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm h-[85vh] max-h-[85vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader>
          <div className="px-6 pt-6 pb-3 border-b bg-background">
            <DialogTitle>Edit view</DialogTitle>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0" type="always">
          <div className="flex flex-col gap-4 px-6 py-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">Name</label>
            <Input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
              className="h-8 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">Icon</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setSelectedIcon(null)}
                className={`flex items-center justify-center w-8 h-8 rounded border text-xs transition-colors ${
                  !selectedIcon ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'
                }`}
                title="None"
              >
                -
              </button>
              {ICON_OPTIONS.map(({ name: iconName, Icon }) => (
                <button
                  key={iconName}
                  onClick={() => setSelectedIcon(iconName)}
                  className={`flex items-center justify-center w-8 h-8 rounded border transition-colors ${
                    selectedIcon === iconName ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'
                  }`}
                  title={iconName}
                >
                  <Icon size={15} />
                </button>
              ))}
            </div>
          </div>

          {view.type !== 'spreadsheet' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Group by</label>
              {groupableFields.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No groupable fields. Add a Select, Multi-select, or Date field.
                </p>
              ) : (
                <>
                  <Select
                    value={groupByFieldId || '__none__'}
                    onValueChange={v => setGroupByFieldId(v === '__none__' ? '' : v)}
                  >
                    <SelectTrigger className="h-8 w-full text-sm">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {groupableFields.map(f => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                          <span className="text-muted-foreground text-xs ml-1">({f.type.replace('_', ' ')})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {isDateLike && groupByFieldId && (
                    <div className="flex flex-col gap-1 mt-1">
                      <label className="text-xs font-medium">Granularity</label>
                      <Select
                        value={granularity}
                        onValueChange={v => setGranularity(v as NonNullable<ViewGroupByConfig['granularity']>)}
                      >
                        <SelectTrigger className="h-8 w-full text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GRANULARITIES.map(g => (
                            <SelectItem key={g} value={g}>
                              {g.charAt(0).toUpperCase() + g.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {view.type === 'calendar' && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium">Calendar settings</label>
              {calendarDateFields.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No date fields available. Add a Date field, then set a Start date field here.
                </p>
              ) : (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Start date field</label>
                    <Select
                      value={calendarStartDateFieldId || '__none__'}
                      onValueChange={v => setCalendarStartDateFieldId(v === '__none__' ? '' : v)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select start date field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {calendarDateFields.map(f => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name}
                            <span className="text-muted-foreground text-xs ml-1">({f.type.replace('_', ' ')})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">End date field (optional)</label>
                    <Select
                      value={calendarEndDateFieldId || '__none__'}
                      onValueChange={v => setCalendarEndDateFieldId(v === '__none__' ? '' : v)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Same as start date" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Same as start date</SelectItem>
                        {calendarDateFields.map(f => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name}
                            <span className="text-muted-foreground text-xs ml-1">({f.type.replace('_', ' ')})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Default mode</label>
                    <Select
                      value={calendarMode}
                      onValueChange={v => setCalendarMode(v as NonNullable<ViewCalendarConfig['mode']>)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CALENDAR_MODE_OPTIONS.map(mode => (
                          <SelectItem key={mode} value={mode}>
                            {mode.charAt(0).toUpperCase() + mode.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          )}

          {view.type === 'timeline' && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium">Timeline settings</label>
              {calendarDateFields.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No date fields available. Add a Date field, then set Start date and End date fields here.
                </p>
              ) : (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Start date field</label>
                    <Select
                      value={timelineStartDateFieldId || '__none__'}
                      onValueChange={v => setTimelineStartDateFieldId(v === '__none__' ? '' : v)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select start date field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {calendarDateFields.map(f => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name}
                            <span className="text-muted-foreground text-xs ml-1">({f.type.replace('_', ' ')})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">End date field</label>
                    <Select
                      value={timelineEndDateFieldId || '__none__'}
                      onValueChange={v => setTimelineEndDateFieldId(v === '__none__' ? '' : v)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Same as start date" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Same as start date</SelectItem>
                        {calendarDateFields.map(f => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name}
                            <span className="text-muted-foreground text-xs ml-1">({f.type.replace('_', ' ')})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Max group height (px)</label>
                    <Input
                      type="number"
                      min={180}
                      max={900}
                      step={10}
                      value={timelineGroupHeight}
                      onChange={e => setTimelineGroupHeight(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Applied only when Timeline has grouping and more than one group. Rows scroll vertically after this height.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Assignee field (person)</label>
                    <Select
                      value={timelineAssigneeFieldId || '__none__'}
                      onValueChange={v => setTimelineAssigneeFieldId(v === '__none__' ? '' : v)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {personFields.map(f => (
                          <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Dash color field (select)</label>
                    <Select
                      value={timelineColorFieldId || '__none__'}
                      onValueChange={v => setTimelineColorFieldId(v === '__none__' ? '' : v)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {selectLikeFields.map(f => (
                          <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground">Highlight weekdays</label>
                    <div className="grid grid-cols-2 gap-1">
                      {WEEKDAY_OPTIONS.map(opt => (
                        <label key={opt.value} className="flex items-center justify-between rounded border px-2 py-1.5 text-xs">
                          <span>{opt.label}</span>
                          <Switch
                            checked={timelineHighlightedWeekdays.has(opt.value)}
                            onCheckedChange={() => toggleHighlightedWeekday(opt.value)}
                          />
                        </label>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Defaults to Sunday and Tuesday.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {(view.type === 'timeline') && cardVisibleFields.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Fields shown on cards</label>
              <div className="grid grid-cols-2 gap-1">
                {cardVisibleFields.map(f => (
                  <div key={f.id} className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted">
                    <span className="text-xs">{f.name}</span>
                    <Switch
                      checked={!hiddenFieldIds.has(f.id)}
                      onCheckedChange={() => toggleField(f.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium">Default view</span>
              <span className="text-xs text-muted-foreground">Open first when entering this database</span>
            </div>
            <Switch
              checked={makeDefault}
              onCheckedChange={setMakeDefault}
              disabled={isDefault}
            />
          </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t bg-background">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!name.trim()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
