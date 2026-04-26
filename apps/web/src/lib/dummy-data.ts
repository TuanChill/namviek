// ─── Types ───────────────────────────────────────────────────────────────────

export type Role = 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'MEMBER' | 'VIEWER';
export type FieldType =
  | 'string'
  | 'number'
  | 'date'
  | 'single_option'
  | 'multi_option'
  | 'date_created'
  | 'date_updated'
  | 'created_by'
  | 'updated_by'
  | 'uid'
  | 'files'
  | 'relation';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: Role;
  tenantId: string;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  plan: 'FREE' | 'PRO';
  createdAt: string;
}

export interface FieldOption {
  id: string;
  label: string;
  color: string;
}

export interface Field {
  id: string;
  projectId: string;
  name: string;
  type: FieldType;
  options?: FieldOption[];
  order: number;
  isRequired: boolean;
  isHidden: boolean;
}

export interface FieldValue {
  fieldId: string;
  value: string | number | string[] | null;
}

export interface Task {
  id: string;
  uid: string;
  projectId: string;
  title: string;
  status: string;
  priority: string;
  assigneeId?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  fieldValues: FieldValue[];
  description?: string;
  tags?: string[];
}

export interface Project {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  status: 'ACTIVE' | 'ARCHIVED';
  memberCount: number;
  taskCount: number;
  createdAt: string;
}

export interface WebhookEntry {
  id: string;
  projectId: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
}

export interface Integration {
  id: string;
  type: 'DISCORD' | 'TELEGRAM';
  name: string;
  isActive: boolean;
  config: Record<string, string>;
}

// ─── Tenants ──────────────────────────────────────────────────────────────────

export const tenants: Tenant[] = [
  { id: 't1', slug: 'acme', name: 'Acme Corp', plan: 'PRO', createdAt: '2025-01-10' },
  { id: 't2', slug: 'beta-labs', name: 'Beta Labs', plan: 'FREE', createdAt: '2025-02-05' },
  { id: 't3', slug: 'gamma-inc', name: 'Gamma Inc', plan: 'FREE', createdAt: '2025-03-15' },
];

// ─── Users ────────────────────────────────────────────────────────────────────

export const users: User[] = [
  { id: 'u1', name: 'Alice Johnson', email: 'alice@acme.com', role: 'TENANT_ADMIN', tenantId: 't1' },
  { id: 'u2', name: 'Bob Smith', email: 'bob@acme.com', role: 'MEMBER', tenantId: 't1' },
  { id: 'u3', name: 'Carol White', email: 'carol@acme.com', role: 'MEMBER', tenantId: 't1' },
  { id: 'u4', name: 'David Lee', email: 'david@acme.com', role: 'VIEWER', tenantId: 't1' },
  { id: 'u5', name: 'Eve Martinez', email: 'eve@beta-labs.com', role: 'TENANT_ADMIN', tenantId: 't2' },
  { id: 'sa', name: 'Super Admin', email: 'admin@namviek.io', role: 'SUPER_ADMIN', tenantId: 't1' },
];

// ─── Projects ─────────────────────────────────────────────────────────────────

export const projects: Project[] = [
  {
    id: 'p1',
    tenantId: 't1',
    name: 'Website Redesign',
    description: 'Full redesign of the corporate website',
    icon: '🌐',
    color: '#6366f1',
    status: 'ACTIVE',
    memberCount: 4,
    taskCount: 24,
    createdAt: '2025-02-01',
  },
  {
    id: 'p2',
    tenantId: 't1',
    name: 'Mobile App v2',
    description: 'Second version of our mobile application',
    icon: '📱',
    color: '#10b981',
    status: 'ACTIVE',
    memberCount: 3,
    taskCount: 38,
    createdAt: '2025-02-15',
  },
  {
    id: 'p3',
    tenantId: 't1',
    name: 'API Integration',
    description: 'Third-party API integrations',
    icon: '🔗',
    color: '#f59e0b',
    status: 'ACTIVE',
    memberCount: 2,
    taskCount: 12,
    createdAt: '2025-03-01',
  },
  {
    id: 'p4',
    tenantId: 't1',
    name: 'Q1 Marketing',
    description: 'Marketing campaigns for Q1 2025',
    icon: '📣',
    color: '#ec4899',
    status: 'ARCHIVED',
    memberCount: 2,
    taskCount: 18,
    createdAt: '2025-01-05',
  },
];

// ─── Fields ───────────────────────────────────────────────────────────────────

