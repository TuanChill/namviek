import { useState, useCallback, useEffect } from 'react';
import {
  Plus, Database, Loader2,
  ChevronLeft, ChevronRight, Copy, Trash2, Pencil, Smile, Settings2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Checkbox } from '@/components/ui/checkbox';

import { CellEditor } from './DynamicField/CellEditors';
import { AddFieldDrawer } from './DynamicField/AddFieldDrawer';
import { EditFieldDrawer } from './DynamicField/EditFieldDrawer';
import { getFieldMeta, ICON_OPTIONS, getIconByName } from './DynamicField/constants';

import { useDatabase } from './DynamicField/hooks/useDatabase';
import { useFields } from './DynamicField/hooks/useFields';
import { useRecords } from './DynamicField/hooks/useRecords';
import { useDatabaseStream } from './DynamicField/hooks/useDatabaseStream';

import type { DynDatabase, Field, FieldConfig, FieldType, FieldValuePayload } from './DynamicField/types';

const COL_WIDTH = 180;

export default function DynamicFieldPage() {
  const { databases, selectedDb, setSelectedDb, createDatabase } = useDatabase();
  const { fields, setFields, loadFields, addField, renameField, deleteField, moveField, duplicateField, changeIcon, updateField } = useFields();
  const { records, setRecords, loadRecords, addRecord, setValue, removeFieldValues, reloadRecords, deleteRecords } = useRecords();

  const [loading, setLoading] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());

  // DB creation
  const [showNewDb, setShowNewDb] = useState(false);
  const [newDbName, setNewDbName] = useState('');

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
    }
  });

  // ── Load DB ───────────────────────────────────────────────────────────────
  const loadDb = useCallback(async (db: DynDatabase) => {
    setSelectedDb(db);
    setActiveCell(null);
    setSelectedRecords(new Set());
    setLoading(true);
    try {
      await Promise.all([loadFields(db.id), loadRecords(db.id)]);
    } finally {
      setLoading(false);
    }
  }, [setSelectedDb, loadFields, loadRecords]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCreateDb = async () => {
    if (!newDbName.trim()) return;
    const db = await createDatabase(newDbName.trim());
    setNewDbName('');
    setShowNewDb(false);
    await loadDb(db);
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

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedRecords(new Set(records.map(r => r.id)));
    } else {
      setSelectedRecords(new Set());
    }
  };

  return (
    <TooltipProvider>
      {/* Click-outside to clear active cell */}
      <div
        className="flex h-screen bg-background text-foreground overflow-hidden"
        onClick={() => setActiveCell(null)}
      >

        {/* ── Sidebar ───────────────────────────────────────────── */}
        <aside className="w-56 flex flex-col border-r shrink-0" onClick={e => e.stopPropagation()}>
          <div className="px-3 py-3 border-b flex items-center gap-2">
            <Database size={15} className="text-muted-foreground" />
            <span className="text-sm font-semibold">Databases</span>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 flex flex-col gap-0.5">
              {databases.map(db => (
                <button key={db.id} onClick={() => loadDb(db)}
                  className={`w-full text-left px-2.5 py-2 rounded-md text-sm transition-colors ${selectedDb?.id === db.id ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}>
                  <div className="font-medium truncate">{db.name}</div>
                  <div className="text-xs opacity-60">{db._count.fields} fields · {db._count.records} rows</div>
                </button>
              ))}
            </div>
          </ScrollArea>
          <div className="p-2 border-t">
            {showNewDb ? (
              <div className="flex flex-col gap-1.5">
                <Input autoFocus value={newDbName} onChange={e => setNewDbName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateDb(); if (e.key === 'Escape') setShowNewDb(false); }}
                  placeholder="Database name" className="h-7 text-xs" />
                <div className="flex gap-1">
                  <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleCreateDb}>Create</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowNewDb(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="w-full justify-start gap-1.5 h-8 text-xs text-muted-foreground" onClick={() => setShowNewDb(true)}>
                <Plus size={13} /> New database
              </Button>
            )}
          </div>
        </aside>

        {/* ── Main ──────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedDb ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Database size={40} className="opacity-20" />
              <p className="text-sm font-medium">Select or create a database</p>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="px-5 py-3 border-b flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                <span className="font-semibold">{selectedDb.name}</span>
                <Separator orientation="vertical" className="h-4" />
                <span className="text-xs text-muted-foreground">{fields.length} fields · {records.length} records</span>
                <div className="flex-1" />
                <Button size="sm" variant="outline" onClick={() => setShowAddField(true)}><Plus size={14} /> Add field</Button>
                {selectedRecords.size > 0 && (
                  <Button size="sm" variant="destructive" onClick={handleDeleteSelectedRecords}>
                    <Trash2 size={14} className="mr-1.5" /> Delete {selectedRecords.size}
                  </Button>
                )}
                <Button size="sm" onClick={handleAddRecord}><Plus size={14} /> Add record</Button>
              </div>

              {/* Table */}
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 size={22} className="animate-spin text-muted-foreground" />
                </div>
              ) : fields.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <p className="text-sm">No fields yet.</p>
                  <Button size="sm" variant="outline" onClick={() => setShowAddField(true)}><Plus size={14} /> Add your first field</Button>
                </div>
              ) : (
                <div className="flex-1 overflow-auto">
                  <table className="text-sm border-collapse" style={{ tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '48px' }} />
                      {fields.map(f => <col key={f.id} style={{ width: `${COL_WIDTH}px` }} />)}
                    </colgroup>
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                      <tr>
                        <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground border-b border-r border-border/40">
                          <Checkbox 
                            checked={records.length > 0 && selectedRecords.size === records.length}
                            onCheckedChange={handleToggleAll}
                            className="translate-y-[2px]"
                          />
                        </th>
                        {fields.map((field, idx) => {
                          const { Icon: DefaultIcon } = getFieldMeta(field.type);
                          const Icon = field.config?.customIcon ? getIconByName(field.config.customIcon) : DefaultIcon;
                          return (
                            <ContextMenu key={field.id}>
                              <ContextMenuTrigger asChild>
                                <th className="px-3 py-2 text-left border-b border-r border-border/40 cursor-context-menu select-none" style={{ width: COL_WIDTH }}>
                                  {renamingFieldId === field.id ? (
                                    <Input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                                      onBlur={commitRename}
                                      onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenamingFieldId(null); }}
                                      className="h-6 text-xs px-1 font-normal" />
                                  ) : (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                          <Icon size={12} className="shrink-0" />
                                          <span className="truncate">{field.name}</span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom" className="text-xs">
                                        {field.type.replace('_', ' ')}{field.options.length > 0 ? ` · ${field.options.length} options` : ''}
                                        {' '}· Right-click to edit
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </th>
                              </ContextMenuTrigger>
                              <ContextMenuContent className='w-[180px]'>
                                <ContextMenuItem onClick={() => setEditingField(field)}>
                                  <Settings2 size={13} className="mr-2" /> Edit field
                                </ContextMenuItem>
                                <ContextMenuItem onClick={() => { setRenamingFieldId(field.id); setRenameValue(field.name); }}>
                                  <Pencil size={13} className="mr-2" /> Rename
                                </ContextMenuItem>
                                <ContextMenuItem onClick={() => setIconPickerFieldId(field.id)}>
                                  <Smile size={13} className="mr-2" /> Change icon
                                </ContextMenuItem>
                                <ContextMenuSeparator />
                                <ContextMenuItem disabled={idx === 0} onClick={() => handleMoveField(field.id, 'left')}>
                                  <ChevronLeft size={13} className="mr-2" /> Move left
                                </ContextMenuItem>
                                <ContextMenuItem disabled={idx === fields.length - 1} onClick={() => handleMoveField(field.id, 'right')}>
                                  <ChevronRight size={13} className="mr-2" /> Move right
                                </ContextMenuItem>
                                <ContextMenuSeparator />
                                <ContextMenuItem onClick={() => handleDuplicate(field.id)}>
                                  <Copy size={13} className="mr-2" /> Duplicate field
                                </ContextMenuItem>
                                <ContextMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeletingFieldId(field.id)}>
                                  <Trash2 size={13} className="mr-2" /> Delete field
                                </ContextMenuItem>
                              </ContextMenuContent>
                            </ContextMenu>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {records.length === 0 ? (
                        <tr>
                          <td colSpan={fields.length + 1} className="px-4 py-8 text-center text-sm text-muted-foreground">
                            No records. Click <strong>+ Add record</strong> to create a row.
                          </td>
                        </tr>
                      ) : records.map(record => (
                        <tr key={record.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-2 text-center border-r border-b align-middle">
                            <Checkbox 
                              checked={selectedRecords.has(record.id)}
                              onCheckedChange={(checked) => {
                                const newSet = new Set(selectedRecords);
                                if (checked) newSet.add(record.id);
                                else newSet.delete(record.id);
                                setSelectedRecords(newSet);
                              }}
                              className="translate-y-[2px]"
                            />
                          </td>
                          {fields.map(field => {
                            const fv = record.fieldValues.find(v => v.fieldId === field.id);
                            const cellKey = `${record.id}:${field.id}`;
                            const isActive = activeCell?.recordId === record.id && activeCell?.fieldId === field.id;
                            return (
                              <td
                                key={field.id}
                                className={`px-3 py-2 border-r border-b align-middle transition-all ${isActive ? 'outline outline-2 outline-primary outline-offset-[-2px]' : ''
                                  }`}
                                style={{ width: COL_WIDTH, maxWidth: COL_WIDTH, overflow: 'hidden', position: 'relative' }}
                                onClick={e => { e.stopPropagation(); setActiveCell({ recordId: record.id, fieldId: field.id }); }}
                              >
                                <CellEditor
                                  key={cellKey}
                                  field={field}
                                  value={fv}
                                  record={record}
                                  isActive={isActive}
                                  onActivate={() => setActiveCell({ recordId: record.id, fieldId: field.id })}
                                  onDeactivate={() => setActiveCell(null)}
                                  onSave={payload => handleSetValue(record, field, payload)}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button onClick={handleAddRecord}
                    className="w-full px-3 py-2.5 text-left text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors flex items-center gap-1.5">
                    <Plus size={13} /> Add record
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

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
    </TooltipProvider>
  );
}
