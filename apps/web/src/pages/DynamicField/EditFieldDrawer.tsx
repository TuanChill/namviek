import { useState, useEffect } from 'react';
import { Plus, X, Palette } from 'lucide-react';
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
import { OptionChip } from './CellEditors';
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingOption {
  label: string;
  color: string;
}

interface Props {
  open: boolean;
  field: Field | null;
  onClose: () => void;
  /** Called after all API calls succeed with the fully updated field */
  onSaved: (updated: Field) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EditFieldDrawer({ open, field, onClose, onSaved }: Props) {
  // Form state — reset whenever `field` changes
  const [name, setName] = useState('');
  const [config, setConfig] = useState<FieldConfig>({});
  const [iconName, setIconName] = useState<string | undefined>(undefined);

  // Existing options fetched from API (for select / multi_select)
  const [savedOptions, setSavedOptions] = useState<FieldOption[]>([]);
  const [removedOptionIds, setRemovedOptionIds] = useState<Set<string>>(new Set());

  // New options to add
  const [pendingOptions, setPendingOptions] = useState<PendingOption[]>([]);
  const [optLabel, setOptLabel] = useState('');
  const [optColor, setOptColor] = useState(OPTION_COLORS[0]);

  const [saving, setSaving] = useState(false);
  const [allUsers, setAllUsers] = useState<DynUser[]>([]);

  // ── Initialise form when field changes ──────────────────────────────────────
  useEffect(() => {
    if (!field || !open) return;

    setName(field.name);
    setConfig(field.config ?? {});
    setIconName(field.config?.customIcon);
    setRemovedOptionIds(new Set());
    setPendingOptions([]);
    setOptLabel('');
    setOptColor(OPTION_COLORS[0]);

    // Load the latest options from the API for select types
    if (field.type === 'select' || field.type === 'multi_select') {
      // Start with what we already have in state (fast), then sync with server
      setSavedOptions(field.options ?? []);
      api.options
        .list(field.id)
        .then(setSavedOptions)
        .catch(console.error);
    } else {
      setSavedOptions([]);
    }

    // Load users for person fields
    if (field.type === 'person') {
      api.users.list().then(setAllUsers).catch(console.error);
    }
  }, [field, open]);

  if (!field) return null;

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const patch = (partial: Partial<FieldConfig>) =>
    setConfig(c => ({ ...c, ...partial }));

  const isSelectType = field.type === 'select' || field.type === 'multi_select';

  const addPendingOption = () => {
    if (!optLabel.trim()) return;
    setPendingOptions(prev => [...prev, { label: optLabel.trim(), color: optColor }]);
    setOptLabel('');
    setOptColor(OPTION_COLORS[(savedOptions.length + pendingOptions.length + 1) % OPTION_COLORS.length]);
  };

  const toggleRemoveOption = (optionId: string) => {
    setRemovedOptionIds(prev => {
      const next = new Set(prev);
      if (next.has(optionId)) next.delete(optionId); else next.add(optionId);
      return next;
    });
  };

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

      // 2. Remove deleted options
      await Promise.all(
        [...removedOptionIds].map(optId => api.options.delete(field.id, optId))
      );

      // 3. Add new pending options
      const newOptions = await Promise.all(
        pendingOptions.map(o => api.options.create(field.id, o.label, o.color))
      );

      // 4. Build the final options list to hand back to the parent
      const remainingOptions = savedOptions.filter(o => !removedOptionIds.has(o.id));
      const finalOptions: FieldOption[] = [...remainingOptions, ...newOptions];

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
            <div className="flex flex-col gap-3">
              <Label>Options</Label>

              {/* Existing options */}
              {savedOptions.length > 0 && (
                <div className="flex flex-col gap-1">
                  {savedOptions.map(opt => {
                    const isRemoved = removedOptionIds.has(opt.id);
                    return (
                      <div
                        key={opt.id}
                        className={`flex items-center justify-between transition-opacity ${isRemoved ? 'opacity-40' : ''}`}
                      >
                        <OptionChip label={opt.label} color={opt.color ?? '#6366f1'} />
                        <button
                          onClick={() => toggleRemoveOption(opt.id)}
                          className={`transition-colors ${
                            isRemoved
                              ? 'text-muted-foreground hover:text-foreground'
                              : 'text-muted-foreground hover:text-destructive'
                          }`}
                          title={isRemoved ? 'Undo remove' : 'Remove option'}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pending new options */}
              {pendingOptions.length > 0 && (
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-muted-foreground">New (not saved yet)</p>
                  {pendingOptions.map((opt, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <OptionChip label={opt.label} color={opt.color} />
                      <button
                        onClick={() => setPendingOptions(p => p.filter((_, j) => j !== i))}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new option row */}
              <div className="flex gap-2">
                <Input
                  value={optLabel}
                  onChange={e => setOptLabel(e.target.value)}
                  placeholder="New option label"
                  className="h-8 text-xs"
                  onKeyDown={e => e.key === 'Enter' && addPendingOption()}
                />
                <div className="relative">
                  <button
                    className="w-8 h-8 rounded-md border flex items-center justify-center"
                    title="Pick color"
                  >
                    <Palette size={14} style={{ color: optColor }} />
                    <input
                      type="color"
                      value={optColor}
                      onChange={e => setOptColor(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </button>
                </div>
                <Button size="sm" variant="outline" className="h-8 px-2" onClick={addPendingOption}>
                  <Plus size={13} />
                </Button>
              </div>

              {/* Color palette swatches */}
              <div className="flex flex-wrap gap-1">
                {OPTION_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setOptColor(c)}
                    className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                      optColor === c ? 'border-foreground' : 'border-transparent'
                    }`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
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

          {/* Number: format + precision + currency */}
          {field.type === 'number' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Format</Label>
                <ShadSelect
                  value={config.numberFormat ?? 'decimal'}
                  onValueChange={v => patch({ numberFormat: v as FieldConfig['numberFormat'] })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NUMBER_FORMATS.map(f => (
                      <SelectItem key={f.value} value={f.value} className="text-xs">
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </ShadSelect>
              </div>
              {(config.numberFormat === 'decimal' || !config.numberFormat) && (
                <div className="flex flex-col gap-1.5">
                  <Label>Decimal places</Label>
                  <Input
                    type="number"
                    min={0}
                    max={6}
                    value={config.precision ?? 2}
                    onChange={e => patch({ precision: parseInt(e.target.value) })}
                    className="h-8 text-xs"
                  />
                </div>
              )}
              {config.numberFormat === 'currency' && (
                <div className="flex flex-col gap-1.5">
                  <Label>Currency symbol</Label>
                  <Input
                    value={config.currency ?? '$'}
                    onChange={e => patch({ currency: e.target.value })}
                    className="h-8 text-xs"
                    maxLength={3}
                  />
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
          <Button onClick={handleSave} disabled={saving || !name.trim()} className="flex-1">
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
