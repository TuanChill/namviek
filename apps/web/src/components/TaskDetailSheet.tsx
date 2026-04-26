import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  CalendarDays, User2, Tag, FileText, Circle,
  MessageSquare, Activity, MoreHorizontal, CornerUpLeft,
} from 'lucide-react';
import { getUser, getOptionColor, type Task } from '@/lib/dummy-data';

interface TaskDetailSheetProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  projectId?: string;
}

function FieldRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 min-h-8">
      <div className="flex items-center gap-2 w-32 shrink-0 pt-0.5">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <div className="flex-1 pt-0.5">{children}</div>
    </div>
  );
}

// ─── Dummy comments & activity ────────────────────────────────────────────────

const DUMMY_COMMENTS = [
  {
    id: 'c1', author: 'Alice Johnson', initials: 'AJ', date: 'Apr 20, 2026',
    text: 'This looks great! I reviewed the mockups and they align well with the brand guidelines.',
    replies: [
      { id: 'r1', author: 'Bob Smith', initials: 'BS', date: 'Apr 21, 2026', text: 'Agreed — the color palette is on point 👍' },
    ],
  },
  {
    id: 'c2', author: 'Carol White', initials: 'CW', date: 'Apr 22, 2026',
    text: 'Can we make sure to add responsive breakpoints for tablet as well? The current spec only covers mobile and desktop.',
    replies: [],
  },
  {
    id: 'c3', author: 'David Lee', initials: 'DL', date: 'Apr 23, 2026',
    text: 'I have linked the Figma frame to this task for reference.',
    replies: [],
  },
];

const DUMMY_ACTIVITY = [
  { id: 'a1', icon: '🔄', text: 'Status changed to **In Review**', author: 'Alice Johnson', date: 'Apr 23, 2026' },
  { id: 'a2', icon: '👤', text: 'Assigned to **Alice Johnson**', author: 'Bob Smith', date: 'Apr 22, 2026' },
  { id: 'a3', icon: '📅', text: 'Due date set to **May 10, 2026**', author: 'Alice Johnson', date: 'Apr 22, 2026' },
  { id: 'a4', icon: '🏷️', text: 'Tag **UI** added', author: 'Carol White', date: 'Apr 21, 2026' },
  { id: 'a5', icon: '✅', text: 'Task created', author: 'Bob Smith', date: 'Apr 20, 2026' },
];

// ─── Comment thread ───────────────────────────────────────────────────────────

