import { useState } from 'react';
import {
  Table2, Kanban, CalendarDays, GanttChart, Plus, MoreVertical,
  Star, Pencil, Trash2, Check, Settings2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ICON_OPTIONS, getIconByName } from '../../constants';
import type {
  DynView,
  DynViewType,
  Field,
  ViewCalendarConfig,
  ViewConfig,
  ViewGroupByConfig,
} from '../../types';

const VIEW_TYPE_META: Record<DynViewType, { label: string; Icon: React.FC<{ size?: number; className?: string }> }> = {
  spreadsheet: { label: 'Spreadsheet', Icon: Table2 },
  kanban: { label: 'Kanban', Icon: Kanban },
  calendar: { label: 'Calendar', Icon: CalendarDays },
  timeline: { label: 'Timeline', Icon: GanttChart },
};

const GROUPBY_FIELD_TYPES: Array<ViewGroupByConfig['fieldType']> = [
  'select', 'multi_select', 'date', 'created_time', 'updated_time',
];
const DATE_LIKE_TYPES: Array<ViewGroupByConfig['fieldType']> = ['date', 'created_time', 'updated_time'];
const GRANULARITIES: Array<NonNullable<ViewGroupByConfig['granularity']>> = ['day', 'month', 'quarter'];
const CALENDAR_MODE_OPTIONS: Array<NonNullable<ViewCalendarConfig['mode']>> = ['month', 'week'];

interface ViewManagerTabBarProps {
  views: DynView[];
  activeView: DynView | null;
  fields: Field[];
  onSelectView: (view: DynView) => void;
  onCreateView: (name: string, type: DynViewType) => void;
  onUpdateView: (viewId: string, patch: { name?: string; icon?: string | null; config?: ViewConfig }) => void;
  onMoveView: (viewId: string, direction: 'left' | 'right') => void;
  onRenameView: (viewId: string, name: string) => void;
  onDeleteView: (viewId: string) => void;
  onSetDefault: (viewId: string) => void;
}

// ─── Edit View Dialog ─────────────────────────────────────────────────────────

interface EditViewDialogProps {
  view: DynView;
  fields: Field[];
  isDefault: boolean;
  onClose: () => void;
  onSave: (viewId: string, patch: { name?: string; icon?: string | null; config?: ViewConfig }) => void;
  onSetDefault: (viewId: string) => void;
}

