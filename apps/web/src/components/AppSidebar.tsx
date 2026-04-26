import { Link, useLocation, useNavigate, useParams } from 'react-router';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, SidebarGroupContent, SidebarInset,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import {
  Home, Inbox, Users, Target, ListTodo, Star, FolderKanban, HelpCircle,
  Settings, Zap, ChevronDown, ChevronRight, MoreHorizontal,
  LogOut, Shield, Plus,
} from 'lucide-react';
import { logout, getCurrentUser } from '@/lib/auth-store';
import { tenants, getTenantProjects } from '@/lib/dummy-data';
import { CreateProjectDialog } from './CreateProjectDialog';

interface AppSidebarProps {
  children: React.ReactNode;
  /** Content rendered in the top header bar (breadcrumbs, tabs, action buttons) */
  header?: React.ReactNode;
}

export default function AppSidebar({ children, header }: AppSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams();
  const user = getCurrentUser();
  const currentTenant = tenants.find(t => t.slug === slug) ?? tenants[0];
  const projects = getTenantProjects(currentTenant.id).filter(p => p.status === 'ACTIVE');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  /** Returns true when the current pathname starts with or equals `to` */
  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(to + '/');

  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        {/* Tenant switcher */}
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                    <div
                      className="flex size-8 items-center justify-center rounded-lg text-white text-sm font-bold"
                      style={{ background: '#6366f1' }}
                    >
                      {currentTenant.name[0]}
                    </div>
                    <div className="flex flex-col gap-0.5 text-left text-sm leading-tight">
                      <span className="font-semibold truncate">{currentTenant.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{currentTenant.plan}</span>
                    </div>
                    <ChevronDown className="ml-auto" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]" side="bottom" align="start">
                  {tenants.map(t => (
                    <DropdownMenuItem key={t.id} asChild>
                      <Link to={`/t/${t.slug}`} className="flex items-center gap-2">
                        <div className="size-6 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {t.name[0]}
                        </div>
                        <span>{t.name}</span>
                        <Badge variant="secondary" className="ml-auto text-xs">{t.plan}</Badge>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-muted-foreground">
                    <Plus className="mr-2 size-3" />
                    New Tenant
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          {/* Main nav */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === `/t/${currentTenant.slug}`}
                  >
                    <Link to={`/t/${currentTenant.slug}`}>
                      <Home />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive(`/t/${currentTenant.slug}/inbox`)}>
                    <Link to={`/t/${currentTenant.slug}/inbox`}>
                      <Inbox />
                      <span>Inbox</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(`/t/${currentTenant.slug}/settings/users`)}
                  >
                    <Link to={`/t/${currentTenant.slug}/settings/users`}>
                      <Users />
                      <span>Teams</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive(`/t/${currentTenant.slug}/assigned`)}>
                    <Link to={`/t/${currentTenant.slug}/assigned`}>
                      <Target />
                      <span>Assigned to me</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Favorites */}
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger>
                  <ChevronRight className="transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  <span>Favorites</span>
                  <MoreHorizontal className="ml-auto" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link to={`#`}>
                          <span>🌟</span>
                          <span>Marketing Q3</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link to={`#`}>
                          <span>🚀</span>
                          <span>Product Launch</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>

          {/* Projects */}
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger>
                  <ChevronRight className="transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  <span>Projects</span>
                  <MoreHorizontal className="ml-auto" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {projects.map(p => {
                      const projectBase = `/t/${currentTenant.slug}/projects/${p.id}`;
                      return (
                        <SidebarMenuItem key={p.id}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive(projectBase)}
                          >
                            <Link to={`${projectBase}/kanban`}>
                              <FolderKanban />
                              <span className="truncate">{p.name}</span>
                              <Badge variant="secondary" className="ml-auto text-xs">{p.taskCount}</Badge>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                    <SidebarMenuItem className="mt-2">
                      <CreateProjectDialog>
                        <SidebarMenuButton className="text-muted-foreground">
                          <Plus className="mr-2 size-4" />
                          <span>New</span>
                        </SidebarMenuButton>
                      </CreateProjectDialog>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>

        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={location.pathname === `/t/${currentTenant.slug}/settings`}
              >
                <Link to={`/t/${currentTenant.slug}/settings`}>
                  <Settings />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to={`#`}>
                  <HelpCircle />
                  <span>Help Center</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {user?.role === 'SUPER_ADMIN' && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/admin')}>
                  <Link to="/admin">
                    <Shield />
                    <span>Admin Panel</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            <SidebarMenuItem className="mt-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg">
                    <Avatar className="size-8 rounded-lg">
                      <AvatarFallback className="rounded-lg">{user ? initials(user.name) : 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-0.5 text-left text-sm leading-tight">
                      <span className="font-semibold truncate">{user?.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                    </div>
                    <ChevronDown className="ml-auto" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" className="w-56">
                  <DropdownMenuItem className="flex flex-col items-start gap-0.5">
                    <span className="font-medium">{user?.name}</span>
                    <span className="text-xs text-muted-foreground">{user?.email}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={`/t/${currentTenant.slug}/settings/profile`}>
                      <Users className="mr-2 size-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <FolderKanban className="mr-2 size-4" />
                    My Tasks
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 size-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* Inset main area */}
      <SidebarInset>
        {/* Header: SidebarTrigger + whatever the page passes in */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
          <SidebarTrigger className="-ml-1 shrink-0" />
          <Separator orientation="vertical" className="h-4 shrink-0" />
          {/* Page-specific header content fills the rest */}
          <div className="flex flex-1 items-center gap-2 min-w-0 overflow-hidden">
            {header}
          </div>
        </header>
        <div className="flex flex-col flex-1 overflow-auto">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
