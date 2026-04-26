import { useState } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, Plus, Shield, Building2, Users, Activity } from 'lucide-react';
import { tenants, users } from '@/lib/dummy-data';
import { getCurrentUser } from '@/lib/auth-store';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const user = getCurrentUser();
  const [createOpen, setCreateOpen] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');

  return (
    <div className="min-h-screen bg-background">
      {/* Admin top bar */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between max-w-6xl">
          <div className="flex items-center gap-3">
            <div className="size-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">N</span>
            </div>
            <span className="font-semibold">Namviek</span>
            <span className="text-muted-foreground">/</span>
            <div className="flex items-center gap-1.5">
              <Shield className="size-4 text-primary" />
              <span className="font-medium text-sm">Admin Panel</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/t/${tenants[0].slug}`}>← Back to App</Link>
            </Button>
            <Avatar className="size-7">
              <AvatarFallback className="text-xs">{user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-6 max-w-6xl flex flex-col gap-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Tenants</CardTitle>
              <Building2 className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tenants.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              <Users className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Instance Status</CardTitle>
              <Activity className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium">Healthy</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="tenants">
          <TabsList>
            <TabsTrigger value="tenants">Tenants</TabsTrigger>
            <TabsTrigger value="users">All Users</TabsTrigger>
            <TabsTrigger value="system">System Config</TabsTrigger>
          </TabsList>

          {/* Tenants */}
          <TabsContent value="tenants" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Tenants</CardTitle>
                    <CardDescription className="mt-1">All organisations using this Namviek instance.</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus data-icon="inline-start" />
                    New Tenant
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenants.map(t => {
                      const tUsers = users.filter(u => u.tenantId === t.id);
                      return (
                        <TableRow key={t.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="size-7 rounded-md bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                                {t.name[0]}
                              </div>
                              <span className="font-medium">{t.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">/t/{t.slug}</code>
                          </TableCell>
                          <TableCell>
                            <Badge variant={t.plan === 'PRO' ? 'default' : 'secondary'}>{t.plan}</Badge>
                          </TableCell>
                          <TableCell>{tUsers.length}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{t.createdAt}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-7">
                                  <MoreHorizontal />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link to={`/t/${t.slug}`}>View workspace</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => toast.info('Suspend feature coming soon')}>Suspend</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onSelect={() => toast.info('Delete feature coming soon')}>Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users */}
          <TabsContent value="users" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>Every user across all tenants.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(u => {
                      const tenant = tenants.find(t => t.id === u.tenantId);
                      return (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="size-7">
                                <AvatarFallback className="text-xs">{u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-sm">{u.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                          <TableCell>
                            {tenant && (
                              <Badge variant="outline" className="text-xs">{tenant.name}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={u.role === 'SUPER_ADMIN' ? 'default' : u.role === 'TENANT_ADMIN' ? 'default' : 'secondary'} className="text-xs">
                              {u.role.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Config */}
          <TabsContent value="system" className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Instance Info</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {[
                    { label: 'Version', value: '2.0.0' },
                    { label: 'Node.js', value: '20.x' },
                    { label: 'Database', value: 'PostgreSQL (Demo)' },
                    { label: 'Setup Complete', value: 'Yes' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>MCP Configuration</CardTitle>
                  <CardDescription>AI agent access via Model Context Protocol</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">MCP Endpoint</label>
                    <code className="text-xs bg-muted p-2 rounded">{window.location.origin}/mcp</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-yellow-500" />
                    <span className="text-xs text-muted-foreground">Configure API keys to enable</span>
                  </div>
                  <Button variant="outline" size="sm">Manage API Keys</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Tenant Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Tenant</DialogTitle>
            <DialogDescription>Create a new organisation workspace.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Organisation Name</label>
              <Input placeholder="Acme Corp" value={newTenantName} onChange={e => setNewTenantName(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={() => { toast.success(`Tenant "${newTenantName}" created`); setCreateOpen(false); }}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
