import AppSidebar from '@/components/AppSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

const ASSIGNED_TASKS = [
  { id: 'TASK-42', title: 'Implement Stripe Checkout integration', status: 'In Progress', priority: 'High', project: 'E-commerce Platform', dueDate: 'Today' },
  { id: 'TASK-18', title: 'Fix mobile navigation drawer bug', status: 'To Do', priority: 'Medium', project: 'Marketing Site', dueDate: 'Tomorrow' },
  { id: 'TASK-55', title: 'Write unit tests for Authentication flow', status: 'In Review', priority: 'Low', project: 'Core API', dueDate: 'Next Week' },
  { id: 'TASK-09', title: 'Update privacy policy document', status: 'To Do', priority: 'Low', project: 'Legal', dueDate: 'No date' },
];

export default function AssignedToMePage() {
  return (
    <AppSidebar>
      <div className="flex flex-col flex-1 overflow-auto bg-muted/20">
        <div className="flex flex-col gap-6 p-8 max-w-5xl mx-auto w-full">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Assigned to me</h1>
            <p className="text-muted-foreground">Keep track of all tasks assigned to you across all projects.</p>
          </div>

          <div className="flex flex-col gap-4 mt-4">
            {ASSIGNED_TASKS.map(task => (
              <Card key={task.id} className="hover:shadow-sm transition-shadow cursor-pointer">
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      {task.status === 'To Do' ? <Circle className="size-5 text-muted-foreground" /> : <CheckCircle2 className="size-5 text-blue-500" />}
                      <CardTitle className="text-lg">{task.title}</CardTitle>
                    </div>
                    <Badge variant={task.priority === 'High' ? 'destructive' : 'secondary'}>
                      {task.priority} Priority
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2 flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-foreground">{task.id}</span>
                    <span>{task.project}</span>
                    <Badge variant="outline">{task.status}</Badge>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-4" />
                    <span>{task.dueDate}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppSidebar>
  );
}
