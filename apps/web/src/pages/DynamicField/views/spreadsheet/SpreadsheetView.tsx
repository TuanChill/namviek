import {
  Plus, ChevronLeft, ChevronRight, Copy, Trash2, Pencil, Smile, Settings2, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { CellEditor } from '../../CellEditors';
import { getFieldMeta, ICON_OPTIONS, getIconByName } from '../../constants';
import type { DynRecord, Field, FieldValuePayload } from '../../types';

const COL_WIDTH = 180;

interface SpreadsheetViewProps {
  fields: Field[];
  records: DynRecord[];
  loading: boolean;
  selectedRecords: Set<string>;
  activeCell: { recordId: string; fieldId: string } | null;
  renamingFieldId: string | null;
  renameValue: string;
  iconPickerFieldId: string | null;
  onSetActiveCell: (cell: { recordId: string; fieldId: string } | null) => void;
  onToggleAll: (checked: boolean) => void;
  onToggleRecord: (id: string, checked: boolean) => void;
  onSetValue: (record: DynRecord, field: Field, payload: FieldValuePayload) => void;
  onAddRecord: () => void;
  onEditField: (field: Field) => void;
  onStartRename: (field: Field) => void;
  onRenameChange: (value: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onOpenIconPicker: (fieldId: string) => void;
  onMoveField: (fieldId: string, direction: 'left' | 'right') => void;
  onDuplicateField: (fieldId: string) => void;
  onDeleteField: (fieldId: string) => void;
  onAddField: () => void;
}

export function SpreadsheetView({
  fields,
  records,
  loading,
  selectedRecords,
  activeCell,
  renamingFieldId,
  renameValue,
  onSetActiveCell,
  onToggleAll,
  onToggleRecord,
  onSetValue,
  onAddRecord,
  onEditField,
  onStartRename,
  onRenameChange,
  onCommitRename,
  onCancelRename,
  onOpenIconPicker,
  onMoveField,
  onDuplicateField,
  onDeleteField,
  onAddField,
}: SpreadsheetViewProps) {
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 size={22} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
        <p className="text-sm">No fields yet.</p>
        <Button size="sm" variant="outline" onClick={onAddField}>
          <Plus size={14} /> Add your first field
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
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
                  onCheckedChange={onToggleAll}
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
                          <Input
                            autoFocus
                            value={renameValue}
                            onChange={e => onRenameChange(e.target.value)}
                            onBlur={onCommitRename}
                            onKeyDown={e => {
                              if (e.key === 'Enter') onCommitRename();
                              if (e.key === 'Escape') onCancelRename();
                            }}
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
                              {field.type.replace('_', ' ')}{field.options?.length ? ` · ${field.options.length} options` : ''}
                              {' '}· Right-click to edit
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </th>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-[180px]">
                      <ContextMenuItem onClick={() => onEditField(field)}>
                        <Settings2 size={13} className="mr-1" /> Edit field
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => onStartRename(field)}>
                        <Pencil size={13} className="mr-1" /> Rename
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => onOpenIconPicker(field.id)}>
                        <Smile size={13} className="mr-1" /> Change icon
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem disabled={idx === 0} onClick={() => onMoveField(field.id, 'left')}>
                        <ChevronLeft size={13} className="mr-1" /> Move left
                      </ContextMenuItem>
                      <ContextMenuItem disabled={idx === fields.length - 1} onClick={() => onMoveField(field.id, 'right')}>
                        <ChevronRight size={13} className="mr-1" /> Move right
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem onClick={() => onDuplicateField(field.id)}>
                        <Copy size={13} className="mr-1" /> Duplicate field
                      </ContextMenuItem>
                      <ContextMenuItem className="text-destructive focus:text-destructive" disabled={field.isPrimary} onClick={() => !field.isPrimary && onDeleteField(field.id)}>
                        <Trash2 size={13} className="mr-1" /> Delete field
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
                    onCheckedChange={(checked) => onToggleRecord(record.id, !!checked)}
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
                      className={`px-3 py-2 border-r border-b align-middle transition-all ${isActive ? 'outline outline-2 outline-primary outline-offset-[-2px]' : ''}`}
                      style={{ width: COL_WIDTH, maxWidth: COL_WIDTH, overflow: 'hidden', position: 'relative' }}
                      onClick={e => { e.stopPropagation(); onSetActiveCell({ recordId: record.id, fieldId: field.id }); }}
                    >
                      <CellEditor
                        key={cellKey}
                        field={field}
                        value={fv}
                        record={record}
                        isActive={isActive}
                        onActivate={() => onSetActiveCell({ recordId: record.id, fieldId: field.id })}
                        onDeactivate={() => onSetActiveCell(null)}
                        onSave={payload => onSetValue(record, field, payload)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={onAddRecord}
          className="w-full px-3 py-2.5 text-left text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors flex items-center gap-1.5"
        >
          <Plus size={13} /> Add record
        </button>
      </div>
    </TooltipProvider>
  );
}
