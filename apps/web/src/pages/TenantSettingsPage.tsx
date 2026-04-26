import { useState } from 'react';
import { useParams } from 'react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import AppSidebar from '@/components/AppSidebar';
import { tenants } from '@/lib/dummy-data';
import { toast } from 'sonner';

export default function TenantSettingsPage() {
  const { slug } = useParams();
  const tenant = tenants.find(t => t.slug === slug) ?? tenants[0];

  const [name, setName] = useState(tenant.name);
  const [tenantSlug, setTenantSlug] = useState(tenant.slug);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [msEnabled, setMsEnabled] = useState(false);

  const handleSave = () => {
    toast.success('Settings saved successfully');
  };

  return (
    <AppSidebar header={<h1 className="text-sm font-semibold">Workspace Settings</h1>}>
      <div className="flex flex-col flex-1 overflow-auto">
        <div className="p-6 max-w-3xl flex flex-col gap-6">
          <div>
            <p className="text-sm text-muted-foreground mt-1">Manage your workspace configuration and authentication</p>
          </div>

          <Tabs defaultValue="general">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="auth">Authentication</TabsTrigger>
              <TabsTrigger value="danger">Danger Zone</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="flex flex-col gap-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Workspace Details</CardTitle>
                  <CardDescription>Update your workspace name and URL slug.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Workspace Name</label>
                    <Input value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">URL Slug</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground shrink-0">/t/</span>
                      <Input value={tenantSlug} onChange={e => setTenantSlug(e.target.value)} />
                    </div>
                    <p className="text-xs text-muted-foreground">Changing the slug will break existing bookmarks.</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Plan</label>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{tenant.plan}</Badge>
                      <Button variant="outline" size="sm">Upgrade to Pro</Button>
                    </div>
                  </div>
                  <Button className="w-fit" onClick={handleSave}>Save Changes</Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Auth Tab */}
            <TabsContent value="auth" className="flex flex-col gap-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Authentication Providers</CardTitle>
                  <CardDescription>Configure which login methods are available to your team.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {/* Local auth */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">Local Auth (Email + Password)</span>
                      <span className="text-xs text-muted-foreground">Always enabled — cannot be disabled.</span>
                    </div>
                    <Badge variant="secondary">Default</Badge>
                  </div>
                  <Separator />
                  {/* Google */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">Google OAuth</span>
                      <span className="text-xs text-muted-foreground">Let users sign in with Google accounts.</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {googleEnabled && (
                        <Button variant="outline" size="sm">Configure</Button>
                      )}
                      <Switch checked={googleEnabled} onCheckedChange={setGoogleEnabled} />
                    </div>
                  </div>
                  {googleEnabled && (
                    <div className="ml-4 flex flex-col gap-3 bg-muted/50 p-3 rounded-lg">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium">Client ID</label>
                        <Input placeholder="your-client-id.apps.googleusercontent.com" className="text-sm" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium">Client Secret</label>
                        <Input type="password" placeholder="••••••••••••" className="text-sm" />
                      </div>
                      <Button size="sm" className="w-fit" onClick={() => toast.success('Google OAuth configured')}>Save</Button>
                    </div>
                  )}
                  <Separator />
                  {/* Microsoft */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">Microsoft Entra ID (Azure AD)</span>
                      <span className="text-xs text-muted-foreground">Enterprise SSO via Microsoft identity platform.</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {msEnabled && (
                        <Button variant="outline" size="sm">Configure</Button>
                      )}
                      <Switch checked={msEnabled} onCheckedChange={setMsEnabled} />
                    </div>
                  </div>
                  {msEnabled && (
                    <div className="ml-4 flex flex-col gap-3 bg-muted/50 p-3 rounded-lg">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium">Tenant ID</label>
                        <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="text-sm" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium">Client ID</label>
                        <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="text-sm" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium">Client Secret</label>
                        <Input type="password" placeholder="••••••••••••" className="text-sm" />
                      </div>
                      <Button size="sm" className="w-fit" onClick={() => toast.success('Entra ID configured')}>Save</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Danger Tab */}
            <TabsContent value="danger" className="flex flex-col gap-4 mt-4">
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  <CardDescription>These actions are irreversible. Proceed with caution.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg border-destructive/30">
                    <div>
                      <p className="text-sm font-medium">Delete Workspace</p>
                      <p className="text-xs text-muted-foreground">Permanently delete all data for {tenant.name}.</p>
                    </div>
                    <Button variant="destructive" size="sm">Delete</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppSidebar>
  );
}
