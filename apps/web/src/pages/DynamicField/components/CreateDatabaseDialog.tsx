import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ICON_CATEGORIES } from '../constants';
import { DatabaseIcon } from './DatabaseIcon';

type CreateDatabaseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, icon: string) => Promise<void> | void;
  defaultIcon?: string;
};

export function CreateDatabaseDialog({
  open,
  onOpenChange,
  onCreate,
  defaultIcon = 'Database',
}: CreateDatabaseDialogProps) {
  const [newDbName, setNewDbName] = useState('');
  const [newDbIcon, setNewDbIcon] = useState(defaultIcon);

  const resetDraft = () => {
    setNewDbName('');
    setNewDbIcon(defaultIcon);
  };

  const handleCreate = async () => {
    const trimmedName = newDbName.trim();
    if (!trimmedName) return;
    await onCreate(trimmedName, newDbIcon);
    resetDraft();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) resetDraft();
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create database</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">Database name</div>
            <Input
              autoFocus
              value={newDbName}
              onChange={(e) => setNewDbName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void handleCreate();
                }
              }}
              placeholder="Database name"
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Database icon</div>
            <div className="flex items-center gap-2 rounded-md border p-2 text-sm">
              <DatabaseIcon icon={newDbIcon} size={18} />
              <span className="text-muted-foreground truncate">{newDbIcon}</span>
            </div>

            <div className="max-h-80 overflow-auto rounded-md border p-3 space-y-4">
              {ICON_CATEGORIES.map((category) => (
                <section key={category.id} className="space-y-2">
                  <h4 className="text-sm font-medium">{category.label}</h4>
                  <div className="grid grid-cols-8 gap-2">
                    {category.icons.map(({ name, Icon }) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setNewDbIcon(name)}
                        className={`flex items-center justify-center p-2.5 rounded-md border transition-colors ${newDbIcon === name ? 'bg-accent border-primary/40' : 'hover:bg-accent'}`}
                        title={name}
                      >
                        <Icon size={16} />
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => { void handleCreate(); }}
              disabled={!newDbName.trim()}
            >
              Create
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
