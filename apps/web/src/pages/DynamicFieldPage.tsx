import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Plus, Database, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { TooltipProvider } from '@/components/ui/tooltip';
import { logout } from '@/lib/auth-store';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';

import { AddFieldDrawer } from './DynamicField/AddFieldDrawer';
import { EditFieldDrawer } from './DynamicField/EditFieldDrawer';
import { CreateDatabaseDialog } from './DynamicField/components/CreateDatabaseDialog';
import { DatabaseIcon } from './DynamicField/components/DatabaseIcon';
import { DatabasesSidebar } from './DynamicField/components/DatabasesSidebar';
import { ICON_OPTIONS } from './DynamicField/constants';

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
import { api } from './DynamicField/api';

import type { DynDatabase, DynViewType, Field, FieldConfig, FieldType, FieldValuePayload } from './DynamicField/types';

const DEFAULT_DB_ICON = 'Database';

export default function DynamicFieldPage() {
  const { databases, selectedDb, setSelectedDb, createDatabase, deleteDatabase, upsertDatabase, removeDatabase } = useDatabase();
  const { fields, setFields, loadFields, addField, renameField, deleteField, moveField, duplicateField, changeIcon, updateField } = useFields();
  const { records, setRecords, loadRecords, addRecord, setValue, removeFieldValues, reloadRecords, deleteRecords } = useRecords();
  const { views, setViews, activeView, setActiveView, loadViews, createView, updateView, deleteView, setDefaultView, moveView } = useViews();

  // Server-side filtered records
  const [filteredRecords, setFilteredRecords] = useState<typeof records>([]);

  // When active view changes, fetch filtered records if the view has a filter
  useEffect(() => {
    if (!selectedDb?.id || !records.length) {
      setFilteredRecords(records);
      return;
    }

    const filter = activeView?.config?.filter;

    if (filter) {
      let cancelled = false;

      api.records.listFiltered(selectedDb.id, filter)
        .then(filtered => {
          if (!cancelled) setFilteredRecords(filtered);
        })
        .catch(err => {
          console.error('Failed to fetch filtered records:', err);
          // Fallback to records if server filtering fails
          if (!cancelled) setFilteredRecords(records);
        });

      return () => {
        cancelled = true;
      };
    } else {
      // No filter, use all records
      setFilteredRecords(records);
    }
  }, [selectedDb?.id, activeView, records]);

  // Keep this import for fallback in case server filtering fails
  // const clientFilteredRecords = applyFilter(records, fields, activeView?.config?.filter);

  const { databaseId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());

  // DB creation & deletion
  const [showCreateDbDialog, setShowCreateDbDialog] = useState(false);
  const [showDeleteDb, setShowDeleteDb] = useState(false);
  const [showDeletedDbNotice, setShowDeletedDbNotice] = useState(false);

  // Track in-flight load requests so a stale response from a previous database
  // cannot overwrite data from the currently selected one.
  const loadRequestIdRef = useRef(0);
  // Track which databaseId we have already triggered a load for, so the
  // URL-watching effect does not fire a duplicate load when selectedDb state
  // updates mid-flight (which would otherwise cause the old DB to reload).
  const loadedDbIdRef = useRef<string | undefined>(undefined);

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
    // Stamp this request so stale completions can be detected and ignored.
    const requestId = ++loadRequestIdRef.current;
    // Mark this db as "loading" before any await so the URL-watching effect
    // does not race and re-trigger a load for the old database when selectedDb
    // state updates mid-flight.
    loadedDbIdRef.current = db.id;

    setSelectedDb(db);
    setActiveCell(null);
    setSelectedRecords(new Set());
    setLoading(true);

    // Clear stale data immediately so the old database does not flash while
    // the new database is loading.
    setFields([]);
    setRecords([]);
    setViews([]);
    setActiveView(null);

    try {
      const shouldApply = () => loadRequestIdRef.current === requestId;
      await Promise.all([
        loadFields(db.id, shouldApply),
        loadRecords(db.id, shouldApply),
        loadViews(db.id, shouldApply),
      ]);
      if (!shouldApply()) return;
      if (updateUrl) navigate(`/test/${db.id}`);
    } finally {
      if (loadRequestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [setSelectedDb, setFields, setRecords, setViews, setActiveView, loadFields, loadRecords, loadViews, navigate]);

  // Initial load from URL (also handles browser back/forward).
  // Intentionally does NOT depend on selectedDb — that state changes during
  // loadDb itself and would otherwise cause a spurious reload of the old db.
  useEffect(() => {
    if (databases.length === 0 || !databaseId) return;
    // loadedDbIdRef is set synchronously at the top of loadDb, so if it
    // already matches, this db is already loading or loaded — skip.
    if (loadedDbIdRef.current === databaseId) return;
    const db = databases.find(d => d.id === databaseId);
    if (db) loadDb(db, false);
  }, [databaseId, databases, loadDb]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCreateDbFromDialog = useCallback(async (name: string, icon: string) => {
    const db = await createDatabase(name, icon || DEFAULT_DB_ICON);
    setShowCreateDbDialog(false);
    await loadDb(db);
  }, [createDatabase, loadDb]);

  const handleDeleteDb = async () => {
    if (!selectedDb) return;
    await deleteDatabase(selectedDb.id);
    setShowDeleteDb(false);
    navigate('/test');
  };

  const handleAddField = async (name: string, type: FieldType, config: FieldConfig, pendingOptions: { label: string; color: string; position?: number }[]) => {
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

  const handleAddRecord = async (initialValues: Array<{ field: Field; payload: FieldValuePayload }> = []) => {
    if (!selectedDb) return;
    const idFields = fields.filter(f => f.type === 'id');
    return await addRecord(selectedDb.id, idFields, initialValues);
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

  const handleLogout = () => {
    logout();
    navigate('/login');
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
            records={filteredRecords}
            loading={loading}
            view={activeView!}
            onSetValue={handleSetValue}
            onAddRecord={handleAddRecord}
          />
        );
      case 'calendar':
        return (
          <CalendarView
            fields={fields}
            records={filteredRecords}
            loading={loading}
            view={activeView!}
            onUpdateView={(viewId, patch) => { void updateView(viewId, patch); }}
            onAddRecord={handleAddRecord}
            onSetValue={handleSetValue}
          />
        );
      case 'timeline':
        return (
          <TimelineView
            fields={fields}
            records={filteredRecords}
            loading={loading}
            view={activeView!}
          />
        );
      case 'spreadsheet':
      default:
        return (
          <SpreadsheetView
            fields={fields}
            records={filteredRecords}
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
      <DatabasesSidebar
        databases={databases}
        selectedDatabaseId={selectedDb?.id}
        onSelectDatabase={(db) => { void loadDb(db); }}
        onOpenCreateDatabase={() => setShowCreateDbDialog(true)}
        onLogout={handleLogout}
      />

      {/* ── Main content (SidebarInset) ───────────────────────── */}
      <SidebarInset className='h-svh overflow-hidden' onClick={() => setActiveCell(null)}>
        <TooltipProvider>
          {!selectedDb ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground h-full">
              <Database size={40} className="opacity-20" />
              <p className="text-sm font-medium">Select or create a database</p>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {/* Toolbar */}
              <header
                className="flex h-12 shrink-0 items-center gap-3 border-b px-4"
                onClick={e => e.stopPropagation()}
              >
                <DatabaseIcon icon={selectedDb?.icon} size={14} />
                <span className="font-semibold">{selectedDb.name}</span>
                <Separator orientation="vertical" className="!h-4 !self-center shrink-0" />
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
                <Button size="sm" onClick={() => { void handleAddRecord(); }}>
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
              <div className="min-h-0 flex-1 overflow-hidden">{renderViewContent()}</div>
            </div>
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

      <CreateDatabaseDialog
        open={showCreateDbDialog}
        onOpenChange={setShowCreateDbDialog}
        onCreate={handleCreateDbFromDialog}
        defaultIcon={DEFAULT_DB_ICON}
      />
    </SidebarProvider>
  );
}
