import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { OPTION_COLORS } from '../constants';

export interface EditableSelectOption {
  id?: string;
  label: string;
  color: string;
  position: number;
}

interface SelectOptionsEditorProps {
  options: EditableSelectOption[];
  onChange: (options: EditableSelectOption[]) => void;
  addPlaceholder?: string;
}

function normalizeOptionPositions(options: EditableSelectOption[]): EditableSelectOption[] {
  return options.map((opt, index) => ({ ...opt, position: index + 1 }));
}

function moveOptionWithNormalizedPosition(
  options: EditableSelectOption[],
  index: number,
  direction: 'up' | 'down'
): EditableSelectOption[] {
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= options.length) return options;

  const next = [...options];
  const [moved] = next.splice(index, 1);
  next.splice(targetIndex, 0, moved);
  return normalizeOptionPositions(next);
}

export function SelectOptionsEditor({
  options,
  onChange,
  addPlaceholder = 'Option label',
}: SelectOptionsEditorProps) {
  const [optLabel, setOptLabel] = useState('');
  const [optColor, setOptColor] = useState(OPTION_COLORS[0]);

  const addOption = () => {
    const label = optLabel.trim();
    if (!label) return;

    const normalized = normalizeOptionPositions(options);
    const nextOption: EditableSelectOption = {
      label,
      color: optColor,
      position: normalized.length + 1,
    };

    onChange([...normalized, nextOption]);
    setOptLabel('');
    setOptColor(OPTION_COLORS[(options.length + 1) % OPTION_COLORS.length]);
  };

  const removeOption = (index: number) => {
    onChange(normalizeOptionPositions(options.filter((_, i) => i !== index)));
  };

  const moveOption = (index: number, direction: 'up' | 'down') => {
    onChange(moveOptionWithNormalizedPosition(options, index, direction));
  };

  const updateOptionColor = (index: number, color: string) => {
    onChange(options.map((opt, i) => (i === index ? { ...opt, color } : opt)));
  };

  const updateOptionLabel = (index: number, label: string) => {
    onChange(options.map((opt, i) => (i === index ? { ...opt, label } : opt)));
  };

  return (
    <div className="flex flex-col gap-3">
      <Label>Options</Label>

      {options.length > 0 && (
        <div className="flex flex-col gap-2">
          {options.map((opt, idx) => (
            <div key={opt.id ?? `${idx}`} className="">
              <div className="flex items-center gap-2">
                <div className="w-7 h-9 rounded-md border overflow-hidden shrink-0">
                  <button
                    type="button"
                    onClick={() => moveOption(idx, 'up')}
                    disabled={idx === 0}
                    className="h-1/2 w-full flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Move up"
                  >
                    <ChevronUp size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveOption(idx, 'down')}
                    disabled={idx === options.length - 1}
                    className="h-1/2 w-full flex items-center justify-center border-t text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Move down"
                  >
                    <ChevronDown size={12} />
                  </button>
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="cursor-pointer w-9 h-9 rounded-full hover:bg-secondary border flex items-center justify-center shrink-0"
                      title="Change color"
                    >
                      <span
                        className="w-5 h-5 rounded-full"
                        style={{ backgroundColor: opt.color }}
                      />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="start">
                    <div className="flex flex-wrap gap-1.5 max-w-[160px]">
                      {OPTION_COLORS.map((color) => (
                        <button
                          key={`${opt.id ?? idx}-${color}`}
                          type="button"
                          onClick={() => updateOptionColor(idx, color)}
                          className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                            opt.color === color ? 'border-foreground' : 'border-transparent'
                          }`}
                          style={{ background: color }}
                          title={`Set color ${color}`}
                        />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Input
                  value={opt.label}
                  onChange={e => updateOptionLabel(idx, e.target.value)}
                  placeholder="Option title"
                  className="h-9 text-xs"
                />

                <Button
                  variant={"outline"}
                  size={"icon"}
                  onClick={() => removeOption(idx)}
                  className="bg-background flex items-center justify-center text-muted-foreground hover:text-destructive shrink-0"
                  title="Remove option"
                >
                  <X size={15} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={optLabel}
          onChange={e => setOptLabel(e.target.value)}
          placeholder={addPlaceholder}
          className="h-8 text-xs"
          onKeyDown={e => e.key === 'Enter' && addOption()}
        />
        <div
          className="w-8 h-8 shrink-0 rounded-full border"
          style={{ background: optColor }}
          title="Selected color"
        />
        <Button type="button" size="sm" variant="outline" className="h-8 px-2" onClick={addOption}>
          <Plus size={13} />
        </Button>
      </div>

      <div className="flex flex-wrap gap-1">
        {OPTION_COLORS.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => setOptColor(c)}
            className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
              optColor === c ? 'border-foreground' : 'border-transparent'
            }`}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}
