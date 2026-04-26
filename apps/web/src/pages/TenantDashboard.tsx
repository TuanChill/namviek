import { Link, useParams } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Plus, TrendingUp, Users, CheckSquare } from 'lucide-react';
import AppSidebar from '@/components/AppSidebar';
import { tenants, getTenantProjects, users } from '@/lib/dummy-data';
import { getCurrentUser } from '@/lib/auth-store';

export default function TenantDashboard() {
  const { slug } = useParams();
  const user = getCurrentUser();
  const tenant = tenants.find(t => t.slug === slug) ?? tenants[0];
  const projects = getTenantProjects(tenant.id);
  const activeProjects = projects.filter(p => p.status === 'ACTIVE');
  const tenantUsers = users.filter(u => u.tenantId === tenant.id);

  const totalTasks = projects.reduce((sum, p) => sum + p.taskCount, 0);

  return (
    <AppSidebar>
      <div className="flex flex-col flex-1 overflow-auto">
        <div className="flex flex-col gap-6 p-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
              <p className="text-muted-foreground text-sm">{tenant.name} · {activeProjects.length} active projects</p>
            </div>
            <Button>
              <Plus data-icon="inline-start" />
              New Project
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Projects</CardTitle>
                <TrendingUp className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeProjects.length}</div>
                <p className="text-xs text-muted-foreground mt-1">{projects.filter(p => p.status === 'ARCHIVED').length} archived</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
                <CheckSquare className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTasks}</div>
                <p className="text-xs text-muted-foreground mt-1">across all projects</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Team Members</CardTitle>
                <Users className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tenantUsers.length}</div>
                <div className="flex -space-x-1 mt-2">
                  {tenantUsers.slice(0, 4).map(u => (
                    <Avatar key={u.id} className="size-6 border-2 border-background">
                      <AvatarFallback className="text-[8px]">{u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Projects grid */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Projects</h2>
              <Button variant="ghost" size="sm">View all</Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {projects.map(p => {
                const progress = p.status === 'ARCHIVED' ? 100 : Math.floor(Math.random() * 60) + 30;
                return (
                  <Card key={p.id} className="group hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="size-8 rounded-lg flex items-center justify-center text-lg"
                            style={{ backgroundColor: p.color + '22' }}
                          >
                            {p.icon}
                          </div>
                          <div>
                            <CardTitle className="text-sm">{p.name}</CardTitle>
                            <CardDescription className="text-xs mt-0.5">{p.taskCount} tasks</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant={p.status === 'ARCHIVED' ? 'secondary' : 'outline'} className="text-xs">
                            {p.status}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100">
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link to={`/t/${slug}/projects/${p.id}/settings`}>Settings</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">Archive</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      {p.description && (
                        <p className="text-xs text-muted-foreground">{p.description}</p>
                      )}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Progress</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex -space-x-1">
                          {Array.from({ length: Math.min(p.memberCount, 3) }).map((_, i) => (
                            <Avatar key={i} className="size-5 border-2 border-background">
                              <AvatarFallback className="text-[8px]">{String.fromCharCode(65 + i)}</AvatarFallback>
                            </Avatar>
                          ))}
                          {p.memberCount > 3 && (
                            <div className="size-5 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[8px] font-medium">
                              +{p.memberCount - 3}
                            </div>
                          )}
                        </div>
                        {p.status === 'ACTIVE' && (
                          <Button size="sm" variant="outline" asChild>
                            <Link to={`/t/${slug}/projects/${p.id}/kanban`}>Open →</Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AppSidebar>
  );
}
