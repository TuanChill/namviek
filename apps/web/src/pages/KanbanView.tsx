import { useState } from 'react';
import { useParams } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Plus } from 'lucide-react';
import AppSidebar from '@/components/AppSidebar';
import ProjectHeader, { ProjectToolbar } from '@/components/ProjectHeader';
import TaskDetailSheet from '@/components/TaskDetailSheet';
import {
  getProjectTasks, getStatusOptions, getUser, getOptionColor,
  projects, type Task,
} from '@/lib/dummy-data';

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const assignee = task.assigneeId ? getUser(task.assigneeId) : undefined;
  const priorityColor = getOptionColor('p1', 'Priority', task.priority);
  const statusColor = getOptionColor('p1', 'Status', task.status);

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow group"
      onClick={onClick}
    >
      <CardContent className="p-3 flex flex-col gap-2">
        {/* Status bar */}
        <div className="h-0.5 rounded-full -mx-3 -mt-3 mb-1" style={{ backgroundColor: statusColor + '66' }} />

        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug">{task.title}</p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="size-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0 border"
            style={{ backgroundColor: priorityColor + '15', color: priorityColor, borderColor: priorityColor + '40' }}
          >
            {task.priority}
          </Badge>
          {task.tags?.map(tag => (
            <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">{tag}</Badge>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground font-mono">{task.uid}</span>
          <div className="flex items-center gap-1.5">
            {task.dueDate && (
              <span className="text-[10px] text-muted-foreground">
                {new Date(task.dueDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
              </span>
            )}
            {assignee && (
              <Avatar className="size-5">
                <AvatarFallback className="text-[9px]">
                  {assignee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function KanbanView() {
  const { projectId } = useParams();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const projectIdStr = projectId ?? 'p1';
  const tasks = getProjectTasks(projectIdStr);
  const statusOptions = getStatusOptions(projectIdStr);

  const tasksByStatus = statusOptions.reduce<Record<string, Task[]>>((acc, opt) => {
    acc[opt.label] = tasks.filter(t => t.status === opt.label);
    return acc;
  }, {});

  return (
    <AppSidebar header={<ProjectHeader activeView="kanban" />}>
      <ProjectToolbar activeView="kanban" />
      <div className="flex gap-4 p-4 overflow-x-auto flex-1">
        {statusOptions.map(status => {
          const columnTasks = tasksByStatus[status.label] ?? [];
          return (
            <div key={status.id} className="flex flex-col gap-2 w-72 shrink-0">
              {/* Column header */}
              <div className="flex items-center gap-2 py-1">
                <div className="size-2.5 rounded-full" style={{ backgroundColor: status.color }} />
                <span className="text-sm font-medium">{status.label}</span>
                <Badge variant="secondary" className="ml-auto text-xs tabular-nums">{columnTasks.length}</Badge>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2">
                {columnTasks.map(task => (
                  <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
                ))}
              </div>

              {/* Add card */}
              <Button variant="ghost" size="sm" className="justify-start text-muted-foreground hover:text-foreground">
                <Plus className="size-4 mr-1" />
                Add task
              </Button>
            </div>
          );
        })}
      </div>

      <TaskDetailSheet
        task={selectedTask}
        open={selectedTask !== null}
        onClose={() => setSelectedTask(null)}
        projectId={projectIdStr}
      />
    </AppSidebar>
  );
}
