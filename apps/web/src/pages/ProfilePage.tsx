import AppSidebar from '@/components/AppSidebar';
import { getCurrentUser } from '@/lib/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Mail, Building2, CalendarDays } from 'lucide-react';

export default function ProfilePage() {
  const user = getCurrentUser();

  const initials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <AppSidebar>
      <div className="flex flex-col flex-1 overflow-auto bg-muted/20">
        <div className="flex flex-col gap-8 p-8 max-w-5xl mx-auto w-full">
          
          {/* Profile Header */}
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center bg-card p-6 rounded-xl border shadow-sm">
            <Avatar className="w-24 h-24 border-4 border-background shadow-sm">
              <AvatarFallback className="text-3xl">{user ? initials(user.name) : 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1.5">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">{user?.name || 'User Profile'}</h1>
                  <p className="text-muted-foreground text-lg">{user?.role === 'SUPER_ADMIN' ? 'Super Administrator' : 'Project Member'}</p>
                </div>
                <Button variant="outline">Edit Profile</Button>
              </div>
              <div className="flex gap-4 text-sm text-muted-foreground pt-2">
                <div className="flex items-center gap-1"><Mail className="size-4" /> {user?.email}</div>
                <div className="flex items-center gap-1"><Building2 className="size-4" /> Acme Corp</div>
                <div className="flex items-center gap-1"><MapPin className="size-4" /> San Francisco, CA</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Product manager with a passion for building intuitive tools that help teams collaborate better. 
                    I focus on bridging the gap between engineering, design, and business requirements to deliver 
                    high-quality products on time. When not working, I enjoy hiking and photography.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { text: 'Completed task "Finalize Q3 Roadmap"', time: '2 hours ago' },
                    { text: 'Commented on "User Authentication Flow"', time: 'Yesterday' },
                    { text: 'Created project "Marketing Site Redesign"', time: '3 days ago' },
                    { text: 'Uploaded 3 new files to "Brand Assets"', time: 'Last week' },
                  ].map((activity, i) => (
                    <div key={i} className="flex gap-4 items-start">
                      <div className="mt-0.5 bg-primary/10 p-1.5 rounded-full text-primary">
                        <CalendarDays className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{activity.text}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Skills</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Product Strategy</Badge>
                  <Badge variant="secondary">Agile</Badge>
                  <Badge variant="secondary">UI/UX Design</Badge>
                  <Badge variant="secondary">Data Analysis</Badge>
                  <Badge variant="secondary">Roadmapping</Badge>
                  <Badge variant="secondary">User Research</Badge>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Teams</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">ENG</div>
                    <span className="text-sm font-medium">Engineering Core</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-md bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs">DES</div>
                    <span className="text-sm font-medium">Design System</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-md bg-green-100 text-green-600 flex items-center justify-center font-bold text-xs">MKT</div>
                    <span className="text-sm font-medium">Marketing Q3</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

        </div>
      </div>
    </AppSidebar>
  );
}
