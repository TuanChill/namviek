import { useState } from 'react';
import { useParams } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { MoreHorizontal, UserPlus } from 'lucide-react';
import AppSidebar from '@/components/AppSidebar';
import { tenants, users } from '@/lib/dummy-data';
import { toast } from 'sonner';

const ROLE_BADGES: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  SUPER_ADMIN: 'default',
  TENANT_ADMIN: 'default',
  MEMBER: 'secondary',
  VIEWER: 'outline',
};

export default function UsersPage() {
  const { slug } = useParams();
  const tenant = tenants.find(t => t.slug === slug) ?? tenants[0];
  const tenantUsers = users.filter(u => u.tenantId === tenant.id);
  const [open, setOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');

  const handleInvite = () => {
    toast.success(`Invite sent to ${inviteEmail}`);
    setOpen(false);
    setInviteEmail('');
  };

  return (
    <AppSidebar header={<h1 className="text-sm font-semibold">Members</h1>}>
      <div className="flex flex-col flex-1 overflow-auto">
        <div className="p-6 max-w-3xl flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mt-1">{tenantUsers.length} members in {tenant.name}</p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus data-icon="inline-start" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite a team member</DialogTitle>
                  <DialogDescription>They'll receive an email invitation to join {tenant.name}.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 pt-2">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Email address</label>
                    <Input
                      type="email"
                      placeholder="colleague@example.com"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Role</label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="TENANT_ADMIN">Admin</SelectItem>
                          <SelectItem value="MEMBER">Member</SelectItem>
                          <SelectItem value="VIEWER">Viewer</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleInvite}>Send Invite</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Team Members</CardTitle>
              <CardDescription>Manage access levels for workspace members.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {tenantUsers.map((u, i) => (
                <div key={u.id}>
                  {i > 0 && <div className="h-px bg-border my-2" />}
                  <div className="flex items-center gap-3 py-1">
                    <Avatar className="size-9">
                      <AvatarFallback>{u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <span className="text-sm font-medium truncate">{u.name}</span>
                      <span className="text-xs text-muted-foreground truncate">{u.email}</span>
                    </div>
                    <Badge variant={ROLE_BADGES[u.role] ?? 'secondary'} className="text-xs shrink-0">
                      {u.role.replace('_', ' ')}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8 shrink-0">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => toast.info('Role change coming soon')}>Change role</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onSelect={() => toast.info('Remove member coming soon')}>Remove</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppSidebar>
  );
}
