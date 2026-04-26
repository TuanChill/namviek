import { useState } from 'react';
import { useParams } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { MoreHorizontal, Plus, Settings2 } from 'lucide-react';
import AppSidebar from '@/components/AppSidebar';
import ProjectHeader, { ProjectToolbar } from '@/components/ProjectHeader';
import TaskDetailSheet from '@/components/TaskDetailSheet';
import {
  getProjectTasks, getProjectFields, getUser, getOptionColor,
  projects, type Task,
} from '@/lib/dummy-data';

export default function TableView() {
  const { projectId } = useParams();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const pid = projectId ?? 'p1';
  const tasks = getProjectTasks(pid);
  const fields = getProjectFields(pid).filter(f => !f.isHidden);

  const renderCell = (task: Task, fieldName: string) => {
    const fv = task.fieldValues.find(v => {
      const field = getProjectFields(pid).find(f => f.id === v.fieldId);
      return field?.name === fieldName;
    });
    const field = getProjectFields(pid).find(f => f.name === fieldName);
    if (!fv || fv.value === null) return <span className="text-muted-foreground">—</span>;

    switch (field?.type) {
      case 'single_option': {
        const color = getOptionColor(pid, fieldName, String(fv.value));
        return (
          <Badge variant="secondary" className="text-xs font-normal"
            style={{ backgroundColor: color + '22', color, borderColor: color + '44' }}>
            {String(fv.value)}
          </Badge>
        );
      }
      case 'multi_option': {
        const vals = Array.isArray(fv.value) ? fv.value : [fv.value];
        return (
          <div className="flex gap-1 flex-wrap">
            {vals.map(v => <Badge key={String(v)} variant="outline" className="text-xs">{String(v)}</Badge>)}
          </div>
        );
      }
      case 'created_by':
      case 'updated_by': {
        const user = getUser(String(fv.value));
        return user ? (
          <div className="flex items-center gap-1.5">
            <Avatar className="size-5">
              <AvatarFallback className="text-[9px]">{user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
            </Avatar>
            <span className="text-sm">{user.name}</span>
          </div>
        ) : null;
      }
      case 'date': {
        return <span className="text-sm">{new Date(String(fv.value)).toLocaleDateString()}</span>;
      }
      default:
        return <span className="text-sm">{String(fv.value)}</span>;
    }
  };

  const visibleFields = fields.slice(0, 6); // cap for display

  return (
    <AppSidebar header={<ProjectHeader activeView="table" />}>
      <ProjectToolbar activeView="table" />
      <div className="flex flex-col flex-1 overflow-auto">
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <span className="text-sm text-muted-foreground">{tasks.length} tasks</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Settings2 data-icon="inline-start" />
              Fields
            </Button>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[280px]">Title</TableHead>
              {visibleFields.map(f => (
                <TableHead key={f.id}>{f.name}</TableHead>
              ))}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map(task => (
              <TableRow
                key={task.id}
                className="cursor-pointer"
                onClick={() => setSelectedTask(task)}
              >
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-sm">{task.title}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{task.uid}</span>
                  </div>
                </TableCell>
                {visibleFields.map(f => (
                  <TableCell key={f.id}>{renderCell(task, f.name)}</TableCell>
                ))}
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="size-7">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Open</DropdownMenuItem>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <TaskDetailSheet
        task={selectedTask}
        open={selectedTask !== null}
        onClose={() => setSelectedTask(null)}
        projectId={pid}
      />
    </AppSidebar>
  );
}
