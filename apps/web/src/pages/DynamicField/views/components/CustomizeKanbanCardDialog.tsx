import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Image, Plus, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { getFieldMeta } from '../../constants';
import type { DynView, Field, ViewConfig, ViewKanbanCardLayout } from '../../types';
import { KanbanCardContent } from '../kanban/KanbanCardLayout';
import {
  buildKanbanPreviewRecord,
  getFieldSectionIcon,
  getKanbanAvailableFields,
  getKanbanCardLayout,
  getSectionActionLabel,
  getSectionLabel,
  KANBAN_PREVIEW_USERS,
  type CardSection,
} from '../kanban/kanban-card-layout.utils';

const SECTION_ABBREV: Record<CardSection, string> = {
  header: 'H.Left',
  headerRight: 'H.Right',
  middle: 'Mid',
  footerLeft: 'F.Left',
  footerRight: 'F.Right',
};

interface CustomizeKanbanCardDialogProps {
  view: DynView;
  fields: Field[];
  onClose: () => void;
  onSave: (viewId: string, patch: { config?: ViewConfig }) => void;
}

export function CustomizeKanbanCardDialog({ view, fields, onClose, onSave }: CustomizeKanbanCardDialogProps) {
  const [layout, setLayout] = useState<ViewKanbanCardLayout>(() => getKanbanCardLayout(view.config, fields));
  const fileFields = useMemo(() => fields.filter(field => field.type === 'file'), [fields]);

  const availableFields = useMemo(() => getKanbanAvailableFields(fields, layout), [fields, layout]);
  const previewRecord = useMemo(() => buildKanbanPreviewRecord(fields), [fields]);
  const previewView = useMemo(() => ({ config: { ...(view.config ?? {}), cardLayout: layout } }), [layout, view.config]);

  const updateSection = (section: CardSection, updater: (current: string[]) => string[]) => {
    setLayout(current => ({
      ...current,
      [section]: updater(current[section]),
    }));
  };

  const addField = (section: CardSection, fieldId: string) => {
    updateSection(section, current => [...current, fieldId]);
  };

  const removeField = (section: CardSection, fieldId: string) => {
    updateSection(section, current => current.filter(id => id !== fieldId));
  };

  const setFilePreview = (fieldId: string | undefined) => {
    setLayout(current => ({ ...current, filePreviewFieldId: fieldId }));
  };

  const moveField = (section: CardSection, fieldId: string, direction: 'up' | 'down') => {
    updateSection(section, current => {
      const index = current.indexOf(fieldId);
      if (index === -1) return current;
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= current.length) return current;

      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const handleSave = () => {
    onSave(view.id, {
      config: {
        ...(view.config ?? {}),
        cardLayout: layout,
      },
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-6xl overflow-hidden p-0 sm:max-w-6xl">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle>Customize Card</DialogTitle>
          <DialogDescription>
            Configure which fields appear in the Kanban card header and footer for this view.
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-[640px] overflow-hidden">
          {/* Left: scrollable config */}
          <ScrollArea className="flex-1 border-r">
            <div className="flex flex-col gap-6 px-6 py-5">
              <section className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium">Available Fields</h3>
                  <p className="text-xs text-muted-foreground">
                    Add fields to the header, footer left, or footer right. The record title is always shown in the card body.
                  </p>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {availableFields.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground md:col-span-2">
                      All eligible fields are already used in this card layout.
                    </div>
                  ) : (
                    availableFields.map(field => {
                      const { Icon } = getFieldMeta(field.type);
                      return (
                        <div key={field.id} className="rounded-lg border bg-card p-3">
                          <div className="flex items-center gap-2">
                            <Icon size={14} className="text-muted-foreground" />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">{field.name}</div>
                              <div className="text-xs text-muted-foreground">{field.type.replace('_', ' ')}</div>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {(['header', 'headerRight', 'middle', 'footerLeft', 'footerRight'] as const).map(section => (
                              <button
                                key={section}
                                title={getSectionActionLabel(section)}
                                onClick={() => addField(section, field.id)}
                                className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                              >
                                <Plus size={10} />
                                {SECTION_ABBREV[section]}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              <Separator />

              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Image size={15} className="text-primary" />
                  <div>
                    <h3 className="text-sm font-medium">File Preview</h3>
                    <p className="text-xs text-muted-foreground">Pick a file field to show an image at the top of the card.</p>
                  </div>
                </div>
                {fileFields.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No file fields in this database.
                  </div>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2">
                    {fileFields.map(field => {
                      const { Icon } = getFieldMeta(field.type);
                      const isSelected = layout.filePreviewFieldId === field.id;
                      return (
                        <div key={field.id} className={['flex items-center gap-3 rounded-lg border p-3', isSelected ? 'border-primary bg-primary/5' : 'bg-card'].join(' ')}>
                          <Icon size={14} className="shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{field.name}</div>
                            <div className="text-xs text-muted-foreground">file</div>
                          </div>
                          {isSelected ? (
                            <Button size="sm" variant="ghost" onClick={() => setFilePreview(undefined)}>
                              <X size={12} className="mr-1" /> Remove
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => setFilePreview(field.id)}>
                              Set preview
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <Separator />

              <section className="grid gap-6 lg:grid-cols-2">
                <CardSectionEditor
                  section="header"
                  fieldIds={layout.header}
                  fields={fields}
                  onMove={moveField}
                  onRemove={removeField}
                />
                <CardSectionEditor
                  section="headerRight"
                  fieldIds={layout.headerRight}
                  fields={fields}
                  onMove={moveField}
                  onRemove={removeField}
                />
                <CardSectionEditor
                  section="middle"
                  fieldIds={layout.middle}
                  fields={fields}
                  onMove={moveField}
                  onRemove={removeField}
                />
                <CardSectionEditor
                  section="footerLeft"
                  fieldIds={layout.footerLeft}
                  fields={fields}
                  onMove={moveField}
                  onRemove={removeField}
                />
                <CardSectionEditor
                  section="footerRight"
                  fieldIds={layout.footerRight}
                  fields={fields}
                  onMove={moveField}
                  onRemove={removeField}
                />
              </section>
            </div>
          </ScrollArea>

          {/* Right: sticky live preview */}
          <div className="flex w-[400px] shrink-0 flex-col items-center gap-4 overflow-y-auto bg-muted/20 px-4 py-5">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-primary" />
              <div>
                <h3 className="text-sm font-medium">Live Preview</h3>
                <p className="text-xs text-muted-foreground">Uses dummy data.</p>
              </div>
            </div>
            <div className="">
              <div style={{ width: '300px' }}>
                <KanbanCardContent
                  record={previewRecord}
                  fields={fields}
                  view={previewView}
                  users={KANBAN_PREVIEW_USERS}
                  className="shadow-md"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Layout</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CardSectionEditorProps {
  section: CardSection;
  fieldIds: string[];
  fields: Field[];
  onMove: (section: CardSection, fieldId: string, direction: 'up' | 'down') => void;
  onRemove: (section: CardSection, fieldId: string) => void;
}

function CardSectionEditor({ section, fieldIds, fields, onMove, onRemove }: CardSectionEditorProps) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium">{getSectionLabel(section)}</h3>
        <p className="text-xs text-muted-foreground">
          {section === 'header'
            ? 'Fields render inline on the left above the title.'
            : section === 'headerRight'
              ? 'Fields render inline on the right above the title.'
              : section === 'middle'
                ? 'Fields render as stacked text between header and title.'
                : section === 'footerLeft'
                  ? 'Fields render on the left side of the footer.'
                  : 'Fields render on the right side of the footer.'}
        </p>
      </div>

      <div className="space-y-2">
        {fieldIds.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No fields added to the {section} yet.
          </div>
        ) : (
          fieldIds.map((fieldId, index) => {
            const field = fields.find(item => item.id === fieldId);
            if (!field) return null;
            const Icon = getFieldSectionIcon(field);

            return (
              <div key={field.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                <Icon size={14} className="shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{field.name}</div>
                  <div className="text-xs text-muted-foreground">{field.type.replace('_', ' ')}</div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => onMove(section, field.id, 'up')}
                    disabled={index === 0}
                  >
                    <ArrowUp size={14} />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => onMove(section, field.id, 'down')}
                    disabled={index === fieldIds.length - 1}
                  >
                    <ArrowDown size={14} />
                  </Button>
                  <Button size="icon-sm" variant="ghost" onClick={() => onRemove(section, field.id)}>
                    <X size={14} />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}