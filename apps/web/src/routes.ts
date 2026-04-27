import { createBrowserRouter, redirect, type LoaderFunctionArgs } from 'react-router';
import { isAuthenticated } from '@/lib/auth-store';

// Pages
import LoginPage from './pages/LoginPage';
import DynamicFieldPage from './pages/DynamicFieldPage';
import SetupPage from './pages/SetupPage';
import KanbanView from './pages/KanbanView';
import TableView from './pages/TableView';
import CalendarView from './pages/CalendarView';
import TimelineView from './pages/TimelineView';
import TenantSettingsPage from './pages/TenantSettingsPage';
import UsersPage from './pages/UsersPage';
import IntegrationsPage from './pages/IntegrationsPage';
import WebhooksPage from './pages/WebhooksPage';
import ProjectSettingsPage from './pages/ProjectSettingsPage';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';
import InboxPage from './pages/InboxPage';
import ProfilePage from './pages/ProfilePage';
import AssignedToMePage from './pages/AssignedToMePage';

// Auth guard: redirect to login if not authenticated
function requireAuth(): null | Response {
  if (!isAuthenticated()) {
    return redirect('/login') as unknown as Response;
  }
  return null;
}

export const router = createBrowserRouter([
  // Public routes
  {
    path: '/login',
    Component: LoginPage,
    loader: () => {
      if (isAuthenticated()) return redirect('/t/acme');
      return null;
    },
  },
  {
    path: '/setup',
    Component: SetupPage,
  },
  {
    path: '/test',
    Component: DynamicFieldPage,
  },

  // Tenant routes (require auth)
  {
    path: '/t/:slug',
    loader: ({ params }: LoaderFunctionArgs) => {
      const guard = requireAuth();
      if (guard) return guard;
      return redirect(`/t/${params.slug}/inbox`);
    },
    Component: () => null,
  },
  {
    path: '/t/:slug/projects/:projectId',
    loader: ({ params }: LoaderFunctionArgs) => {
      const guard = requireAuth();
      if (guard) return guard;
      return redirect(`/t/${params.slug}/projects/${params.projectId}/kanban`);
    },
    Component: () => null,
  },
  {
    path: '/t/:slug/projects/:projectId/kanban',
    Component: KanbanView,
    loader: () => requireAuth(),
  },
  {
    path: '/t/:slug/projects/:projectId/table',
    Component: TableView,
    loader: () => requireAuth(),
  },
  {
    path: '/t/:slug/projects/:projectId/calendar',
    Component: CalendarView,
    loader: () => requireAuth(),
  },
  {
    path: '/t/:slug/projects/:projectId/timeline',
    Component: TimelineView,
    loader: () => requireAuth(),
  },
  {
    path: '/t/:slug/projects/:projectId/settings',
    Component: ProjectSettingsPage,
    loader: () => requireAuth(),
  },
  {
    path: '/t/:slug/settings',
    Component: TenantSettingsPage,
    loader: () => requireAuth(),
  },
  {
    path: '/t/:slug/settings/users',
    Component: UsersPage,
    loader: () => requireAuth(),
  },
  {
    path: '/t/:slug/settings/profile',
    Component: ProfilePage,
    loader: () => requireAuth(),
  },
  {
    path: '/t/:slug/inbox',
    Component: InboxPage,
    loader: () => requireAuth(),
  },
  {
    path: '/t/:slug/assigned',
    Component: AssignedToMePage,
    loader: () => requireAuth(),
  },
  {
    path: '/t/:slug/settings/integrations',
    Component: IntegrationsPage,
    loader: () => requireAuth(),
  },
  {
    path: '/t/:slug/settings/webhooks',
    Component: WebhooksPage,
    loader: () => requireAuth(),
  },

  // Admin routes
  {
    path: '/admin',
    Component: AdminDashboard,
    loader: () => requireAuth(),
  },

  // Root redirect
  {
    path: '/',
    loader: () => {
      if (isAuthenticated()) return redirect('/t/acme');
      return redirect('/login');
    },
    Component: () => null,
  },

  // 404
  {
    path: '*',
    Component: NotFound,
  },
]);
