import { Link, useParams } from 'react-router';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Kanban, Table2, Calendar, Filter, SlidersHorizontal, Search, Settings } from 'lucide-react';
import { tenants, projects, users } from '@/lib/dummy-data';

interface ProjectHeaderProps {
  activeView: 'kanban' | 'table' | 'calendar';
}

/**
 * Renders into the AppSidebar `header` slot:
 *   breadcrumb  ·  [spacer]  ·  member avatar stack  ·  settings icon button
 */
export default function ProjectHeader({ activeView: _ }: ProjectHeaderProps) {
  const { slug, projectId } = useParams();
  const tenant = tenants.find(t => t.slug === slug) ?? tenants[0];
  const project = projects.find(p => p.id === projectId) ?? projects[0];

  // Demo: pull first 3 users of this tenant as "members"
  const members = users.filter(u => u.tenantId === tenant.id).slice(0, 3);
  const extraCount = Math.max(0, project.memberCount - members.length);

  return (
    <>
      {/* ── Breadcrumb ─────────────────────────────────── */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={`/t/${tenant.slug}`} className="text-muted-foreground hover:text-foreground">
                {tenant.name}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="flex items-center gap-1.5">
              <span>{project.icon}</span>
              <span className="font-medium">{project.name}</span>
              <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-0.5">
                {project.status}
              </Badge>
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* ── Right-side: members + settings ──────────────── */}
      <div className="ml-auto flex items-center gap-2 shrink-0">
        {/* Member avatar stack */}
        <div className="flex items-center">
          {members.map((m, i) => (
            <Avatar
              key={m.id}
              className="size-6 border-2 border-background ring-0"
              style={{ marginLeft: i === 0 ? 0 : -6, zIndex: members.length - i }}
            >
              <AvatarFallback className="text-[9px] bg-muted">
                {m.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          ))}
          {extraCount > 0 && (
            <div
              className="size-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] font-medium text-muted-foreground"
              style={{ marginLeft: -6, zIndex: 0 }}
            >
              +{extraCount}
            </div>
          )}
        </div>

        {/* Settings — icon-only, outline */}
        <Button variant="outline" size="icon" className="size-7" asChild>
          <Link to={`/t/${tenant.slug}/projects/${project.id}/settings`}>
            <Settings className="size-3.5" />
          </Link>
        </Button>
      </div>
    </>
  );
}

/**
 * Rendered as the first child in page content (below the top bar):
 *   view tabs  ·  search  ·  filter  ·  sort
 */
export function ProjectToolbar({ activeView }: ProjectHeaderProps) {
  const { slug, projectId } = useParams();
  const tenant = tenants.find(t => t.slug === slug) ?? tenants[0];
  const project = projects.find(p => p.id === projectId) ?? projects[0];

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b">
      {/* View switcher */}
      <Tabs value={activeView}>
        <TabsList>
          <TabsTrigger value="kanban" asChild>
            <Link to={`/t/${tenant.slug}/projects/${project.id}/kanban`} className="flex items-center gap-1.5">
              <Kanban className="size-3.5" />
              Kanban
            </Link>
          </TabsTrigger>
          <TabsTrigger value="table" asChild>
            <Link to={`/t/${tenant.slug}/projects/${project.id}/table`} className="flex items-center gap-1.5">
              <Table2 className="size-3.5" />
              Table
            </Link>
          </TabsTrigger>
          <TabsTrigger value="calendar" asChild>
            <Link to={`/t/${tenant.slug}/projects/${project.id}/calendar`} className="flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              Calendar
            </Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="h-5 w-px bg-border mx-1" />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input className="pl-8 h-8 w-48 text-sm" placeholder="Search tasks…" />
      </div>

      {/* Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="size-3.5 mr-1.5" />
            Filter
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked>Backlog</DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked>In Progress</DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked>In Review</DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked>Done</DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sort */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <SlidersHorizontal className="size-3.5 mr-1.5" />
            Sort
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked>Priority</DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem>Due Date</DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem>Created</DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem>Assignee</DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
