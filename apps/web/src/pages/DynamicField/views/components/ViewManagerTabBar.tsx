import { useEffect, useRef, useState } from 'react';
import {
  Table2, Kanban, CalendarDays, GanttChart, Plus, MoreVertical,
  Star, Pencil, Trash2, Check, Settings2, ChevronLeft, ChevronRight, Palette, Filter, ArrowUpDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getIconByName } from '../../constants';
import { EditViewDialog } from './EditViewDialog';
import { CustomizeKanbanCardDialog } from './CustomizeKanbanCardDialog';
import { FilterBuilder, countRules } from '../filter';
import { SortBuilder } from '../sort';
import type {
  DynView,
  DynViewType,
  Field,
  ViewConfig,
} from '../../types';
import type { ViewFilter } from '../filter';

const VIEW_TYPE_META: Record<DynViewType, { label: string; Icon: React.FC<{ size?: number; className?: string }> }> = {
  spreadsheet: { label: 'Spreadsheet', Icon: Table2 },
  kanban: { label: 'Kanban', Icon: Kanban },
  calendar: { label: 'Calendar', Icon: CalendarDays },
  timeline: { label: 'Timeline', Icon: GanttChart },
};

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
  const filterSaveTimerRef = useRef<number | null>(null);

  const [editingView, setEditingView] = useState<DynView | null>(null);
  const [customizingView, setCustomizingView] = useState<DynView | null>(null);
  const [deletingViewId, setDeletingViewId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

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

  useEffect(() => {
    return () => {
      if (filterSaveTimerRef.current !== null) {
        window.clearTimeout(filterSaveTimerRef.current);
      }
    };
  }, []);

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
                  {view.type === 'kanban' && (
                    <DropdownMenuItem onClick={() => setCustomizingView(view)}>
                      <Palette size={13} className="mr-2" /> Customize Card
                    </DropdownMenuItem>
                  )}
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

      {/* ── Toolbar row (Filter / Sort / …) ───────────────────── */}
      {activeView && (
        <div className="flex items-center gap-1 px-2 py-1 border-b">
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={activeView.config?.filter && countRules(activeView.config.filter) > 0 ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2 text-xs gap-1.5"
              >
                <Filter size={12} />
                Filter
                {activeView.config?.filter && countRules(activeView.config.filter) > 0 && (
                  <span className="ml-0.5 rounded-full bg-primary text-primary-foreground text-[10px] w-4 h-4 flex items-center justify-center font-semibold">
                    {countRules(activeView.config.filter)}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="p-0 w-auto"
              align="start"
              side="bottom"
              sideOffset={4}
            >
              <FilterBuilder
                view={activeView}
                fields={fields}
                onChange={filter => {
                  if (filterSaveTimerRef.current !== null) {
                    window.clearTimeout(filterSaveTimerRef.current);
                  }

                  filterSaveTimerRef.current = window.setTimeout(() => {
                    onUpdateView(activeView.id, {
                      config: { ...(activeView.config ?? {}), filter: filter as ViewFilter },
                    });
                  }, 1000);
                }}
              />
            </PopoverContent>
          </Popover>

          <Popover open={sortOpen} onOpenChange={setSortOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={Array.isArray(activeView.config?.sort) && activeView.config.sort.length > 0 ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2 text-xs gap-1.5"
              >
                <ArrowUpDown size={12} />
                Sort
                {Array.isArray(activeView.config?.sort) && activeView.config.sort.length > 0 && (
                  <span className="ml-0.5 rounded-full bg-primary text-primary-foreground text-[10px] w-4 h-4 flex items-center justify-center font-semibold">
                    {activeView.config.sort.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="p-0 w-auto"
              align="start"
              side="bottom"
              sideOffset={4}
            >
              <SortBuilder
                view={activeView}
                fields={fields}
                onChange={sort => {
                  onUpdateView(activeView.id, {
                    config: { ...(activeView.config ?? {}), sort },
                  });
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

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

      {customizingView && (
        <CustomizeKanbanCardDialog
          view={customizingView}
          fields={fields}
          onClose={() => setCustomizingView(null)}
          onSave={onUpdateView}
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
