import { useState } from 'react';
import { useParams } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Plus, Webhook } from 'lucide-react';
import AppSidebar from '@/components/AppSidebar';
import { webhooks as defaultWebhooks, type WebhookEntry } from '@/lib/dummy-data';
import { toast } from 'sonner';

const ALL_EVENTS = [
  'task.created', 'task.updated', 'task.deleted',
  'field.created', 'field.deleted',
  'project.updated', 'member.added', 'member.removed',
];

export default function WebhooksPage() {
  const { slug } = useParams();
  const [hooks, setHooks] = useState<WebhookEntry[]>(defaultWebhooks);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['task.created', 'task.updated']);

  const toggleEvent = (event: string) => {
    setSelectedEvents(prev =>
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
    );
  };

  const toggleHook = (id: string) => {
    setHooks(prev => prev.map(h => h.id === id ? { ...h, isActive: !h.isActive } : h));
    toast.success('Webhook updated');
  };

  const handleCreate = () => {
    if (!url) return;
    const newHook: WebhookEntry = {
      id: `wh-${Date.now()}`,
      projectId: 'p1',
      url,
      events: selectedEvents,
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setHooks(prev => [...prev, newHook]);
    toast.success('Webhook created');
    setOpen(false);
    setUrl('');
  };

  return (
    <AppSidebar>
      <div className="flex flex-col flex-1 overflow-auto">
        <div className="p-6 max-w-3xl flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Webhooks</h1>
              <p className="text-sm text-muted-foreground mt-1">Receive HTTP callbacks when events happen in your projects.</p>
            </div>
            <Button onClick={() => setOpen(true)}>
              <Plus data-icon="inline-start" />
              Add Webhook
            </Button>
          </div>

          {hooks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-3 py-12">
                <Webhook className="size-10 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium">No webhooks yet</p>
                  <p className="text-sm text-muted-foreground">Add a webhook to be notified when events occur.</p>
                </div>
                <Button onClick={() => setOpen(true)}>Add your first webhook</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {hooks.map(hook => (
                <Card key={hook.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm font-mono truncate">{hook.url}</CardTitle>
                          <Badge variant={hook.isActive ? 'default' : 'secondary'} className="text-xs shrink-0">
                            {hook.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs">Created {hook.createdAt}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch checked={hook.isActive} onCheckedChange={() => toggleHook(hook.id)} />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem>Edit</DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem>Test delivery</DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem className="text-destructive">Delete</DropdownMenuCheckboxItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {hook.events.map(event => (
                        <Badge key={event} variant="outline" className="text-[10px] font-mono">{event}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Webhook</DialogTitle>
            <DialogDescription>Enter the URL and select which events will trigger this webhook.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Payload URL</label>
              <Input
                placeholder="https://your-server.com/webhook"
                value={url}
                onChange={e => setUrl(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Events</label>
              <div className="grid grid-cols-2 gap-1.5">
                {ALL_EVENTS.map(event => (
                  <label key={event} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(event)}
                      onChange={() => toggleEvent(event)}
                      className="size-3.5"
                    />
                    <span className="text-xs font-mono">{event}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Create Webhook</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppSidebar>
  );
}
