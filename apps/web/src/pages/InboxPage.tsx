import AppSidebar from '@/components/AppSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Bell, CheckCircle } from 'lucide-react';

const INBOX_ITEMS = [
  { id: 1, title: 'Alex Chen mentioned you', description: '@user what do you think about the new hero section design? I added some gradients.', time: '2 hours ago', read: false, type: 'mention' },
  { id: 2, title: 'Task "Update API Docs" completed', description: 'Jane Doe marked the task as done. You were subscribed to this task.', time: '5 hours ago', read: false, type: 'system' },
  { id: 3, title: 'New comment on "Fix Auth Bug"', description: 'I think the issue is in the token refresh logic, we should probably check the expiry window.', time: '1 day ago', read: true, type: 'comment' },
  { id: 4, title: 'Project "Marketing Q3" created', description: 'You have been added to the new project by Admin.', time: '2 days ago', read: true, type: 'system' },
];

export default function InboxPage() {
  const unreadCount = INBOX_ITEMS.filter(i => !i.read).length;

  return (
    <AppSidebar>
      <div className="flex flex-col flex-1 overflow-auto bg-muted/20">
        <div className="flex flex-col gap-6 p-8 max-w-4xl mx-auto w-full">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">Inbox</h1>
              <p className="text-muted-foreground">You have {unreadCount} unread notifications.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-2">
            {INBOX_ITEMS.map(item => (
              <Card key={item.id} className={`hover:bg-muted/50 transition-colors cursor-pointer ${!item.read ? 'border-l-4 border-l-blue-500' : ''}`}>
                <CardContent className="p-4 flex gap-4">
                  <div className="mt-1">
                    {item.type === 'mention' && <div className="bg-orange-100 text-orange-600 p-2 rounded-full"><MessageSquare className="size-4" /></div>}
                    {item.type === 'system' && <div className="bg-blue-100 text-blue-600 p-2 rounded-full"><Bell className="size-4" /></div>}
                    {item.type === 'comment' && <div className="bg-green-100 text-green-600 p-2 rounded-full"><CheckCircle className="size-4" /></div>}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`text-base ${!item.read ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>{item.title}</h4>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">{item.time}</span>
                    </div>
                    <p className={`text-sm ${!item.read ? 'text-foreground/90' : 'text-muted-foreground'}`}>{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppSidebar>
  );
}