export const fields: Field[] = [
  { id: 'f1', projectId: 'p1', name: 'Status', type: 'single_option', order: 0, isRequired: true, isHidden: false,
    options: [
      { id: 'o1', label: 'Backlog', color: '#94a3b8' },
      { id: 'o2', label: 'In Progress', color: '#6366f1' },
      { id: 'o3', label: 'In Review', color: '#f59e0b' },
      { id: 'o4', label: 'Done', color: '#10b981' },
    ],
  },
  { id: 'f2', projectId: 'p1', name: 'Priority', type: 'single_option', order: 1, isRequired: false, isHidden: false,
    options: [
      { id: 'p-low', label: 'Low', color: '#94a3b8' },
      { id: 'p-med', label: 'Medium', color: '#f59e0b' },
      { id: 'p-high', label: 'High', color: '#ef4444' },
      { id: 'p-urg', label: 'Urgent', color: '#7c3aed' },
    ],
  },
  { id: 'f3', projectId: 'p1', name: 'Assignee', type: 'created_by', order: 2, isRequired: false, isHidden: false },
  { id: 'f4', projectId: 'p1', name: 'Due Date', type: 'date', order: 3, isRequired: false, isHidden: false },
  { id: 'f5', projectId: 'p1', name: 'Estimate (hrs)', type: 'number', order: 4, isRequired: false, isHidden: false },
  { id: 'f6', projectId: 'p1', name: 'Tags', type: 'multi_option', order: 5, isRequired: false, isHidden: false,
    options: [
      { id: 'tag-ui', label: 'UI', color: '#6366f1' },
      { id: 'tag-be', label: 'Backend', color: '#10b981' },
      { id: 'tag-bug', label: 'Bug', color: '#ef4444' },
      { id: 'tag-feat', label: 'Feature', color: '#f59e0b' },
    ],
  },
  { id: 'f7', projectId: 'p1', name: 'Notes', type: 'string', order: 6, isRequired: false, isHidden: false },
  { id: 'f8', projectId: 'p1', name: 'UID', type: 'uid', order: 7, isRequired: false, isHidden: false },
  { id: 'f9', projectId: 'p1', name: 'Created', type: 'date_created', order: 8, isRequired: false, isHidden: false },
];

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const tasks: Task[] = [
  {
    id: 'task-1', uid: 'WEB-001', projectId: 'p1', title: 'Design new homepage hero section',
    status: 'In Review', priority: 'High', assigneeId: 'u1', dueDate: '2026-05-10',
    createdAt: '2026-04-01', updatedAt: '2026-04-28',
    description: 'Create a compelling hero section with animated gradient background and CTA buttons.',
    tags: ['UI', 'Feature'],
    fieldValues: [
      { fieldId: 'f1', value: 'In Review' }, { fieldId: 'f2', value: 'High' },
      { fieldId: 'f3', value: 'u1' }, { fieldId: 'f4', value: '2026-05-10' },
      { fieldId: 'f5', value: 8 }, { fieldId: 'f6', value: ['UI', 'Feature'] },
    ],
  },
  {
    id: 'task-2', uid: 'WEB-002', projectId: 'p1', title: 'Implement responsive navigation',
    status: 'In Progress', priority: 'High', assigneeId: 'u2', dueDate: '2026-05-05',
    createdAt: '2026-04-02', updatedAt: '2026-04-21',
    description: 'Mobile-first navigation with hamburger menu and smooth transitions.',
    tags: ['UI'],
    fieldValues: [
      { fieldId: 'f1', value: 'In Progress' }, { fieldId: 'f2', value: 'High' },
      { fieldId: 'f3', value: 'u2' }, { fieldId: 'f4', value: '2026-05-05' },
      { fieldId: 'f5', value: 6 }, { fieldId: 'f6', value: ['UI'] },
    ],
  },
  {
    id: 'task-3', uid: 'WEB-003', projectId: 'p1', title: 'Set up CI/CD pipeline',
    status: 'Done', priority: 'Medium', assigneeId: 'u3', dueDate: '2026-04-30',
    createdAt: '2026-04-01', updatedAt: '2026-04-25',
    description: 'Configure GitHub Actions for automated testing and deployment.',
    tags: ['Backend'],
    fieldValues: [
      { fieldId: 'f1', value: 'Done' }, { fieldId: 'f2', value: 'Medium' },
      { fieldId: 'f3', value: 'u3' }, { fieldId: 'f4', value: '2026-04-30' },
      { fieldId: 'f5', value: 4 }, { fieldId: 'f6', value: ['Backend'] },
    ],
  },
  {
    id: 'task-4', uid: 'WEB-004', projectId: 'p1', title: 'Fix broken links on footer',
    status: 'Done', priority: 'Low', assigneeId: 'u2', dueDate: '2026-04-28',
    createdAt: '2026-04-10', updatedAt: '2026-04-22',
    description: 'Several footer links return 404. Needs audit and fixes.',
    tags: ['Bug'],
    fieldValues: [
      { fieldId: 'f1', value: 'Done' }, { fieldId: 'f2', value: 'Low' },
      { fieldId: 'f3', value: 'u2' }, { fieldId: 'f4', value: '2026-04-28' },
      { fieldId: 'f5', value: 1 }, { fieldId: 'f6', value: ['Bug'] },
    ],
  },
  {
    id: 'task-5', uid: 'WEB-005', projectId: 'p1', title: 'Write content for About page',
    status: 'Backlog', priority: 'Medium', assigneeId: undefined, dueDate: '2026-05-20',
    createdAt: '2026-04-15', updatedAt: '2026-04-15',
    description: 'Draft and review copy for the About Us page.',
    tags: ['Feature'],
    fieldValues: [
      { fieldId: 'f1', value: 'Backlog' }, { fieldId: 'f2', value: 'Medium' },
      { fieldId: 'f4', value: '2026-05-20' }, { fieldId: 'f5', value: 3 },
      { fieldId: 'f6', value: ['Feature'] },
    ],
  },
  {
    id: 'task-6', uid: 'WEB-006', projectId: 'p1', title: 'Optimize image assets',
    status: 'Backlog', priority: 'Low', assigneeId: undefined, dueDate: '2026-05-25',
    createdAt: '2026-04-18', updatedAt: '2026-04-18',
    description: 'Compress and convert images to WebP format for better performance.',
    tags: ['Backend'],
    fieldValues: [
      { fieldId: 'f1', value: 'Backlog' }, { fieldId: 'f2', value: 'Low' },
      { fieldId: 'f4', value: '2026-05-25' }, { fieldId: 'f5', value: 2 },
      { fieldId: 'f6', value: ['Backend'] },
    ],
  },
  {
    id: 'task-7', uid: 'WEB-007', projectId: 'p1', title: 'Add dark mode support',
    status: 'In Progress', priority: 'Medium', assigneeId: 'u1', dueDate: '2026-05-15',
    createdAt: '2026-04-20', updatedAt: '2026-04-24',
    description: 'Implement system-aware dark mode using CSS variables.',
    tags: ['UI', 'Feature'],
    fieldValues: [
      { fieldId: 'f1', value: 'In Progress' }, { fieldId: 'f2', value: 'Medium' },
      { fieldId: 'f3', value: 'u1' }, { fieldId: 'f4', value: '2026-05-15' },
      { fieldId: 'f5', value: 5 }, { fieldId: 'f6', value: ['UI', 'Feature'] },
    ],
  },
  {
    id: 'task-8', uid: 'WEB-008', projectId: 'p1', title: 'Performance audit & report',
    status: 'Backlog', priority: 'Urgent', assigneeId: 'u3', dueDate: '2026-05-08',
    createdAt: '2026-04-22', updatedAt: '2026-04-22',
    description: 'Run Lighthouse audit and document opportunities for improvement.',
    tags: ['Backend'],
    fieldValues: [
      { fieldId: 'f1', value: 'Backlog' }, { fieldId: 'f2', value: 'Urgent' },
      { fieldId: 'f3', value: 'u3' }, { fieldId: 'f4', value: '2026-05-08' },
      { fieldId: 'f5', value: 6 }, { fieldId: 'f6', value: ['Backend'] },
    ],
  },
];

