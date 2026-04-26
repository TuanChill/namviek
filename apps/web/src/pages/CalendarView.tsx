import { useState } from 'react';
import { useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, CalendarDays, CalendarRange } from 'lucide-react';
import AppSidebar from '@/components/AppSidebar';
import ProjectHeader, { ProjectToolbar } from '@/components/ProjectHeader';
import TaskDetailSheet from '@/components/TaskDetailSheet';
import { getProjectTasks, getOptionColor, type Task } from '@/lib/dummy-data';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Shared row height in px — used on both left list rows AND right gantt rows */
const ROW_H = 44;

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({
  year, month, tasks, pid, onTaskClick,
}: {
  year: number; month: number; tasks: Task[]; pid: string; onTaskClick: (t: Task) => void;
}) {
  const today = new Date();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const getTasksForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter(t => t.dueDate?.startsWith(dateStr));
  };

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px mb-1">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-xs font-medium text-muted-foreground text-center py-1">{d}</div>
        ))}
      </div>
      {/* Grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden flex-1">
        {cells.map((day, idx) => {
          const dayTasks = day ? getTasksForDay(day) : [];
          return (
            <div
              key={idx}
              className={`bg-background min-h-[96px] p-1.5 flex flex-col gap-1 ${
                day ? 'hover:bg-accent/20 transition-colors' : 'bg-muted/30'
              }`}
            >
              {day && (
                <>
                  <span
                    className={`text-xs font-medium self-end size-5 flex items-center justify-center rounded-full ${
                      isToday(day) ? 'bg-primary text-primary-foreground' : 'text-foreground'
                    }`}
                  >
                    {day}
                  </span>
                  {dayTasks.slice(0, 3).map(task => {
                    const color = getOptionColor(pid, 'Status', task.status);
                    return (
                      <button
                        key={task.id}
                        className="text-[10px] rounded px-1.5 py-0.5 truncate text-left w-full"
                        style={{ backgroundColor: color + '22', color, border: `1px solid ${color}44` }}
                        title={task.title}
                        onClick={() => onTaskClick(task)}
                      >
                        {task.title}
                      </button>
                    );
                  })}
                  {dayTasks.length > 3 && (
                    <span className="text-[10px] text-muted-foreground px-1">+{dayTasks.length - 3} more</span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({
  year, month, weekOffset, tasks, pid, onTaskClick,
}: {
  year: number; month: number; weekOffset: number; tasks: Task[]; pid: string; onTaskClick: (t: Task) => void;
}) {
  // Compute week start (Sunday) from weekOffset relative to current week
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + weekOffset * 7);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const weekStart_ts = weekStart.getTime();
  const weekEnd_ts = days[6].getTime();

  const isToday = (d: Date) => fmt(d) === fmt(today);

  // Tasks that have a dueDate in this week
  const weekTasks = tasks.filter(t => {
    if (!t.dueDate) return false;
    const ts = new Date(t.dueDate).getTime();
    return ts >= weekStart_ts && ts <= weekEnd_ts + 86400000;
  });

  // Compute bar width/offset for a task (treat dueDate as single-day, with 1-day width)
  const totalMs = 7 * 86400000;

  const getBar = (task: Task) => {
    const due = new Date(task.dueDate!);
    const startTs = Math.max(due.getTime(), weekStart_ts);
    const endTs = Math.min(due.getTime() + 86400000, weekEnd_ts + 86400000);
    const left = ((startTs - weekStart_ts) / totalMs) * 100;
    const width = ((endTs - startTs) / totalMs) * 100;
    return { left: `${left.toFixed(1)}%`, width: `${Math.max(width, 12).toFixed(1)}%` };
  };

  return (
    <div className="flex flex-1 overflow-hidden gap-0">
      {/* Left: task list */}
      <div className="w-64 shrink-0 border-r flex flex-col overflow-hidden">
        {/* Header row — same height as right day-header */}
        <div className="h-10 border-b flex items-center px-3 shrink-0">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tasks</span>
          <Badge variant="secondary" className="ml-auto text-xs">{weekTasks.length}</Badge>
        </div>
        {/* Task rows — each exactly ROW_H px */}
        <div className="flex flex-col overflow-auto">
          {weekTasks.length === 0 ? (
            <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height: ROW_H * 3 }}>
              No tasks this week
            </div>
          ) : (
            weekTasks.map(task => {
              const color = getOptionColor(pid, 'Status', task.status);
              const priorityColor = getOptionColor(pid, 'Priority', task.priority);
              return (
                <button
                  key={task.id}
                  className="flex flex-col justify-center gap-0.5 px-3 border-b hover:bg-accent/30 transition-colors text-left shrink-0"
                  style={{ height: ROW_H }}
                  onClick={() => onTaskClick(task)}
                >
                  <span className="text-xs font-medium line-clamp-1 leading-snug">{task.title}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-[10px] text-muted-foreground">{task.status}</span>
                    <Badge
                      variant="secondary"
                      className="text-[9px] px-1 py-0 ml-auto"
                      style={{ backgroundColor: priorityColor + '20', color: priorityColor }}
                    >
                      {task.priority}
                    </Badge>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right: Gantt-style day columns */}
      <div className="flex flex-col flex-1 overflow-auto min-w-0">
        {/* Day header row — h-10, same as left header */}
        <div className="grid grid-cols-7 border-b h-10 shrink-0">
          {days.map(d => (
            <div
              key={d.toISOString()}
              className={`flex flex-col items-center justify-center border-r last:border-r-0 ${
                isToday(d) ? 'bg-primary/5' : ''
              }`}
            >
              <span className="text-[10px] text-muted-foreground">{DAY_NAMES[d.getDay()]}</span>
              <span className={`text-sm font-semibold ${isToday(d) ? 'text-primary' : 'text-foreground'}`}>
                {d.getDate()}
              </span>
            </div>
          ))}
        </div>

        {/* Task bar rows — each exactly ROW_H px, aligning with left list */}
        <div className="relative flex flex-col overflow-auto">
          {/* Column shade overlay */}
          <div className="absolute inset-0 grid grid-cols-7 pointer-events-none z-0">
            {days.map(d => (
              <div
                key={d.toISOString()}
                className={`border-r last:border-r-0 ${isToday(d) ? 'bg-primary/5' : ''}`}
              />
            ))}
          </div>

          {weekTasks.length === 0 ? (
            <div className="flex items-center justify-center text-sm text-muted-foreground relative z-10" style={{ height: ROW_H * 3 }}>
              No tasks to display
            </div>
          ) : (
            weekTasks.map((task, i) => {
              const color = getOptionColor(pid, 'Status', task.status);
              const bar = getBar(task);
              return (
                <div
                  key={task.id}
                  className={`relative border-b flex items-center shrink-0 z-10 ${
                    i % 2 === 1 ? 'bg-muted/20' : ''
                  }`}
                  style={{ height: ROW_H }}
                >
                  <button
                    className="absolute flex items-center gap-1.5 rounded px-2 h-6 text-[10px] font-medium truncate hover:brightness-95 transition-all"
                    style={{
                      left: bar.left,
                      width: bar.width,
                      backgroundColor: color + '33',
                      color,
                      border: `1px solid ${color}66`,
                    }}
                    onClick={() => onTaskClick(task)}
                    title={task.title}
                  >
                    <div className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="truncate">{task.title}</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CalendarView() {
  const { projectId } = useParams();
  const pid = projectId ?? 'p1';
  const tasks = getProjectTasks(pid).filter(t => t.dueDate);

  const today = new Date();
  const [view, setView] = useState<'month' | 'week'>('month');
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const prevPeriod = () => {
    if (view === 'month') {
      if (month === 0) { setYear(y => y - 1); setMonth(11); }
      else setMonth(m => m - 1);
    } else {
      setWeekOffset(w => w - 1);
    }
  };

  const nextPeriod = () => {
    if (view === 'month') {
      if (month === 11) { setYear(y => y + 1); setMonth(0); }
      else setMonth(m => m + 1);
    } else {
      setWeekOffset(w => w + 1);
    }
  };

  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setWeekOffset(0);
  };

  // Week label
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + weekOffset * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekLabel = `${weekStart.toLocaleDateString('en', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const periodLabel = view === 'month' ? `${MONTH_NAMES[month]} ${year}` : weekLabel;

  return (
    <AppSidebar header={<ProjectHeader activeView="calendar" />}>
      <ProjectToolbar activeView="calendar" />
      <div className="flex flex-col flex-1 overflow-hidden p-4 gap-3">
        {/* Toolbar */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">{periodLabel}</h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Month / Week toggle */}
            <Tabs value={view} onValueChange={v => setView(v as 'month' | 'week')}>
              <TabsList className="h-8">
                <TabsTrigger value="month" className="h-7 text-xs px-2.5 gap-1.5">
                  <CalendarDays className="size-3" />
                  Month
                </TabsTrigger>
                <TabsTrigger value="week" className="h-7 text-xs px-2.5 gap-1.5">
                  <CalendarRange className="size-3" />
                  Week
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Navigation */}
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="size-8" onClick={prevPeriod}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToday}>
                Today
              </Button>
              <Button variant="outline" size="icon" className="size-8" onClick={nextPeriod}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* View */}
        {view === 'month' ? (
          <MonthView
            year={year}
            month={month}
            tasks={tasks}
            pid={pid}
            onTaskClick={setSelectedTask}
          />
        ) : (
          <WeekView
            year={year}
            month={month}
            weekOffset={weekOffset}
            tasks={tasks}
            pid={pid}
            onTaskClick={setSelectedTask}
          />
        )}

        {/* Legend (month only) */}
        {view === 'month' && (
          <div className="flex gap-4 flex-wrap shrink-0">
            {[
              { label: 'Backlog', color: '#94a3b8' }, { label: 'In Progress', color: '#6366f1' },
              { label: 'In Review', color: '#f59e0b' }, { label: 'Done', color: '#10b981' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5">
                <div className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
        )}
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