function EditViewDialog({ view, fields, isDefault, onClose, onSave, onSetDefault }: EditViewDialogProps) {
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
  const [granularity, setGranularity] = useState<NonNullable<ViewGroupByConfig['granularity']>>(
    view.config?.groupBy?.granularity ?? 'day'
  );
  const [makeDefault, setMakeDefault] = useState(isDefault);
  // field visibility (kanban / calendar / timeline only)
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
  const selectedGroupField = groupableFields.find(f => f.id === groupByFieldId) ?? null;
  const isDateLike = selectedGroupField
    ? DATE_LIKE_TYPES.includes(selectedGroupField.type as ViewGroupByConfig['fieldType'])
    : false;

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

    if (view.type !== 'spreadsheet') {
      config.hiddenFieldIds = hiddenFieldIds.size > 0 ? Array.from(hiddenFieldIds) : undefined;
    }
    onSave(view.id, { name: name.trim() || view.name, icon: selectedIcon, config });
    if (makeDefault && !isDefault) onSetDefault(view.id);
    onClose();
  };

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit view</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          {/* Name */}
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

          {/* Icon */}
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
                –
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

          {/* Group by — shown for non-spreadsheet views */}
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
                    <SelectTrigger className="h-8 text-sm">
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
                        <SelectTrigger className="h-8 text-sm">
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

          {/* Calendar date mapping */}
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

          {/* Field visibility (kanban / timeline) */}
          {(view.type === 'kanban' || view.type === 'timeline') && fields.filter(f => !f.isPrimary && f.type !== 'id').length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Fields shown on cards</label>
              <div className="flex flex-col gap-1">
                {fields.filter(f => !f.isPrimary && f.type !== 'id').map(f => (
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

          {/* Default */}
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

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!name.trim()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ViewManagerTabBar({
  views,
  activeView,
  fields,
  onSelectView,
  onCreateView,
  onUpdateView,
  onMoveView,
  onRenameView,
  onDeleteView,
  onSetDefault,
}: ViewManagerTabBarProps) {
  const [renamingViewId, setRenamingViewId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const [editingView, setEditingView] = useState<DynView | null>(null);
  const [deletingViewId, setDeletingViewId] = useState<string | null>(null);

  const getNextViewName = (type: DynViewType) => {
    const baseName = VIEW_TYPE_META[type].label;
    const normalizedNames = new Set(views.map(v => v.name.trim().toLowerCase()));
    if (!normalizedNames.has(baseName.toLowerCase())) return baseName;

    let i = 2;
    while (normalizedNames.has(`${baseName} ${i}`.toLowerCase())) i += 1;
    return `${baseName} ${i}`;
  };

  const handleRenameSubmit = () => {
    if (!renamingViewId || !renameValue.trim()) { setRenamingViewId(null); return; }
    onRenameView(renamingViewId, renameValue.trim());
    setRenamingViewId(null);
  };

  return (
    <>
      <div className="flex items-center gap-0.5 px-2 border-b overflow-x-auto shrink-0">
        {views.map((view, idx) => {
          const { Icon } = VIEW_TYPE_META[view.type] ?? VIEW_TYPE_META.spreadsheet;
          const IconOverride = view.icon ? getIconByName(view.icon) : null;
          const DisplayIcon = IconOverride ?? Icon;
          const isActive = activeView?.id === view.id;
          const isFirst = idx === 0;
          const isLast = idx === views.length - 1;

          return (
            <div key={view.id} className="flex items-center group shrink-0">
              {renamingViewId === view.id ? (
                <Input
                  autoFocus
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onBlur={handleRenameSubmit}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleRenameSubmit();
                    if (e.key === 'Escape') setRenamingViewId(null);
                  }}
                  className="h-7 w-32 text-xs px-2 my-1"
                />
              ) : (
                <button
                  onClick={() => onSelectView(view)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                  }`}
                >
                  <DisplayIcon size={13} />
                  <span>{view.name}</span>
                  {view.isDefault && <Star size={10} className="fill-current opacity-60" />}
                </button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted transition-all">
                    <MoreVertical size={12} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44">
                  <DropdownMenuItem onClick={() => setEditingView(view)}>
                    <Settings2 size={13} className="mr-2" /> Edit view
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setRenamingViewId(view.id); setRenameValue(view.name); }}>
                    <Pencil size={13} className="mr-2" /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled={isFirst} onClick={() => onMoveView(view.id, 'left')}>
                    <ChevronLeft size={13} className="mr-2" /> Move left
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={isLast} onClick={() => onMoveView(view.id, 'right')}>
                    <ChevronRight size={13} className="mr-2" /> Move right
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {!view.isDefault && (
                    <DropdownMenuItem onClick={() => onSetDefault(view.id)}>
                      <Star size={13} className="mr-2" /> Set as default
                    </DropdownMenuItem>
                  )}
                  {view.isDefault && (
                    <DropdownMenuItem disabled>
                      <Check size={13} className="mr-2" /> Default view
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={views.length <= 1 || view.isDefault}
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeletingViewId(view.id)}
                  >
                    <Trash2 size={13} className="mr-2" /> Delete view
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="ml-1 h-7 px-2 text-xs text-muted-foreground shrink-0"
            >
              <Plus size={13} /> Add view
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            {(Object.entries(VIEW_TYPE_META) as [DynViewType, typeof VIEW_TYPE_META[DynViewType]][]).map(([type, { label, Icon }]) => (
              <DropdownMenuItem
                key={type}
                onClick={() => onCreateView(getNextViewName(type), type)}
                className="flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Icon size={14} />
                  <span>{label}</span>
                </span>
                {activeView?.type === type && <Check size={14} className="text-foreground" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Edit view dialog */}
      {editingView && (
        <EditViewDialog
          view={editingView}
          fields={fields}
          isDefault={editingView.isDefault}
          onClose={() => setEditingView(null)}
          onSave={onUpdateView}
          onSetDefault={onSetDefault}
        />
      )}

      {/* Delete view confirmation */}
      <AlertDialog open={!!deletingViewId} onOpenChange={open => { if (!open) setDeletingViewId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete view?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{views.find(v => v.id === deletingViewId)?.name}</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingViewId) onDeleteView(deletingViewId);
                setDeletingViewId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