// ─── Webhooks ──────────────────────────────────────────────────────────────────

export const webhooks: WebhookEntry[] = [
  {
    id: 'wh1', projectId: 'p1',
    url: 'https://hooks.example.com/namviek',
    events: ['task.created', 'task.updated'],
    isActive: true,
    createdAt: '2025-03-10',
  },
  {
    id: 'wh2', projectId: 'p1',
    url: 'https://api.slack.com/incoming-hooks/abc123',
    events: ['task.created'],
    isActive: false,
    createdAt: '2025-03-15',
  },
];

// ─── Integrations ─────────────────────────────────────────────────────────────

export const integrations: Integration[] = [
  {
    id: 'int1', type: 'DISCORD', name: 'Discord #dev-updates',
    isActive: true,
    config: { webhookUrl: 'https://discord.com/api/webhooks/123/abc', events: 'task.created,task.updated' },
  },
  {
    id: 'int2', type: 'TELEGRAM', name: 'Telegram Acme Bot',
    isActive: false,
    config: { botToken: '123456:ABC-xyz', chatId: '-100123456789' },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getUser(id: string): User | undefined {
  return users.find(u => u.id === id);
}

export function getProjectTasks(projectId: string): Task[] {
  return tasks.filter(t => t.projectId === projectId);
}

export function getProjectFields(projectId: string): Field[] {
  return fields.filter(f => f.projectId === projectId).sort((a, b) => a.order - b.order);
}

export function getTenantProjects(tenantId: string): Project[] {
  return projects.filter(p => p.tenantId === tenantId);
}

export function getStatusOptions(projectId: string): FieldOption[] {
  const statusField = fields.find(f => f.projectId === projectId && f.name === 'Status');
  return statusField?.options ?? [];
}

export function getOptionColor(projectId: string, fieldName: string, value: string): string {
  const field = fields.find(f => f.projectId === projectId && f.name === fieldName);
  return field?.options?.find(o => o.label === value)?.color ?? '#94a3b8';
}
