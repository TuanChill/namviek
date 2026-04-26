import { useState } from 'react';
import { useParams } from 'react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import AppSidebar from '@/components/AppSidebar';
import { projects, users, getProjectFields, getProjectTasks, type Field, type FieldType } from '@/lib/dummy-data';
import { toast } from 'sonner';
import { Trash2, Plus, GripVertical } from 'lucide-react';

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  string: 'Text', number: 'Number', date: 'Date',
  single_option: 'Single Select', multi_option: 'Multi Select',
  date_created: 'Date Created', date_updated: 'Date Updated',
  created_by: 'Created By', updated_by: 'Updated By',
  uid: 'UID', files: 'Files', relation: 'Relation',
};

export default function ProjectSettingsPage() {
  const { projectId } = useParams();
  const pid = projectId ?? 'p1';
  const project = projects.find(p => p.id === pid) ?? projects[0];
  const projectFields = getProjectFields(pid);
  const projectTasks = getProjectTasks(pid);
  const projectMembers = users.slice(0, project.memberCount);

  const [name, setName] = useState(project.name);
  const [desc, setDesc] = useState(project.description ?? '');
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('string');

  return (
    <AppSidebar>
      <div className="flex flex-col flex-1 overflow-auto">
        <div className="p-6 max-w-3xl flex flex-col gap-6">
          <div>
            <h1 className="text-xl font-bold">Project Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">{project.icon} {project.name}</p>
          </div>

          <Tabs defaultValue="general">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="fields">Fields</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="danger">Danger</TabsTrigger>
            </TabsList>

            {/* General */}
            <TabsContent value="general" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Project Details</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Description</label>
                    <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="What's this project about?" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">Total Tasks</span>
                      <span className="font-medium">{projectTasks.length}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">Members</span>
                      <span className="font-medium">{project.memberCount}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">Created</span>
                      <span className="font-medium">{project.createdAt}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">Status</span>
                      <Badge variant={project.status === 'ACTIVE' ? 'default' : 'secondary'} className="w-fit">{project.status}</Badge>
                    </div>
                  </div>
                  <Button className="w-fit" onClick={() => toast.success('Project saved')}>Save Changes</Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Fields */}
            <TabsContent value="fields" className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Dynamic Fields</CardTitle>
                      <CardDescription className="mt-1">{projectFields.length} fields configured</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setAddFieldOpen(true)}>
                      <Plus data-icon="inline-start" />
                      Add Field
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-1">
                  {projectFields.map((field, i) => (
                    <div key={field.id}>
                      {i > 0 && <div className="h-px bg-border my-1" />}
                      <div className="flex items-center gap-3 py-1.5">
                        <GripVertical className="size-4 text-muted-foreground cursor-grab" />
                        <div className="flex flex-col gap-0.5 flex-1">
                          <span className="text-sm font-medium">{field.name}</span>
                          <span className="text-xs text-muted-foreground">{FIELD_TYPE_LABELS[field.type]}</span>
                        </div>
                        {field.isRequired && <Badge variant="outline" className="text-xs">Required</Badge>}
                        {['date_created', 'date_updated', 'created_by', 'updated_by', 'uid'].includes(field.type) && (
                          <Badge variant="secondary" className="text-xs">Auto</Badge>
                        )}
                        <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() => toast.info('Field deletion coming soon')}>
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Members */}
            <TabsContent value="members" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Project Members</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {projectMembers.map((u, i) => (
                    <div key={u.id} className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs">{u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col flex-1">
                        <span className="text-sm font-medium">{u.name}</span>
                        <span className="text-xs text-muted-foreground">{u.email}</span>
                      </div>
                      <Badge variant={i === 0 ? 'default' : 'secondary'} className="text-xs">
                        {i === 0 ? 'Owner' : 'Editor'}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Danger */}
            <TabsContent value="danger" className="mt-4">
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg border-destructive/30">
                    <div>
                      <p className="text-sm font-medium">Archive Project</p>
                      <p className="text-xs text-muted-foreground">Hide from active list but keep all data.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => toast.info('Project archived')}>Archive</Button>
                  </div>
                  <AlertDialog>
                    <div className="flex items-center justify-between p-3 border rounded-lg border-destructive/30">
                      <div>
                        <p className="text-sm font-medium">Delete Project</p>
                        <p className="text-xs text-muted-foreground">Permanently delete all tasks and data.</p>
                      </div>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">Delete</Button>
                      </AlertDialogTrigger>
                    </div>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete <strong>{project.name}</strong> and all its tasks.
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => toast.success('Project deleted (demo)')}>
                          Yes, delete project
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Add Field Dialog */}
      <Dialog open={addFieldOpen} onOpenChange={setAddFieldOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Field</DialogTitle>
            <DialogDescription>Add a new dynamic field to this project's schema.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Field Name</label>
              <Input placeholder="e.g. Sprint, Story Points" value={newFieldName} onChange={e => setNewFieldName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Field Type</label>
              <select
                className="border rounded-md px-3 py-2 text-sm bg-background"
                value={newFieldType}
                onChange={e => setNewFieldType(e.target.value as FieldType)}
              >
                {(Object.entries(FIELD_TYPE_LABELS) as [FieldType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddFieldOpen(false)}>Cancel</Button>
              <Button onClick={() => { toast.success(`Field "${newFieldName}" added`); setAddFieldOpen(false); setNewFieldName(''); }}>
                Add Field
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppSidebar>
  );
}
