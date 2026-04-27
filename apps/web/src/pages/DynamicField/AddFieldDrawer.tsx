import { useState } from 'react';
import { Plus, X, Palette } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select as ShadSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OptionChip } from './CellEditors';
import { FIELD_TYPES, OPTION_COLORS, DATE_FORMATS, NUMBER_FORMATS } from './constants';
import type { FieldType, FieldConfig, FieldOption } from './types';

interface PendingOption { label: string; color: string; }

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, type: FieldType, config: FieldConfig, options: PendingOption[]) => Promise<void>;
}

export function AddFieldDrawer({ open, onClose, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<FieldType>('text');
  const [config, setConfig] = useState<FieldConfig>({});
  const [options, setOptions] = useState<PendingOption[]>([]);
  const [optLabel, setOptLabel] = useState('');
  const [optColor, setOptColor] = useState(OPTION_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const patch = (partial: Partial<FieldConfig>) => setConfig(c => ({ ...c, ...partial }));

  const addOption = () => {
    if (!optLabel.trim()) return;
    setOptions(prev => [...prev, { label: optLabel.trim(), color: optColor }]);
    setOptLabel('');
    setOptColor(OPTION_COLORS[options.length % OPTION_COLORS.length]);
  };

  const reset = () => { setName(''); setType('text'); setConfig({}); setOptions([]); setOptLabel(''); };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSubmit(name.trim(), type, config, options);
      reset();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const isSelectType = type === 'select' || type === 'multi_select';

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent className="w-80 flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 py-4 border-b">
          <SheetTitle className="text-base">Add field</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-auto px-5 py-4 flex flex-col gap-5">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Field name"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {/* Type grid */}
          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <div className="grid grid-cols-2 gap-1.5 pr-1">
              {FIELD_TYPES.map(({ type: t, label, Icon }) => (
                <button
                  key={t}
                  onClick={() => { setType(t); setConfig({}); setOptions([]); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm text-left transition-colors ${
                    type === t
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-accent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon size={14} className="shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* ── Type-specific config ─────────────────────────── */}

          {/* Select / Multi-select: options manager */}
          {isSelectType && (
            <div className="flex flex-col gap-3">
              <Label>Options</Label>
              {options.length > 0 && (
                <div className="flex flex-col gap-1">
                  {options.map((opt, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <OptionChip label={opt.label} color={opt.color} />
                      <button onClick={() => setOptions(p => p.filter((_, j) => j !== i))}
                        className="text-muted-foreground hover:text-destructive transition-colors">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={optLabel}
                  onChange={e => setOptLabel(e.target.value)}
                  placeholder="Option label"
                  className="h-8 text-xs"
                  onKeyDown={e => e.key === 'Enter' && addOption()}
                />
                <div className="relative">
                  <button className="w-8 h-8 rounded-md border flex items-center justify-center" title="Pick color">
                    <Palette size={14} style={{ color: optColor }} />
                    <input type="color" value={optColor} onChange={e => setOptColor(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                  </button>
                </div>
                <Button size="sm" variant="outline" className="h-8 px-2" onClick={addOption}>
                  <Plus size={13} />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {OPTION_COLORS.map(c => (
                  <button key={c} onClick={() => setOptColor(c)}
                    className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${optColor === c ? 'border-foreground' : 'border-transparent'}`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
          )}

          {/* Date: format + include time */}
          {type === 'date' && (
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
                      <SelectItem key={f.value} value={f.value} className="text-xs">{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </ShadSelect>
              </div>
              <div className="flex items-center justify-between">
                <Label className="font-normal">Include time</Label>
                <Switch checked={config.includeTime ?? false} onCheckedChange={v => patch({ includeTime: v })} />
              </div>
            </div>
          )}

          {/* Number: format + precision */}
          {type === 'number' && (
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
                      <SelectItem key={f.value} value={f.value} className="text-xs">{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </ShadSelect>
              </div>
              {(config.numberFormat === 'decimal' || !config.numberFormat) && (
                <div className="flex flex-col gap-1.5">
                  <Label>Decimal places</Label>
                  <Input
                    type="number" min={0} max={6}
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
                    className="h-8 text-xs" maxLength={3}
                  />
                </div>
              )}
            </div>
          )}

          {/* Text: rich text toggle */}
          {type === 'text' && (
            <div className="flex items-center justify-between">
              <Label className="font-normal">Rich text</Label>
              <Switch checked={config.richText ?? false} onCheckedChange={v => patch({ richText: v })} />
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t flex gap-2">
          <Button onClick={handleSubmit} disabled={saving || !name.trim()} className="flex-1">
            {saving ? 'Adding…' : 'Add field'}
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
