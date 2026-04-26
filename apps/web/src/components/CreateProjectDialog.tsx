import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CreateProjectDialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateProjectDialog({ children, open, onOpenChange }: CreateProjectDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [visibility, setVisibility] = useState('Private');
  const [view, setView] = useState('Kanban');

  const isControlled = open !== undefined && onOpenChange !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const handleOpenChange = isControlled ? onOpenChange : setInternalOpen;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] p-0 gap-0 overflow-hidden">
        <div className="p-6">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="text-xl">Create New Project</DialogTitle>
            <DialogDescription className="text-base">
              Set up your new workspace and add members.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-5 pt-6">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Project Name
              </label>
              <Input
                id="name"
                placeholder="e.g. Marketing Campaign"
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="visibility" className="text-sm font-medium">
                Visibility
              </label>
              <Select value={visibility.toLowerCase()} onValueChange={(v) => setVisibility(v === 'private' ? 'Private' : 'Public')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private — Invite only</SelectItem>
                  <SelectItem value="public">Public — Anyone in tenant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="view" className="text-sm font-medium">
                Default View
              </label>
              <Select value={view.toLowerCase()} onValueChange={(v) => setView(v.charAt(0).toUpperCase() + v.slice(1))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select default view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kanban">Kanban</SelectItem>
                  <SelectItem value="table">Table</SelectItem>
                  <SelectItem value="calendar">Calendar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Summary Box matching the design */}
            <div className="mt-2 rounded-xl bg-muted/40 p-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Visibility</span>
                <span className="font-medium text-foreground">{visibility}</span>
              </div>
              <div className="h-px w-full bg-border/50" />
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Default view</span>
                <span className="font-medium text-foreground">{view}</span>
              </div>
              <div className="h-px w-full bg-border/50" />
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-foreground">Estimated setup time</span>
                <span className="text-foreground">Instant</span>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 pt-0">
          <Button 
            className="w-full text-base font-medium rounded-lg" 
            onClick={() => handleOpenChange(false)}
          >
            Create Project
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
