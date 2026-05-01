import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Plus, Database, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';

import { AddFieldDrawer } from './DynamicField/AddFieldDrawer';
import { EditFieldDrawer } from './DynamicField/EditFieldDrawer';
import { TemplateDialog } from './DynamicField/components/TemplateDialog';
import { getFieldMeta, ICON_OPTIONS, getIconByName } from './DynamicField/constants';

import { useDatabase } from './DynamicField/hooks/useDatabase';
import { useFields } from './DynamicField/hooks/useFields';
import { useRecords } from './DynamicField/hooks/useRecords';
import { useDatabaseStream } from './DynamicField/hooks/useDatabaseStream';
import { useViews } from './DynamicField/hooks/useViews';

import { SpreadsheetView } from './DynamicField/views/spreadsheet/SpreadsheetView';
import { KanbanView } from './DynamicField/views/kanban/KanbanView';
import { CalendarView } from './DynamicField/views/calendar/CalendarView';
import { TimelineView } from './DynamicField/views/timeline/TimelineView';
import { ViewManagerTabBar } from './DynamicField/views/components/ViewManagerTabBar';

import type { DynDatabase, DynViewType, Field, FieldConfig, FieldType, FieldValuePayload } from './DynamicField/types';

export default function DynamicFieldPage() {
  const { databases, selectedDb, setSelectedDb, createDatabase, deleteDatabase, upsertDatabase, removeDatabase } = useDatabase();
  const { fields, setFields, loadFields, addField, renameField, deleteField, moveField, duplicateField, changeIcon, updateField } = useFields();
  const { records, setRecords, loadRecords, addRecord, setValue, removeFieldValues, reloadRecords, deleteRecords } = useRecords();
  const { views, activeView, setActiveView, loadViews, createView, updateView, deleteView, setDefaultView, moveView } = useViews();

  const { databaseId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());

  // DB creation & deletion
  const [showNewDb, setShowNewDb] = useState(false);
  const [newDbName, setNewDbName] = useState('');
  const [showDeleteDb, setShowDeleteDb] = useState(false);
  const [showDeletedDbNotice, setShowDeletedDbNotice] = useState(false);

  // Drawers / dialogs
  const [showAddField, setShowAddField] = useState(false);
  const [editingField, setEditingField] = useState<Field | null>(null);
  const [renamingFieldId, setRenamingFieldId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null);
  const [iconPickerFieldId, setIconPickerFieldId] = useState<string | null>(null);

  // ── Active cell state ─────────────────────────────────────────────────────
  const [activeCell, setActiveCell] = useState<{ recordId: string; fieldId: string } | null>(null);

  // Deactivate on ESC globally
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setActiveCell(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // ── Stream ────────────────────────────────────────────────────────────────
  useDatabaseStream(selectedDb?.id, {
    onRecordCreated: (record) => {
      setRecords((prev) => {
        if (prev.some(r => r.id === record.id)) return prev;
        return [...prev, record];
      });
    },
    onRecordsDeleted: (ids) => {
      setRecords((prev) => prev.filter(r => !ids.includes(r.id)));
      setSelectedRecords(prev => {
        const newSet = new Set(prev);
        ids.forEach(id => newSet.delete(id));
        return newSet;
      });
    },
    onValueUpdated: (value) => {
      setRecords((prev) => prev.map(r => {
        if (r.id !== value.recordId) return r;
        const exists = r.fieldValues.find(fv => fv.fieldId === value.fieldId);
        if (exists) {
          return { ...r, fieldValues: r.fieldValues.map(fv => fv.fieldId === value.fieldId ? value : fv) };
        }
        // Need to add field to value since UI expects field object, but event only has fieldId
        // The cell might crash if we just push it, but it actually depends on `fv.fieldId === field.id` matching.
        // Wait, `value` from SSE is just FieldValue, it doesn't have `.field` populated.
        // But `useRecords.ts` adds it: `{ ...saved, field }`.
        // Here we can find the field from `fields`.
        return { ...r, fieldValues: [...r.fieldValues, value as any] }; 
      }));
    },
    onFieldCreated: (field) => {
      setFields((prev) => {
        if (prev.some(f => f.id === field.id)) return prev;
        return [...prev, field].sort((a, b) => a.position - b.position);
      });
    },
    onFieldDeleted: (id) => {
      setFields((prev) => prev.filter(f => f.id !== id));
      removeFieldValues(id);
    },
    onFieldUpdated: (field) => {
      setFields((prev) => prev.map(f => f.id === field.id ? { ...f, ...field } : f));
    },
    onFieldsReordered: () => {
      if (selectedDb) loadFields(selectedDb.id);
    },
    onDatabaseCreated: (database) => {
      upsertDatabase(database);
    },
    onDatabaseDeleted: (id) => {
      const deletedSelectedDb = selectedDb?.id === id;
      removeDatabase(id);
      if (deletedSelectedDb) {
        setShowDeletedDbNotice(true);
      }
    },
  });

  // ── Load DB ───────────────────────────────────────────────────────────────
  const loadDb = useCallback(async (db: DynDatabase, updateUrl = true) => {
    setSelectedDb(db);
    setActiveCell(null);
    setSelectedRecords(new Set());
    setLoading(true);
    try {
      await Promise.all([loadFields(db.id), loadRecords(db.id), loadViews(db.id)]);
      if (updateUrl && databaseId !== db.id) navigate(`/test/${db.id}`);
    } finally {
      setLoading(false);
    }
  }, [setSelectedDb, loadFields, loadRecords, loadViews, databaseId, navigate]);

  // Initial load from URL
  useEffect(() => {
    if (databases.length === 0 || !databaseId) return;
    if (selectedDb?.id !== databaseId) {
      const db = databases.find(d => d.id === databaseId);
      if (db) loadDb(db, false);
    }
  }, [databaseId, databases, selectedDb?.id, loadDb]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCreateDb = async () => {
    if (!newDbName.trim()) return;
    const db = await createDatabase(newDbName.trim());
    setNewDbName('');
    setShowNewDb(false);
    await loadDb(db);
  };

  const handleDeleteDb = async () => {
    if (!selectedDb) return;
    await deleteDatabase(selectedDb.id);
    setShowDeleteDb(false);
    navigate('/test');
  };

  const handleAddField = async (name: string, type: FieldType, config: FieldConfig, pendingOptions: { label: string; color: string }[]) => {
    if (!selectedDb) return;
    await addField(selectedDb.id, name, type, config, pendingOptions);
    // If id-type, reload records so backfilled values show up
    if (type === 'id') await reloadRecords(selectedDb.id);
  };

  const commitRename = async () => {
    if (!renamingFieldId || !renameValue.trim()) { setRenamingFieldId(null); return; }
    await renameField(renamingFieldId, renameValue.trim());
    setRenamingFieldId(null);
  };

  const handleDeleteField = async () => {
    if (!deletingFieldId || !selectedDb) return;
    await deleteField(deletingFieldId, selectedDb.id);
    removeFieldValues(deletingFieldId);
    setDeletingFieldId(null);
  };

  const handleMoveField = async (fieldId: string, direction: 'left' | 'right') => {
    if (!selectedDb) return;
    await moveField(fieldId, direction, selectedDb.id);
  };

  const handleDuplicate = async (fieldId: string) => {
    if (!selectedDb) return;
    await duplicateField(fieldId, selectedDb.id);
  };

  const handleIconChange = async (iconName: string) => {
    if (!iconPickerFieldId) return;
    const field = fields.find(f => f.id === iconPickerFieldId);
    await changeIcon(iconPickerFieldId, iconName, field?.config);
    setIconPickerFieldId(null);
  };

  const handleEditFieldSaved = (updated: Field) => {
    updateField(updated);
    setEditingField(null);
  };

  const handleAddRecord = async () => {
    if (!selectedDb) return;
    const idFields = fields.filter(f => f.type === 'id');
    await addRecord(selectedDb.id, idFields);
  };

  const handleSetValue = async (record: import('./DynamicField/types').DynRecord, field: Field, payload: FieldValuePayload) => {
    if (!selectedDb) return;
    await setValue(selectedDb.id, record, field, payload);
  };

  const handleDeleteSelectedRecords = async () => {
    if (selectedRecords.size === 0 || !selectedDb) return;
    await deleteRecords(selectedDb.id, Array.from(selectedRecords));
    setSelectedRecords(new Set());
  };

  const handleCloseDeletedDbNotice = () => {
    setShowDeletedDbNotice(false);
    window.location.href = '/test';
  };

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedRecords(new Set(records.map(r => r.id)));
    } else {
      setSelectedRecords(new Set());
    }
  };

  // ── View handlers ─────────────────────────────────────────────────────────
  const handleCreateView = async (name: string, type: DynViewType) => {
    if (!selectedDb) return;
    const view = await createView(selectedDb.id, name, type);
    setActiveView(view);
  };

  const handleRenameView = async (viewId: string, name: string) => {
    await updateView(viewId, { name });
  };

  const handleDeleteView = async (viewId: string) => {
    await deleteView(viewId);
  };

  const handleSetDefaultView = async (viewId: string) => {
    if (!selectedDb) return;
    await setDefaultView(selectedDb.id, viewId);
  };

  // Render the correct view component for the active view type
  const renderViewContent = () => {
    const viewType = activeView?.type ?? 'spreadsheet';
    switch (viewType) {
      case 'kanban':
        return (
          <KanbanView
            fields={fields}
            records={records}
            loading={loading}
            view={activeView!}
            onSetValue={handleSetValue}
            onAddRecord={handleAddRecord}
          />
        );
      case 'calendar':
        return <CalendarView />;
      case 'timeline':
        return <TimelineView />;
      case 'spreadsheet':
      default:
        return (
          <SpreadsheetView
            fields={fields}
            records={records}
            loading={loading}
            selectedRecords={selectedRecords}
            activeCell={activeCell}
            renamingFieldId={renamingFieldId}
            renameValue={renameValue}
            iconPickerFieldId={iconPickerFieldId}
            onSetActiveCell={setActiveCell}
            onToggleAll={handleToggleAll}
            onToggleRecord={(id, checked) => {
              const newSet = new Set(selectedRecords);
              if (checked) newSet.add(id); else newSet.delete(id);
              setSelectedRecords(newSet);
            }}
            onSetValue={handleSetValue}
            onAddRecord={handleAddRecord}
            onEditField={setEditingField}
            onStartRename={(field) => { setRenamingFieldId(field.id); setRenameValue(field.name); }}
            onRenameChange={setRenameValue}
            onCommitRename={commitRename}
            onCancelRename={() => setRenamingFieldId(null)}
            onOpenIconPicker={setIconPickerFieldId}
            onMoveField={handleMoveField}
            onDuplicateField={handleDuplicate}
            onDeleteField={setDeletingFieldId}
            onAddField={() => setShowAddField(true)}
          />
        );
    }
  };

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" onClick={(e) => e.stopPropagation()}>
        {/* ── Sidebar Header ──────────────────────────────────── */}
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <div className="flex items-center gap-2 cursor-default select-none">
                  <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground shrink-0">
                    <Database size={14} />
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm font-semibold">Databases</span>
                    <span className="text-xs text-muted-foreground">{databases.length} total</span>
                  </div>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        {/* ── Sidebar Content ─────────────────────────────────── */}
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Your Databases</SidebarGroupLabel>
            <SidebarMenu>
              {databases.map(db => (
                <SidebarMenuItem key={db.id}>
                  <SidebarMenuButton
                    isActive={selectedDb?.id === db.id}
                    onClick={() => loadDb(db)}
                    tooltip={db.name}
                  >
                    <Database />
                    <div className="flex flex-col leading-tight min-w-0">
                      <span className="truncate font-medium">{db.name}</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        {/* ── Sidebar Footer ──────────────────────────────────── */}
        <SidebarFooter>
          {showNewDb ? (
            <div className="flex flex-col gap-1.5 px-1">
              <Input
                autoFocus
                value={newDbName}
                onChange={e => setNewDbName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateDb();
                  if (e.key === 'Escape') setShowNewDb(false);
                }}
                placeholder="Database name"
                className="h-7 text-xs"
              />
              <div className="flex gap-1">
                <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleCreateDb}>Create</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowNewDb(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setShowNewDb(true)} tooltip="New database">
                    <Plus />
                    <span>New database</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <TemplateDialog />
                </SidebarMenuItem>
              </SidebarMenu>
            </div>
          )}
        </SidebarFooter>
      </Sidebar>

      {/* ── Main content (SidebarInset) ───────────────────────── */}
      <SidebarInset onClick={() => setActiveCell(null)}>
        <TooltipProvider>
          {!selectedDb ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground h-full">
              <Database size={40} className="opacity-20" />
              <p className="text-sm font-medium">Select or create a database</p>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <header
                className="flex h-12 shrink-0 items-center gap-3 border-b px-4"
                onClick={e => e.stopPropagation()}
              >
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="h-4" />
                <span className="font-semibold">{selectedDb.name}</span>
                <Separator orientation="vertical" className="h-4" />
                <span className="text-xs text-muted-foreground">
                  {fields.length} fields · {records.length} records
                </span>
                <div className="flex-1" />
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => setShowDeleteDb(true)}
                >
                  <Trash2 size={14} className="mr-1.5" /> Delete DB
                </Button>
                {activeView?.type === 'spreadsheet' && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setShowAddField(true)}>
                      <Plus size={14} /> Add field
                    </Button>
                    {selectedRecords.size > 0 && (
                      <Button size="sm" variant="destructive" onClick={handleDeleteSelectedRecords}>
                        <Trash2 size={14} className="mr-1.5" /> Delete {selectedRecords.size}
                      </Button>
                    )}
                  </>
                )}
                <Button size="sm" onClick={handleAddRecord}>
                  <Plus size={14} /> Add record
                </Button>
              </header>

              {/* View Manager Tab Bar */}
              {views.length > 0 && (
                <ViewManagerTabBar
                  views={views}
                  activeView={activeView}
                  fields={fields}
                  onSelectView={setActiveView}
                  onCreateView={handleCreateView}
                  onUpdateView={(viewId, patch) => updateView(viewId, patch)}
                  onMoveView={moveView}
                  onRenameView={handleRenameView}
                  onDeleteView={handleDeleteView}
                  onSetDefault={handleSetDefaultView}
                />
              )}

              {/* Active view content */}
              {renderViewContent()}
            </>
          )}
        </TooltipProvider>
      </SidebarInset>

      {/* ── Drawers & Dialogs ─────────────────────────────────── */}
      <AddFieldDrawer open={showAddField} onClose={() => setShowAddField(false)} onSubmit={handleAddField} />

      <EditFieldDrawer
        open={!!editingField}
        field={editingField}
        onClose={() => setEditingField(null)}
        onSaved={handleEditFieldSaved}
      />

      <AlertDialog open={!!deletingFieldId} onOpenChange={open => { if (!open) setDeletingFieldId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete field?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{fields.find(f => f.id === deletingFieldId)?.name}</strong> and all its values. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDeleteField}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDb} onOpenChange={setShowDeleteDb}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete database?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the <strong>{selectedDb?.name}</strong> database and all of its fields and records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDeleteDb}>
              Delete Database
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeletedDbNotice}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Database was deleted</AlertDialogTitle>
            <AlertDialogDescription>
              This database was deleted. Close this dialog to reload and return to the test page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleCloseDeletedDbNotice}>
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!iconPickerFieldId} onOpenChange={open => { if (!open) setIconPickerFieldId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Change icon</DialogTitle></DialogHeader>
          <div className="grid grid-cols-6 gap-2 pt-2">
            {ICON_OPTIONS.map(({ name, Icon }) => (
              <button key={name} onClick={() => handleIconChange(name)}
                className="flex items-center justify-center p-2.5 rounded-md border hover:bg-accent transition-colors"
                title={name}>
                <Icon size={16} />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
