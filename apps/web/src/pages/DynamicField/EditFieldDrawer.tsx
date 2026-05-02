import { useState, useEffect } from 'react';
import { ChevronsUpDown, Check, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select as ShadSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { SelectOptionsEditor, type EditableSelectOption } from './components/SelectOptionsEditor';
import {
  OPTION_COLORS,
  DATE_FORMATS,
  NUMBER_FORMATS,
  ICON_OPTIONS,
  getFieldMeta,
  getIconByName,
} from './constants';
import { api } from './api';
import type { Field, FieldConfig, FieldOption, DynUser } from './types';

interface Props {
  open: boolean;
  field: Field | null;
  onClose: () => void;
  /** Called after all API calls succeed with the fully updated field */
  onSaved: (updated: Field) => void;
}

function toEditableOptions(options: FieldOption[]): EditableSelectOption[] {
  return options.map((opt, index) => ({
    id: opt.id,
    label: opt.label,
    color: opt.color ?? OPTION_COLORS[0],
    position: index + 1,
  }));
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EditFieldDrawer({ open, field, onClose, onSaved }: Props) {
  // Form state — reset whenever `field` changes
  const [name, setName] = useState('');
  const [config, setConfig] = useState<FieldConfig>({});
  const [iconName, setIconName] = useState<string | undefined>(undefined);

  const [originalOptions, setOriginalOptions] = useState<FieldOption[]>([]);
  const [optionDrafts, setOptionDrafts] = useState<EditableSelectOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [allUsers, setAllUsers] = useState<DynUser[]>([]);

  // ── Initialise form when field changes ──────────────────────────────────────
  useEffect(() => {
    if (!field || !open) return;
    let cancelled = false;

    setName(field.name);
    setConfig(field.config ?? {});
    setIconName(field.config?.customIcon);

    // Load the latest options from the API for select types
    if (field.type === 'select' || field.type === 'multi_select') {
      setOptionsLoading(true);
      const initialOptions = toEditableOptions(field.options ?? []);
      setOriginalOptions(field.options ?? []);
      setOptionDrafts(initialOptions);

      api.options
        .list(field.id)
        .then((latest) => {
          if (cancelled) return;
          setOriginalOptions(latest);
          setOptionDrafts(toEditableOptions(latest));
        })
        .catch((err) => {
          if (cancelled) return;
          console.error(err);
        })
        .finally(() => {
          if (!cancelled) setOptionsLoading(false);
        });
    } else {
      setOptionsLoading(false);
      setOriginalOptions([]);
      setOptionDrafts([]);
    }

    // Load users for person fields
    if (field.type === 'person') {
      api.users.list().then(setAllUsers).catch(console.error);
    }

    return () => {
      cancelled = true;
    };
  }, [field, open]);

  if (!field) return null;

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const patch = (partial: Partial<FieldConfig>) =>
    setConfig(c => ({ ...c, ...partial }));

  const isSelectType = field.type === 'select' || field.type === 'multi_select';

  const selectIcon = (name: string) => {
    setIconName(name);
    patch({ customIcon: name });
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      // 1. Update field name + config (icon lives in config.customIcon)
      const updatedField = await api.fields.update(field.id, {
        name: name.trim(),
        config: { ...config, customIcon: iconName },
      });

      const originalById = new Map(originalOptions.map(opt => [opt.id, opt]));
      const draftIds = new Set(optionDrafts.filter(opt => opt.id).map(opt => opt.id as string));

      const removedOptionIds = originalOptions
        .filter(opt => !draftIds.has(opt.id))
        .map(opt => opt.id);

      await Promise.all(removedOptionIds.map(optId => api.options.delete(field.id, optId)));

      const updatePayloads = optionDrafts
        .filter((opt): opt is EditableSelectOption & { id: string } => !!opt.id)
        .filter((opt) => {
          const original = originalById.get(opt.id);
          if (!original) return false;
          return (
            original.label !== opt.label
            || original.position !== opt.position
            || (original.color ?? null) !== (opt.color ?? null)
          );
        });

      await Promise.all(
        updatePayloads.map(opt => api.options.update(field.id, opt.id, {
          label: opt.label,
          color: opt.color,
          position: opt.position,
        }))
      );

      const createPayloads = optionDrafts.filter(opt => !opt.id);
      const createdOptions = await Promise.all(
        createPayloads.map(opt => api.options.create(field.id, opt.label, opt.color, opt.position))
      );

      let createdCursor = 0;
      const finalOptions: FieldOption[] = optionDrafts.map((opt) => {
        if (opt.id) {
          return {
            id: opt.id,
            label: opt.label,
            color: opt.color,
            position: opt.position,
          };
        }

        const created = createdOptions[createdCursor++];
        return created;
      });

      onSaved({ ...updatedField, options: finalOptions });
      onClose();
    } catch (err) {
      console.error('Edit field failed', err);
    } finally {
      setSaving(false);
    }
  };

  const { label: typeLabel } = getFieldMeta(field.type);
  const CurrentIcon = iconName ? getIconByName(iconName) : getFieldMeta(field.type).Icon;

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent className="w-80 flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <CurrentIcon size={15} className="text-muted-foreground shrink-0" />
            <SheetTitle className="text-base">Edit field</SheetTitle>
          </div>
          <Badge variant="secondary" className="w-fit text-xs font-normal mt-1">
            {typeLabel}
          </Badge>
        </SheetHeader>

        <div className="flex-1 overflow-auto px-5 py-4 flex flex-col gap-5">

          {/* ── Name ──────────────────────────────────────────────── */}
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Field name"
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>

          <Separator />

          {/* ── Icon ──────────────────────────────────────────────── */}
          <div className="flex flex-col gap-2">
            <Label>Icon</Label>
            <div className="grid grid-cols-6 gap-1.5">
              {ICON_OPTIONS.map(({ name: n, Icon }) => (
                <button
                  key={n}
                  onClick={() => selectIcon(n)}
                  title={n}
                  className={`flex items-center justify-center p-2 rounded-md border transition-colors ${
                    iconName === n
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-accent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon size={14} />
                </button>
              ))}
            </div>
            {iconName && (
              <button
                onClick={() => { setIconName(undefined); patch({ customIcon: undefined }); }}
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline text-left"
              >
                Reset to default icon
              </button>
            )}
          </div>

          <Separator />

          {/* ── Type-specific config ───────────────────────────────── */}

          {/* Select / Multi-select: options manager */}
          {isSelectType && (
            optionsLoading ? (
              <div className="flex items-center gap-2 rounded-md border p-3 text-xs text-muted-foreground">
                <Loader2 size={14} className="animate-spin" />
                Loading options...
              </div>
            ) : (
              <SelectOptionsEditor
                options={optionDrafts}
                onChange={setOptionDrafts}
                addPlaceholder="New option label"
              />
            )
          )}

          {/* Date: format + include time */}
          {field.type === 'date' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Date format</Label>
                <ShadSelect
                  value={config.dateFormat ?? 'YYYY-MM-DD'}
                  onValueChange={v => patch({ dateFormat: v as FieldConfig['dateFormat'] })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_FORMATS.map(f => (
                      <SelectItem key={f.value} value={f.value} className="text-xs">
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </ShadSelect>
              </div>
              <div className="flex items-center justify-between">
                <Label className="font-normal">Include time</Label>
                <Switch
                  checked={config.includeTime ?? false}
                  onCheckedChange={v => patch({ includeTime: v })}
                />
              </div>
            </div>
          )}

          {/* Number: format + precision */}
          {field.type === 'number' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Number format</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between h-8 text-xs px-3 font-normal"
                    >
                      {config.numberFormat
                        ? NUMBER_FORMATS.find(f => f.value === config.numberFormat)?.label
                        : 'Select format...'}
                      <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Filter formats..." className="h-8 text-xs" />
                      <CommandList>
                        <CommandEmpty>No format found.</CommandEmpty>
                        <CommandGroup>
                          {NUMBER_FORMATS.map(f => (
                            <CommandItem
                              key={f.value}
                              value={f.label}
                              onSelect={() => {
                                patch({ numberFormat: f.value as FieldConfig['numberFormat'] });
                              }}
                              className="text-xs"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-3 w-3",
                                  config.numberFormat === f.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {f.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Decimal places is relevant for all of our formats now since they are all numbers/currencies */}
              <div className="flex flex-col gap-1.5">
                <Label>Decimal places</Label>
                <ShadSelect
                  value={config.precision === undefined ? 'default' : config.precision.toString()}
                  onValueChange={v => patch({ precision: v === 'default' ? undefined : parseInt(v) })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default" className="text-xs">Default</SelectItem>
                    {[0, 1, 2, 3, 4, 5].map(n => (
                      <SelectItem key={n} value={n.toString()} className="text-xs">{n}</SelectItem>
                    ))}
                  </SelectContent>
                </ShadSelect>
              </div>

              <Separator />

              <div className="flex flex-col gap-2">
                <Label>Show as</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => patch({ showAs: 'number' })}
                    className={`flex flex-col items-center justify-center py-2 rounded-md border transition-colors ${
                      (config.showAs === 'number' || !config.showAs)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-accent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="text-lg font-semibold leading-none mb-1">42</span>
                    <span className="text-xs">Number</span>
                  </button>
                  <button
                    onClick={() => patch({ showAs: 'bar' })}
                    className={`flex flex-col items-center justify-center py-2 rounded-md border transition-colors ${
                      config.showAs === 'bar'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-accent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="w-8 h-1 bg-current rounded-full mb-2 opacity-50 relative overflow-hidden">
                       <div className="absolute top-0 left-0 bottom-0 w-1/2 bg-current rounded-full" />
                    </div>
                    <span className="text-xs">Bar</span>
                  </button>
                  <button
                    onClick={() => patch({ showAs: 'ring' })}
                    className={`flex flex-col items-center justify-center py-2 rounded-md border transition-colors ${
                      config.showAs === 'ring'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-accent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full border-2 border-current mb-1 opacity-80" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 50%)' }} />
                    <span className="text-xs">Ring</span>
                  </button>
                </div>
              </div>

              {(config.showAs === 'bar' || config.showAs === 'ring') && (
                <div className="bg-muted p-3 rounded-md flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-4">
                    <Label className="font-normal shrink-0">Color</Label>
                    <ShadSelect
                      value={config.color ?? OPTION_COLORS[2]}
                      onValueChange={v => patch({ color: v })}
                    >
                      <SelectTrigger className="h-8 text-xs border-transparent bg-transparent shadow-none hover:bg-background/50 focus:ring-0 px-2 justify-end gap-2 text-right">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPTION_COLORS.map(c => (
                          <SelectItem key={c} value={c} className="text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
                              {c}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </ShadSelect>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <Label className="font-normal shrink-0">Divide by</Label>
                    <Input
                      type="number"
                      value={config.divideBy ?? 100}
                      onChange={e => patch({ divideBy: parseFloat(e.target.value) || 100 })}
                      className="h-8 text-xs w-24 text-right bg-background border-transparent"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <Label className="font-normal shrink-0">Show number</Label>
                    <Switch
                      checked={config.showNumber ?? true}
                      onCheckedChange={v => patch({ showNumber: v })}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Text: rich text toggle */}
          {field.type === 'text' && (
            <div className="flex items-center justify-between">
              <Label className="font-normal">Rich text</Label>
              <Switch
                checked={config.richText ?? false}
                onCheckedChange={v => patch({ richText: v })}
              />
            </div>
          )}

          {/* Person: allow multiple + restrict to specific users */}
          {field.type === 'person' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-normal">Allow multiple people</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Let a cell hold more than one person</p>
                </div>
                <Switch
                  checked={config.allowMultiple ?? false}
                  onCheckedChange={v => patch({ allowMultiple: v })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-normal">Restrict to specific people</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Only show selected members in picker</p>
                </div>
                <Switch
                  checked={(config.allowedUserIds?.length ?? 0) > 0 || config.allowedUserIds !== undefined}
                  onCheckedChange={v => patch({ allowedUserIds: v ? [] : undefined })}
                />
              </div>

              {config.allowedUserIds !== undefined && (
                <div className="flex flex-col gap-1 border rounded-md p-2 max-h-40 overflow-y-auto">
                  {allUsers.length === 0
                    ? <p className="text-xs text-muted-foreground text-center py-2">Loading…</p>
                    : allUsers.map(u => {
                        const selected = (config.allowedUserIds ?? []).includes(u.id);
                        return (
                          <label key={u.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-accent rounded px-1">
                            <input
                              type="checkbox"
                              className="accent-primary"
                              checked={selected}
                              onChange={() => {
                                const prev = config.allowedUserIds ?? [];
                                patch({ allowedUserIds: selected ? prev.filter(id => id !== u.id) : [...prev, u.id] });
                              }}
                            />
                            <img src={u.avatarUrl ?? undefined} alt={u.name} className="w-5 h-5 rounded-full object-cover" />
                            <span className="text-xs">{u.name}</span>
                          </label>
                        );
                      })
                  }
                </div>
              )}
            </div>
          )}

          {/* File: allow multiple */}
          {field?.type === 'file' && (
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-normal">Allow multiple files</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Let users upload more than one file</p>
              </div>
              <Switch checked={config.allowMultipleFiles ?? false} onCheckedChange={v => patch({ allowMultipleFiles: v })} />
            </div>
          )}
        </div>


        {/* Footer */}
        <div className="px-5 py-4 border-t flex gap-2">
          <Button onClick={handleSave} disabled={saving || !name.trim() || (isSelectType && optionsLoading)} className="flex-1">
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
