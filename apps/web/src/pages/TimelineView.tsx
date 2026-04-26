import { useState, useMemo } from 'react';
import { useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import AppSidebar from '@/components/AppSidebar';
import ProjectHeader, { ProjectToolbar } from '@/components/ProjectHeader';
import TaskDetailSheet from '@/components/TaskDetailSheet';
import { getProjectTasks, getStatusOptions, getOptionColor, type Task } from '@/lib/dummy-data';

const ROW_H = 40;
const DAY_W = 48; // px per day column

export default function TimelineView() {
  const { projectId } = useParams();
  const pid = projectId ?? 'p1';
  const tasks = getProjectTasks(pid);
  const statuses = getStatusOptions(pid);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (statusLabel: string) => {
    setCollapsedGroups(prev => ({ ...prev, [statusLabel]: !prev[statusLabel] }));
  };

  // Setup timeline range (e.g. 2 weeks ago to 4 weeks ahead)
  const today = new Date();
  const [offsetDays, setOffsetDays] = useState(-14);
  const totalDays = 60; // Render 60 days total
  
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + offsetDays);

  const days = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    return d;
  });

  const shiftLeft = () => setOffsetDays(d => d - 7);
  const shiftRight = () => setOffsetDays(d => d + 7);
  const goToday = () => setOffsetDays(-14);

  const startTs = days[0].getTime();
  const endTs = days[days.length - 1].getTime() + 86400000;
  const totalMs = endTs - startTs;

  const isToday = (d: Date) => d.toDateString() === today.toDateString();

  const getBar = (task: Task) => {
    if (!task.dueDate) return null;
    const due = new Date(task.dueDate);
    // Mock a duration: 3 days before due date
    const start = new Date(due);
    start.setDate(due.getDate() - 3);

    const tStartTs = Math.max(start.getTime(), startTs);
    const tEndTs = Math.min(due.getTime() + 86400000, endTs);

    if (tEndTs < startTs || tStartTs > endTs) return null; // out of view

    const left = ((tStartTs - startTs) / totalMs) * 100;
    const width = ((tEndTs - tStartTs) / totalMs) * 100;
    return { left: `${left}%`, width: `${width}%` };
  };

  // Group tasks by status
  const groupedTasks = useMemo(() => {
    return statuses.map(status => {
      return {
        status,
        tasks: tasks.filter(t => t.status === status.label)
      };
    });
  }, [tasks, statuses]);

  return (
    <AppSidebar header={<ProjectHeader activeView="timeline" />}>
      <ProjectToolbar activeView="timeline" />
      <div className="flex flex-col flex-1 overflow-hidden p-4 gap-3 bg-background">
        {/* Toolbar */}
        <div className="flex items-center justify-between shrink-0">
          <h2 className="text-base font-semibold">Timeline</h2>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="size-8" onClick={shiftLeft}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" className="size-8" onClick={shiftRight}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        {/* View */}
        <div className="flex flex-1 overflow-hidden border rounded-md">
          {/* Left: Groups & Tasks */}
          <div className="w-64 shrink-0 border-r flex flex-col bg-background z-20">
            <div className="h-10 border-b flex items-center px-3 shrink-0 bg-muted/20">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Tasks</span>
            </div>
            <div className="flex flex-col overflow-y-hidden">
              {groupedTasks.map(group => {
                const isCollapsed = collapsedGroups[group.status.label];
                return (
                  <div key={group.status.id} className="flex flex-col">
                    <button 
                      className="flex items-center gap-2 px-2 border-b hover:bg-accent/30 transition-colors text-left"
                      style={{ height: ROW_H, backgroundColor: group.status.color + '10' }}
                      onClick={() => toggleGroup(group.status.label)}
                    >
                      <ChevronDown className={`size-3.5 transition-transform text-muted-foreground ${isCollapsed ? '-rotate-90' : ''}`} />
                      <div className="size-2 rounded-full" style={{ backgroundColor: group.status.color }} />
                      <span className="text-sm font-medium text-foreground">{group.status.label}</span>
                      <Badge variant="secondary" className="ml-auto text-[10px] px-1 py-0">{group.tasks.length}</Badge>
                    </button>
                    {!isCollapsed && group.tasks.map(task => (
                      <button
                        key={task.id}
                        className="flex items-center px-6 border-b hover:bg-accent/30 transition-colors text-left"
                        style={{ height: ROW_H }}
                        onClick={() => setSelectedTask(task)}
                      >
                        <span className="text-xs truncate">{task.title}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Gantt Chart */}
          <div className="flex flex-col flex-1 overflow-auto relative">
            {/* Header: Months & Days */}
            <div className="sticky top-0 z-10 bg-background border-b flex flex-col shrink-0">
              {/* Top half: Months */}
              <div className="flex border-b" style={{ height: 20 }}>
                {(() => {
                  const months = [];
                  let currMonth = -1;
                  let currWidth = 0;
                  days.forEach(d => {
                    if (d.getMonth() !== currMonth) {
                      if (currMonth !== -1) months.push({ month: currMonth, w: currWidth });
                      currMonth = d.getMonth();
                      currWidth = DAY_W;
                    } else {
                      currWidth += DAY_W;
                    }
                  });
                  if (currWidth > 0) months.push({ month: currMonth, w: currWidth });
                  return months.map((m, i) => (
                    <div key={i} className="border-r px-2 text-[10px] font-medium text-muted-foreground flex items-center" style={{ width: m.w, flexShrink: 0 }}>
                      {new Date(2000, m.month, 1).toLocaleDateString('en', { month: 'long' })}
                    </div>
                  ));
                })()}
              </div>
              {/* Bottom half: Days */}
              <div className="flex" style={{ height: 20 }}>
                {days.map(d => (
                  <div 
                    key={d.toISOString()} 
                    className={`border-r flex items-center justify-center text-[10px] shrink-0 ${isToday(d) ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground'}`}
                    style={{ width: DAY_W }}
                  >
                    {d.getDate()}
                  </div>
                ))}
              </div>
            </div>

            {/* Grid & Bars */}
            <div className="flex" style={{ width: days.length * DAY_W }}>
              {/* Grid Background */}
              <div className="absolute inset-0 flex pointer-events-none">
                {days.map(d => (
                  <div key={d.toISOString()} className={`border-r shrink-0 ${isToday(d) ? 'bg-primary/5' : ''}`} style={{ width: DAY_W }} />
                ))}
              </div>

              {/* Rows */}
              <div className="flex flex-col w-full relative z-0">
                {groupedTasks.map(group => {
                  const isCollapsed = collapsedGroups[group.status.label];
                  return (
                    <div key={group.status.id} className="flex flex-col">
                      {/* Group Header Row */}
                      <div className="border-b" style={{ height: ROW_H, backgroundColor: group.status.color + '05' }} />
                      {/* Task Rows */}
                      {!isCollapsed && group.tasks.map(task => {
                        const bar = getBar(task);
                        const priorityColor = getOptionColor(pid, 'Priority', task.priority);
                        return (
                          <div key={task.id} className="border-b relative flex items-center group/row" style={{ height: ROW_H }}>
                            {bar && (
                              <button
                                className="absolute flex items-center px-2 h-6 rounded-sm text-[10px] font-medium hover:brightness-95 transition-all truncate"
                                style={{
                                  left: bar.left,
                                  width: bar.width,
                                  backgroundColor: group.status.color,
                                  color: '#fff',
                                }}
                                onClick={() => setSelectedTask(task)}
                              >
                                <span className="truncate">{task.title}</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
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
