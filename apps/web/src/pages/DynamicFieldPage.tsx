import { useState, useEffect, useCallback } from 'react';
import { Plus, Database, Loader2, ChevronLeft, ChevronRight, Copy, Trash2, Pencil, Smile, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { CellEditor } from './DynamicField/CellEditors';
import { AddFieldDrawer } from './DynamicField/AddFieldDrawer';
import { EditFieldDrawer } from './DynamicField/EditFieldDrawer';
import { getFieldMeta, ICON_OPTIONS, getIconByName } from './DynamicField/constants';
import { api } from './DynamicField/api';
import type { DynDatabase, DynRecord, Field, FieldConfig, FieldType, FieldValuePayload } from './DynamicField/types';

const COL_WIDTH = 180; // px — fixed column width

export default function DynamicFieldPage() {
  const [databases, setDatabases] = useState<DynDatabase[]>([]);
  const [selectedDb, setSelectedDb] = useState<DynDatabase | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [records, setRecords] = useState<DynRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // DB creation
  const [showNewDb, setShowNewDb] = useState(false);
  const [newDbName, setNewDbName] = useState('');

  // Add field drawer
  const [showAddField, setShowAddField] = useState(false);

  // Column context-menu actions
  const [renamingFieldId, setRenamingFieldId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null);
  const [iconPickerFieldId, setIconPickerFieldId] = useState<string | null>(null);

  // Edit field drawer
  const [editingField, setEditingField] = useState<Field | null>(null);

  useEffect(() => { api.databases.list().then(setDatabases).catch(console.error); }, []);

  const loadDb = useCallback(async (db: DynDatabase) => {
    setSelectedDb(db);
    setLoading(true);
    try {
      const [f, r] = await Promise.all([api.fields.list(db.id), api.records.list(db.id)]);
      setFields(f);
      setRecords(r);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Database ──────────────────────────────────────────────────────────────
  const handleCreateDb = async () => {
    if (!newDbName.trim()) return;
    const db = await api.databases.create(newDbName.trim());
    const list = await api.databases.list();
    setDatabases(list);
    setNewDbName('');
    setShowNewDb(false);
    await loadDb(db);
  };

  // ── Field creation ────────────────────────────────────────────────────────
  const handleAddField = async (name: string, type: FieldType, config: FieldConfig, pendingOptions: { label: string; color: string }[]) => {
    if (!selectedDb) return;
    const field = await api.fields.create(selectedDb.id, name, type, config);
    const opts = await Promise.all(pendingOptions.map(o => api.options.create(field.id, o.label, o.color)));
    setFields(prev => [...prev, { ...field, options: opts, config: config as Field['config'] }]);
  };

  // ── Field rename ──────────────────────────────────────────────────────────
  const commitRename = async () => {
    if (!renamingFieldId || !renameValue.trim()) { setRenamingFieldId(null); return; }
    const updated = await api.fields.update(renamingFieldId, { name: renameValue.trim() });
    setFields(prev => prev.map(f => f.id === renamingFieldId ? { ...f, name: updated.name } : f));
    setRenamingFieldId(null);
  };

  // ── Field delete ──────────────────────────────────────────────────────────
  const handleDeleteField = async () => {
    if (!deletingFieldId) return;
    await api.fields.delete(deletingFieldId);
    setFields(prev => prev.filter(f => f.id !== deletingFieldId));
    setRecords(prev => prev.map(r => ({ ...r, fieldValues: r.fieldValues.filter(fv => fv.fieldId !== deletingFieldId) })));
    setDeletingFieldId(null);
  };

  // ── Field move ────────────────────────────────────────────────────────────
  const handleMoveField = async (fieldId: string, direction: 'left' | 'right') => {
    await api.fields.move(fieldId, direction);
    // Re-fetch to get correct order from DB
    if (selectedDb) {
      const f = await api.fields.list(selectedDb.id);
      setFields(f);
    }
  };

  // ── Field duplicate ───────────────────────────────────────────────────────
  const handleDuplicate = async (fieldId: string) => {
    const copy = await api.fields.duplicate(fieldId);
    if (selectedDb) {
      const f = await api.fields.list(selectedDb.id);
      setFields(f);
      void copy;
    }
  };

  // ── Icon change ───────────────────────────────────────────────────────────
  const handleIconChange = async (iconName: string) => {
    if (!iconPickerFieldId) return;
    const field = fields.find(f => f.id === iconPickerFieldId);
    if (!field) return;
    const updated = await api.fields.update(iconPickerFieldId, { config: { ...(field.config ?? {}), customIcon: iconName } });
    setFields(prev => prev.map(f => f.id === iconPickerFieldId ? { ...f, config: updated.config } : f));
    setIconPickerFieldId(null);
  };

  // ── Edit field saved ──────────────────────────────────────────────────────
  const handleEditFieldSaved = (updated: Field) => {
    setFields(prev => prev.map(f => f.id === updated.id ? updated : f));
    setEditingField(null);
  };

  // ── Records ───────────────────────────────────────────────────────────────
  const handleAddRecord = async () => {
    if (!selectedDb) return;
    const record = await api.records.create(selectedDb.id);
    setRecords(prev => [...prev, { ...record, fieldValues: [] }]);
  };

  const handleSetValue = async (record: DynRecord, field: Field, payload: FieldValuePayload) => {
    const saved = await api.values.set(record.id, field.id, payload);
    setRecords(prev => prev.map(r => {
      if (r.id !== record.id) return r;
      const exists = r.fieldValues.find(fv => fv.fieldId === field.id);
      if (exists) return { ...r, fieldValues: r.fieldValues.map(fv => fv.fieldId === field.id ? { ...fv, ...saved } : fv) };
      return { ...r, fieldValues: [...r.fieldValues, { ...saved, field }] };
    }));
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background text-foreground overflow-hidden">

        {/* ── Sidebar ───────────────────────────────────────────── */}
        <aside className="w-56 flex flex-col border-r shrink-0">
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
              <div className="px-5 py-3 border-b flex items-center gap-3 shrink-0">
                <span className="font-semibold">{selectedDb.name}</span>
                <Separator orientation="vertical" className="h-4" />
                <span className="text-xs text-muted-foreground">{fields.length} fields · {records.length} records</span>
                <div className="flex-1" />
                <Button size="sm" variant="outline" onClick={() => setShowAddField(true)}><Plus size={14} /> Add field</Button>
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
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground border-b border-r">#</th>
                        {fields.map((field, idx) => {
                          const { Icon: DefaultIcon } = getFieldMeta(field.type);
                          const Icon = field.config?.customIcon ? getIconByName(field.config.customIcon) : DefaultIcon;

                          return (
                            <ContextMenu key={field.id}>
                              <ContextMenuTrigger asChild>
                                <th className="px-3 py-2 text-left border-b border-r cursor-context-menu select-none"
                                  style={{ width: COL_WIDTH }}>
                                  {renamingFieldId === field.id ? (
                                    <Input
                                      autoFocus
                                      value={renameValue}
                                      onChange={e => setRenameValue(e.target.value)}
                                      onBlur={commitRename}
                                      onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenamingFieldId(null); }}
                                      className="h-6 text-xs px-1 font-normal"
                                    />
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
                              <ContextMenuContent>
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
                                <ContextMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeletingFieldId(field.id)}
                                >
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
                          <td className="px-3 py-2 text-xs text-muted-foreground border-r">{record.rowNumber}</td>
                          {fields.map(field => {
                            const fv = record.fieldValues.find(v => v.fieldId === field.id);
                            return (
                              <td key={field.id} className="px-3 py-2 border-r align-middle" style={{ width: COL_WIDTH, maxWidth: COL_WIDTH, overflow: 'hidden' }}>
                                <CellEditor field={field} value={fv} record={record}
                                  onSave={payload => handleSetValue(record, field, payload)} />
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

      {/* ── Add Field Drawer ────────────────────────────────────── */}
      <AddFieldDrawer open={showAddField} onClose={() => setShowAddField(false)} onSubmit={handleAddField} />

      {/* ── Edit Field Drawer ───────────────────────────────────── */}
      <EditFieldDrawer
        open={!!editingField}
        field={editingField}
        onClose={() => setEditingField(null)}
        onSaved={handleEditFieldSaved}
      />

      {/* ── Delete Field Confirmation ──────────────────────────── */}
      <AlertDialog open={!!deletingFieldId} onOpenChange={open => { if (!open) setDeletingFieldId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete field?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the field <strong>{fields.find(f => f.id === deletingFieldId)?.name}</strong> and all its values across every record. This cannot be undone.
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

      {/* ── Icon Picker Dialog ─────────────────────────────────── */}
      <Dialog open={!!iconPickerFieldId} onOpenChange={open => { if (!open) setIconPickerFieldId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change icon</DialogTitle>
          </DialogHeader>
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
