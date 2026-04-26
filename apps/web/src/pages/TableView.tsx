import { useState } from 'react';
import { useParams } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  MoreHorizontal, Plus, Settings2, AlignLeft, Hash, Calendar as CalendarIcon, 
  ChevronDown, List, User, Clock, Search, Sparkles, Languages, CheckSquare, 
  Link as LinkIcon, Phone, Mail, Paperclip
} from 'lucide-react';
import AppSidebar from '@/components/AppSidebar';
import ProjectHeader, { ProjectToolbar } from '@/components/ProjectHeader';
import TaskDetailSheet from '@/components/TaskDetailSheet';
import {
  getProjectTasks, getProjectFields, getUser, getOptionColor,
  projects, type Task, type FieldType
} from '@/lib/dummy-data';

export default function TableView() {
  const { projectId } = useParams();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newPropertyOpen, setNewPropertyOpen] = useState(false);
  const pid = projectId ?? 'p1';
  const tasks = getProjectTasks(pid);
  const fields = getProjectFields(pid).filter(f => !f.isHidden);

  const getFieldIcon = (type: FieldType) => {
    switch (type) {
      case 'string': return <AlignLeft className="size-3.5 text-muted-foreground mr-1.5" />;
      case 'number': return <Hash className="size-3.5 text-muted-foreground mr-1.5" />;
      case 'date': return <CalendarIcon className="size-3.5 text-muted-foreground mr-1.5" />;
      case 'single_option': return <ChevronDown className="size-3.5 text-muted-foreground mr-1.5" />;
      case 'multi_option': return <List className="size-3.5 text-muted-foreground mr-1.5" />;
      case 'created_by':
      case 'updated_by': return <User className="size-3.5 text-muted-foreground mr-1.5" />;
      case 'date_created':
      case 'date_updated': return <Clock className="size-3.5 text-muted-foreground mr-1.5" />;
      case 'uid': return <Hash className="size-3.5 text-muted-foreground mr-1.5" />;
      case 'files': return <Paperclip className="size-3.5 text-muted-foreground mr-1.5" />;
      default: return <AlignLeft className="size-3.5 text-muted-foreground mr-1.5" />;
    }
  };

  const renderCell = (task: Task, fieldName: string) => {
    const fv = task.fieldValues.find(v => {
      const field = getProjectFields(pid).find(f => f.id === v.fieldId);
      return field?.name === fieldName;
    });
    const field = getProjectFields(pid).find(f => f.name === fieldName);
    if (!fv || fv.value === null) return null; // Notion tables usually just leave empty space

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
        return <span className="text-sm text-foreground/80">{new Date(String(fv.value)).toLocaleDateString()}</span>;
      }
      default:
        return <span className="text-sm text-foreground/80">{String(fv.value)}</span>;
    }
  };

  const visibleFields = fields.slice(0, 6);

  return (
    <AppSidebar header={<ProjectHeader activeView="table" />}>
      <ProjectToolbar activeView="table" />
      <div className="flex flex-col flex-1 overflow-auto bg-background">
        <Table className="border-t">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[280px] font-medium text-muted-foreground border-r">
                <div className="flex items-center">
                  <AlignLeft className="size-3.5 mr-1.5" /> Title
                </div>
              </TableHead>
              {visibleFields.map(f => (
                <TableHead key={f.id} className="font-medium text-muted-foreground border-r whitespace-nowrap min-w-[140px]">
                  <div className="flex items-center">
                    {getFieldIcon(f.type)} {f.name}
                  </div>
                </TableHead>
              ))}
              <TableHead className="w-10 p-0 text-center">
                <Popover open={newPropertyOpen} onOpenChange={setNewPropertyOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" className="h-full w-full rounded-none hover:bg-muted text-muted-foreground">
                      <Plus className="size-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <div className="flex items-center border-b px-3 py-2">
                      <Search className="size-4 mr-2 text-muted-foreground" />
                      <input 
                        type="text" 
                        placeholder="Type property name..." 
                        className="flex h-8 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-1">
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">AI Autofill</div>
                      <Button variant="ghost" className="w-full justify-start h-8 px-2 text-sm font-normal">
                        <Sparkles className="size-4 mr-2" /> Summarize <Badge variant="secondary" className="ml-2 text-[10px] h-4 px-1">Basic</Badge>
                      </Button>
                      <Button variant="ghost" className="w-full justify-start h-8 px-2 text-sm font-normal">
                        <Languages className="size-4 mr-2" /> Translate <Badge variant="secondary" className="ml-2 text-[10px] h-4 px-1">Basic</Badge>
                      </Button>

                      <div className="px-2 py-1.5 mt-2 text-xs font-semibold text-muted-foreground">Select type</div>
                      <div className="grid grid-cols-2 gap-1">
                        <Button variant="ghost" className="w-full justify-start h-8 px-2 text-sm font-normal"><AlignLeft className="size-4 mr-2" /> Text</Button>
                        <Button variant="ghost" className="w-full justify-start h-8 px-2 text-sm font-normal"><Hash className="size-4 mr-2" /> Number</Button>
                        <Button variant="ghost" className="w-full justify-start h-8 px-2 text-sm font-normal"><ChevronDown className="size-4 mr-2" /> Select</Button>
                        <Button variant="ghost" className="w-full justify-start h-8 px-2 text-sm font-normal"><List className="size-4 mr-2" /> Multi-select</Button>
                        <Button variant="ghost" className="w-full justify-start h-8 px-2 text-sm font-normal"><CalendarIcon className="size-4 mr-2" /> Date</Button>
                        <Button variant="ghost" className="w-full justify-start h-8 px-2 text-sm font-normal"><User className="size-4 mr-2" /> Person</Button>
                        <Button variant="ghost" className="w-full justify-start h-8 px-2 text-sm font-normal"><Paperclip className="size-4 mr-2" /> Files & media</Button>
                        <Button variant="ghost" className="w-full justify-start h-8 px-2 text-sm font-normal"><CheckSquare className="size-4 mr-2" /> Checkbox</Button>
                        <Button variant="ghost" className="w-full justify-start h-8 px-2 text-sm font-normal"><LinkIcon className="size-4 mr-2" /> URL</Button>
                        <Button variant="ghost" className="w-full justify-start h-8 px-2 text-sm font-normal"><Phone className="size-4 mr-2" /> Phone</Button>
                        <Button variant="ghost" className="w-full justify-start h-8 px-2 text-sm font-normal"><Mail className="size-4 mr-2" /> Email</Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map(task => (
              <TableRow
                key={task.id}
                className="cursor-pointer group hover:bg-muted/30"
                onClick={() => setSelectedTask(task)}
              >
                <TableCell className="border-r border-t-transparent font-medium text-sm">
                  <div className="flex items-center justify-between">
                    <span>{task.title}</span>
                    <Button variant="ghost" size="icon" className="size-6 opacity-0 group-hover:opacity-100 h-6 w-6" onClick={(e) => { e.stopPropagation(); }}>
                      <MoreHorizontal className="size-3" />
                    </Button>
                  </div>
                </TableCell>
                {visibleFields.map(f => (
                  <TableCell key={f.id} className="border-r border-t-transparent">
                    {renderCell(task, f.name)}
                  </TableCell>
                ))}
                <TableCell className="border-t-transparent" />
              </TableRow>
            ))}
            {/* Empty row for "New" button feel */}
            <TableRow className="hover:bg-transparent">
              <TableCell className="border-r border-t-transparent text-muted-foreground p-0">
                <Button variant="ghost" className="w-full justify-start h-full rounded-none font-normal text-muted-foreground hover:bg-muted/50">
                  <Plus className="size-4 mr-2" /> New
                </Button>
              </TableCell>
              {visibleFields.map(f => (
                <TableCell key={f.id} className="border-r border-t-transparent" />
              ))}
              <TableCell className="border-t-transparent" />
            </TableRow>
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
