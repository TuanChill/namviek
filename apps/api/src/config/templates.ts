import { FieldType } from '@local/database'

export interface TemplateField {
  name: string
  type: FieldType
  fakerRule: string
  options?: string[]
}

export interface Template {
  id: string
  category: string
  name: string
  icon?: string
  description: string
  fields: TemplateField[]
}

export const TEMPLATES: Template[] = [
  // 1. Project Management
  {
    id: 'pm-task-tracker',
    category: 'Project Management',
    name: 'Task Tracker',
    icon: 'CheckSquare',
    description: 'Track tasks, assignees, and due dates.',
    fields: [
      { name: 'Task Name', type: 'text', fakerRule: 'company.catchPhrase' },
      { name: 'Assignee', type: 'person', fakerRule: 'person' },
      { name: 'Status', type: 'select', options: ['To Do', 'In Progress', 'Done'], fakerRule: 'select' },
      { name: 'Priority', type: 'select', options: ['Low', 'Medium', 'High', 'Urgent'], fakerRule: 'select' },
      { name: 'Due Date', type: 'date', fakerRule: 'date.future' }
    ]
  },
  {
    id: 'pm-bug-tracker',
    category: 'Project Management',
    name: 'Bug/Issue Tracker',
    icon: 'Flag',
    description: 'Track and resolve software bugs.',
    fields: [
      { name: 'Issue Title', type: 'text', fakerRule: 'company.bs' },
      { name: 'Reporter', type: 'person', fakerRule: 'person' },
      { name: 'Severity', type: 'select', options: ['Minor', 'Major', 'Critical'], fakerRule: 'select' },
      { name: 'Status', type: 'select', options: ['Open', 'In Review', 'Resolved'], fakerRule: 'select' },
      { name: 'Steps to Reproduce', type: 'text', fakerRule: 'lorem.sentence' }
    ]
  },
  {
    id: 'pm-roadmap',
    category: 'Project Management',
    name: 'Product Roadmap',
    icon: 'Calendar',
    description: 'Plan features and track product progress.',
    fields: [
      { name: 'Feature Name', type: 'text', fakerRule: 'company.catchPhrase' },
      { name: 'Quarter', type: 'select', options: ['Q1', 'Q2', 'Q3', 'Q4'], fakerRule: 'select' },
      { name: 'Status', type: 'select', options: ['Planned', 'Active', 'Released'], fakerRule: 'select' },
      { name: 'Effort Score', type: 'number', fakerRule: 'number.int' },
      { name: 'PM', type: 'person', fakerRule: 'person' }
    ]
  },

  // 2. HR & Recruiting
  {
    id: 'hr-applicant-tracker',
    category: 'HR & Recruiting',
    name: 'Applicant Tracker',
    icon: 'Users',
    description: 'Manage candidates and interview stages.',
    fields: [
      { name: 'Candidate Name', type: 'text', fakerRule: 'person.fullName' },
      { name: 'Role', type: 'select', options: ['Frontend Engineer', 'Backend Engineer', 'Product Manager', 'Designer'], fakerRule: 'select' },
      { name: 'Stage', type: 'select', options: ['Applied', 'Phone Screen', 'Interview', 'Offer', 'Rejected'], fakerRule: 'select' },
      { name: 'Interviewer', type: 'person', fakerRule: 'person' },
      { name: 'Rating', type: 'number', fakerRule: 'number.int' } // Will limit this to 1-5 in generation
    ]
  },
  {
    id: 'hr-employee-directory',
    category: 'HR & Recruiting',
    name: 'Employee Directory',
    icon: 'User',
    description: 'Keep track of employee information.',
    fields: [
      { name: 'Name', type: 'text', fakerRule: 'person.fullName' },
      { name: 'Department', type: 'select', options: ['Engineering', 'Sales', 'Marketing', 'HR'], fakerRule: 'select' },
      { name: 'Role', type: 'text', fakerRule: 'person.jobTitle' },
      { name: 'Start Date', type: 'date', fakerRule: 'date.past' },
      { name: 'Manager', type: 'person', fakerRule: 'person' },
    ]
  },

  // 3. Sales & CRM
  {
    id: 'sales-pipeline',
    category: 'Sales & CRM',
    name: 'Sales Pipeline',
    icon: 'Zap',
    description: 'Track leads and deal sizes.',
    fields: [
      { name: 'Lead Name', type: 'text', fakerRule: 'company.name' },
      { name: 'Deal Value', type: 'number', fakerRule: 'number.int' },
      { name: 'Stage', type: 'select', options: ['Discovery', 'Proposal', 'Negotiation', 'Won', 'Lost'], fakerRule: 'select' },
      { name: 'Contact Email', type: 'text', fakerRule: 'internet.email' },
      { name: 'Account Executive', type: 'person', fakerRule: 'person' }
    ]
  },
  {
    id: 'sales-customer-feedback',
    category: 'Sales & CRM',
    name: 'Customer Feedback',
    icon: 'MessageSquare',
    description: 'Log and review customer feedback.',
    fields: [
      { name: 'Feedback Summary', type: 'text', fakerRule: 'lorem.sentence' },
      { name: 'Customer Name', type: 'text', fakerRule: 'person.fullName' },
      { name: 'Sentiment', type: 'select', options: ['Positive', 'Neutral', 'Negative'], fakerRule: 'select' },
      { name: 'Feature Area', type: 'select', options: ['UI/UX', 'Performance', 'Billing', 'Core Feature'], fakerRule: 'select' },
      { name: 'Date Logged', type: 'date', fakerRule: 'date.recent' }
    ]
  },

  // 4. Marketing
  {
    id: 'mktg-content-calendar',
    category: 'Marketing',
    name: 'Content Calendar',
    icon: 'Bookmark',
    description: 'Plan and schedule content publications.',
    fields: [
      { name: 'Content Title', type: 'text', fakerRule: 'lorem.words' },
      { name: 'Platform', type: 'select', options: ['Blog', 'Twitter', 'LinkedIn', 'YouTube'], fakerRule: 'select' },
      { name: 'Publish Date', type: 'date', fakerRule: 'date.future' },
      { name: 'Author', type: 'person', fakerRule: 'person' },
      { name: 'Status', type: 'select', options: ['Idea', 'Drafting', 'Review', 'Published'], fakerRule: 'select' }
    ]
  },
  {
    id: 'mktg-campaign-tracker',
    category: 'Marketing',
    name: 'Campaign Tracker',
    icon: 'Tag',
    description: 'Track marketing campaign budgets and status.',
    fields: [
      { name: 'Campaign Name', type: 'text', fakerRule: 'company.catchPhrase' },
      { name: 'Budget', type: 'number', fakerRule: 'number.int' },
      { name: 'Start Date', type: 'date', fakerRule: 'date.past' },
      { name: 'End Date', type: 'date', fakerRule: 'date.future' },
      { name: 'Status', type: 'select', options: ['Planning', 'Active', 'Completed'], fakerRule: 'select' },
      { name: 'Campaign Lead', type: 'person', fakerRule: 'person' }
    ]
  }
]