function CommentThread() {
  const [draft, setDraft] = useState('');

  return (
    <div className="flex flex-col gap-5">
      {/* Write comment */}
      <div className="flex flex-col gap-2">
        <Textarea
          placeholder="Write a comment…"
          className="resize-none text-sm min-h-[80px]"
          value={draft}
          onChange={e => setDraft(e.target.value)}
        />
        <Button size="sm" className="self-start" disabled={!draft.trim()}>
          Post comment
        </Button>
      </div>

      <Separator />

      {/* Comment list */}
      <div className="flex flex-col gap-6">
        {DUMMY_COMMENTS.map(c => (
          <div key={c.id} className="flex flex-col gap-3">
            {/* Top-level comment */}
            <div className="flex gap-3">
              <Avatar className="size-7 shrink-0 mt-0.5">
                <AvatarFallback className="text-[10px]">{c.initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{c.author}</span>
                  <span className="text-xs text-muted-foreground">{c.date}</span>
                  <Button variant="ghost" size="icon" className="size-5 ml-auto text-muted-foreground">
                    <MoreHorizontal className="size-3" />
                  </Button>
                </div>
                <p className="text-sm leading-relaxed">{c.text}</p>
                <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors self-start mt-0.5">
                  <CornerUpLeft className="size-3" />
                  Reply
                </button>
              </div>
            </div>

            {/* Replies */}
            {c.replies.map(r => (
              <div key={r.id} className="flex gap-3 ml-10">
                <Avatar className="size-6 shrink-0 mt-0.5">
                  <AvatarFallback className="text-[9px]">{r.initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{r.author}</span>
                    <span className="text-xs text-muted-foreground">{r.date}</span>
                  </div>
                  <p className="text-sm leading-relaxed">{r.text}</p>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Activity log ─────────────────────────────────────────────────────────────

function ActivityLog() {
  return (
    <div className="flex flex-col gap-0.5">
      {DUMMY_ACTIVITY.map((a, i) => (
        <div key={a.id} className="flex gap-3 group">
          {/* Timeline */}
          <div className="flex flex-col items-center shrink-0">
            <div className="size-6 rounded-full bg-muted flex items-center justify-center text-xs">
              {a.icon}
            </div>
            {i < DUMMY_ACTIVITY.length - 1 && (
              <div className="w-px flex-1 bg-border mt-1 mb-1 min-h-[16px]" />
            )}
          </div>
          {/* Content */}
          <div className="flex flex-col gap-0.5 pb-4 flex-1">
            <p className="text-sm" dangerouslySetInnerHTML={{
              __html: a.text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'),
            }} />
            <span className="text-xs text-muted-foreground">{a.author} · {a.date}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TaskDetailSheet({ task, open, onClose, projectId = 'p1' }: TaskDetailSheetProps) {
  if (!task) return null;

  const assignee = task.assigneeId ? getUser(task.assigneeId) : undefined;
  const statusColor = getOptionColor(projectId, 'Status', task.status);
  const priorityColor = getOptionColor(projectId, 'Priority', task.priority);

  const dueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-[520px] sm:max-w-[520px] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Status colour band */}
        <div className="h-1.5 w-full shrink-0" style={{ backgroundColor: statusColor }} />

        {/* Scrollable body */}
        <div className="flex flex-col flex-1 overflow-auto">

          {/* Title section */}
          <SheetHeader className="px-6 pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                {task.uid}
              </code>
              <Badge
                variant="secondary"
                className="text-xs"
                style={{ backgroundColor: statusColor + '22', color: statusColor }}
              >
                <Circle className="size-1.5 fill-current mr-1" />
                {task.status}
              </Badge>
            </div>
            <SheetTitle className="text-lg font-semibold leading-snug text-left">
              {task.title}
            </SheetTitle>
          </SheetHeader>

          <Separator />

          {/* Fields */}
          <div className="flex flex-col gap-3 px-6 py-5">
            <FieldRow icon={<Circle className="size-3.5" />} label="Priority">
              <Badge
                variant="secondary"
                className="text-xs font-medium"
                style={{ backgroundColor: priorityColor + '22', color: priorityColor }}
              >
                {task.priority}
              </Badge>
            </FieldRow>

            <FieldRow icon={<User2 className="size-3.5" />} label="Assignee">
              {assignee ? (
                <div className="flex items-center gap-2">
                  <Avatar className="size-5">
                    <AvatarFallback className="text-[9px]">
                      {assignee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{assignee.name}</span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Unassigned</span>
              )}
            </FieldRow>

            <FieldRow icon={<CalendarDays className="size-3.5" />} label="Due Date">
              {dueDate
                ? <span className="text-sm">{dueDate}</span>
                : <span className="text-sm text-muted-foreground">No due date</span>
              }
            </FieldRow>

            {task.tags && task.tags.length > 0 && (
              <FieldRow icon={<Tag className="size-3.5" />} label="Tags">
                <div className="flex gap-1 flex-wrap">
                  {task.tags.map(t => (
                    <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                  ))}
                </div>
              </FieldRow>
            )}
          </div>

          <Separator />

          {/* Description */}
          <div className="px-6 py-5 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <FileText className="size-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Description</span>
            </div>
            {task.description
              ? <p className="text-sm leading-relaxed">{task.description}</p>
              : <p className="text-sm text-muted-foreground italic">No description provided.</p>
            }
          </div>

          <Separator />

          {/* Comments / Activity tabs */}
          <div className="flex flex-col flex-1 min-h-0">
            <Tabs defaultValue="comments" className="flex flex-col flex-1">
              <TabsList className="justify-start rounded-none border-b bg-transparent h-10 px-4 gap-1">
                <TabsTrigger
                  value="comments"
                  className="rounded-sm h-8 text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none gap-1.5"
                >
                  <MessageSquare className="size-3.5" />
                  Comments
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">{DUMMY_COMMENTS.length}</Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  className="rounded-sm h-8 text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none gap-1.5"
                >
                  <Activity className="size-3.5" />
                  Activity
                </TabsTrigger>
              </TabsList>

              <TabsContent value="comments" className="flex-1 overflow-auto px-6 py-5 mt-0">
                <CommentThread />
              </TabsContent>

              <TabsContent value="activity" className="flex-1 overflow-auto px-6 py-5 mt-0">
                <ActivityLog />
              </TabsContent>
            </Tabs>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  );
}
