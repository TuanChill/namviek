# Namviek v2 — Product Requirements Document (PRD)

> **Version:** 1.0  
> **Date:** 2026-04-25  
> **Status:** Draft  
> **Stack:** TypeScript · Vite/React · Hono · PostgreSQL · Prisma · pnpm monorepo

---

## 1. Overview

**Namviek** is a multi-tenant project management platform designed for teams who need flexible, structured workflows. It draws inspiration from tools like Linear, Notion, and Plane — combining opinionated project views (Kanban, Table, Calendar) with Notion-style dynamic fields, robust filtering/sorting, and an extensible integration layer (webhooks, Discord, Telegram, MCP).

The v2 rewrite lives in the `namviek-v2` monorepo and must be built as a clean, production-grade foundation — not a prototype.

---

## 2. Goals & Non-Goals

### Goals
- Build a production-ready project manager with multi-tenancy from day one.
- Support dynamic fields (like Notion databases) across every project view.
- Provide a first-class AI integration path via MCP (Model Context Protocol).
- Keep the codebase modular so views, field types, and integrations can be added without architectural churn.

### Non-Goals (v2 scope)
- No native mobile apps (web-first).
- No real-time collaboration (no CRDTs / operational transforms).
- No billing/subscription management.
- No email notifications (only webhook + app integrations).

---

## 3. User Personas

| Persona | Description |
|---|---|
| **Super Admin** | Bootstraps the installation, manages tenants, global config |
| **Tenant Admin** | Manages users, SSO config, projects within their tenant |
| **Project Member** | Creates/updates tasks, uses views and filters |
| **Viewer** | Read-only access to specific projects |
| **AI Agent** | Accesses data via MCP to automate tasks |

---

## 4. Feature Modules

### 4.1 Authentication

| # | Feature | Notes |
|---|---|---|
| 4.1.1 | **Local auth** (email + password) | Default; always enabled |
| 4.1.2 | **Google OAuth / OpenID Connect** | Configurable per tenant by Tenant Admin |
| 4.1.3 | **Microsoft Entra ID (Azure AD)** | Configurable per tenant by Tenant Admin |
| 4.1.4 | **SSO toggle** | Super Admin or Tenant Admin can enable/disable SSO providers |
| 4.1.5 | **Bearer token auth** | Stateless JWT; used by API clients and MCP |
| 4.1.6 | **Session management** | Refresh token rotation; configurable TTL |

**Implementation note:** Use [Better Auth](https://better-auth.com/) as documented in `docs/authentication-with-better-auth.md`. All provider configuration is stored per-tenant in the database (not in `.env`), so Tenant Admins can toggle providers without a redeploy.

---

### 4.2 First-Run Setup (Onboarding Wizard)

When the database is freshly migrated and no Super Admin exists, the web app redirects to `/setup`. This is a **one-time wizard** that:

1. Creates the Super Admin account (name, email, password).
2. Sets the instance name and public URL.
3. Optionally pre-creates the first tenant.
4. Marks setup as complete (a `SystemConfig` record with `key = "setup_complete"`).

After setup, `/setup` returns `403` if already completed.

---

### 4.3 Tenant Management

A **Tenant** is a fully isolated workspace (company / organisation).

| Field | Type | Notes |
|---|---|---|
| `id` | CUID | Primary key |
| `slug` | String | URL-safe unique name, e.g. `acme` |
| `name` | String | Display name |
| `plan` | Enum | `FREE`, `PRO` (stub for future billing) |
| `authProviders` | JSON | Which SSO providers are enabled + their config |
| `createdAt` | DateTime | |

**Capabilities:**
- Super Admin can create, suspend, and delete tenants.
- Tenant Admin manages members within their tenant.
- Data isolation: every resource (project, task, field) is scoped to a `tenantId`.

---

### 4.4 User Management

| Capability | Who |
|---|---|
| Invite user by email | Tenant Admin |
| Set role (Admin / Member / Viewer) | Tenant Admin |
| Deactivate / remove user | Tenant Admin |
| View all users across tenants | Super Admin |
| Update own profile (name, avatar, password) | Any user |

**Roles (per tenant):**

| Role | Description |
|---|---|
| `TENANT_ADMIN` | Full access within tenant, SSO config, user management |
| `MEMBER` | Create/update/delete projects and tasks they have access to |
| `VIEWER` | Read-only access to projects they are invited to |

---

### 4.5 Project Management

A **Project** belongs to a Tenant and has one or more **Members** with per-project roles (`OWNER`, `EDITOR`, `VIEWER`).

| Field | Type | Notes |
|---|---|---|
| `id` | CUID | |
| `tenantId` | FK | Scoped to tenant |
| `name` | String | |
| `description` | String? | |
| `icon` | String? | Emoji or URL |
| `color` | String? | Hex color for UI |
| `status` | Enum | `ACTIVE`, `ARCHIVED` |
| `createdById` | FK User | |
| `createdAt` / `updatedAt` | DateTime | |

**Project Settings:**
- Rename / archive project
- Manage project members and their roles
- Configure webhooks (see §4.9)
- Configure integrations (see §4.10)

---

### 4.6 Views

Each project supports three **built-in views**. Views are stored with their own filter/sort/groupBy config so each user can have personalised view state.

| View | Description |
|---|---|
| **Kanban** | Cards grouped by a `singleOption` field (default: `Status`). Drag-and-drop between columns. |
| **Table** | Spreadsheet-like grid. All dynamic fields as columns. Inline editing. |
| **Calendar** | Cards placed on a date field (default: `dueDate`). Month/week toggle. |

Views can be duplicated, renamed, and have independent filter/sort saved per view.

---

### 4.7 Dynamic Fields

This is the **core differentiator**. Each project has a schema of **Fields** (columns/properties). Users can add, rename, reorder, and delete fields without developer intervention.

#### 4.7.1 Field Types

| Type | Key | Description |
|---|---|---|
| Short text | `string` | Single-line text |
| Number | `number` | Integer or decimal; optional unit |
| Date | `date` | Date picker; optional time |
| Single option | `single_option` | Dropdown, one value, configurable colors |
| Multiple options | `multi_option` | Multi-select tags |
| Date Created | `date_created` | Auto-set on record creation (read-only) |
| Date Updated | `date_updated` | Auto-updated on any change (read-only) |
| Created By | `created_by` | Auto-set user reference (read-only) |
| Updated By | `updated_by` | Auto-updated user reference (read-only) |
| UID | `uid` | Auto-generated unique identifier (read-only) |
| Files | `files` | One or more file attachments (upload to object storage) |
| Relation | `relation` | Link records across projects within the same tenant |

#### 4.7.2 Field Schema Model

```
Field {
  id          CUID
  projectId   FK Project
  name        String
  type        FieldType
  config      JSON       // options list for single/multi_option, relation target, etc.
  order       Int        // display order
  isRequired  Boolean
  isHidden    Boolean
  createdAt   DateTime
}
```

#### 4.7.3 Record Values (EAV-lite)

Task field values are stored in a `FieldValue` table (one row per task × field). The actual value lives in a typed column:

```
FieldValue {
  id        CUID
  taskId    FK Task
  fieldId   FK Field
  valueText    String?
  valueNumber  Decimal?
  valueDate    DateTime?
  valueJson    Json?      // for multi_option, files, relation arrays
}
```

This avoids schema migrations whenever a field is added/removed.

---

### 4.8 Filter, Search & Sort

Because fields are dynamic, filters must be built dynamically on the API side.

| Capability | Details |
|---|---|
| **Filter** | Compound AND/OR conditions on any field; operators vary by type (equals, contains, gt/lt, is empty, …) |
| **Sort** | Multi-level sort on any field; ASC/DESC |
| **Group By** | Group records by any `singleOption` or user field (mainly for Kanban) |
| **Search** | Full-text search across all `string` field values in a project |

Filter/sort state is serialised as JSON and stored on the **View** record so it persists across sessions.

---

### 4.9 Webhook Support

Projects can register outbound webhooks to notify external services of changes.

| Trigger Event | Description |
|---|---|
| `task.created` | A new task is created |
| `task.updated` | Any field value changes |
| `task.deleted` | A task is deleted |
| `field.created` | A field is added to a project |
| `field.deleted` | A field is removed |
| `project.updated` | Project metadata changes |
| `member.added` | A user is added to a project |
| `member.removed` | A user is removed from a project |

**Webhook model:**
```
Webhook {
  id          CUID
  projectId   FK Project
  url         String
  secret      String     // HMAC-SHA256 signing secret
  events      String[]   // subset of trigger events
  isActive    Boolean
  createdAt   DateTime
}
```

Delivery uses a simple retry queue (exponential back-off, max 5 attempts). Failed deliveries are logged in `WebhookDelivery`.

---

### 4.10 App Integrations

#### 4.10.1 Discord
- Tenant Admin or Project Owner connects a Discord webhook URL.
- Configure which events trigger a Discord notification.
- Rich embed message format: task name, assignee, status change, project link.

#### 4.10.2 Telegram
- Connect via a Telegram Bot token + Chat ID.
- Same event-driven notification model as Discord.
- Messages sent via Telegram Bot API.

Integrations are stored in an `Integration` table linked to a `Project` or `Tenant`:

```
Integration {
  id         CUID
  tenantId   FK Tenant
  projectId  FK Project?  // null = tenant-wide
  type       Enum         // DISCORD | TELEGRAM | ...
  config     Json         // webhook URL, bot token, chat ID, event list
  isActive   Boolean
}
```

---

### 4.11 MCP Support (AI Agent Interface)

Namviek exposes a **Model Context Protocol** server endpoint so AI agents (Claude, GPT, Cursor, etc.) can query and mutate project data.

**Exposed MCP tools (v2 initial set):**

| Tool | Description |
|---|---|
| `list_projects` | List all projects the authed user can see |
| `get_project` | Get project details + field schema |
| `list_tasks` | List tasks with optional filter/sort params |
| `get_task` | Get a single task with all field values |
| `create_task` | Create a new task |
| `update_task` | Update field values on a task |
| `delete_task` | Delete a task |
| `search_tasks` | Full-text search across a project |

MCP auth uses a per-user **API Key** (Bearer token). The MCP server is a separate endpoint (e.g. `/mcp`) on the API server.

---

## 5. Data Architecture

### 5.1 Key Entities (ER Overview)

```
Tenant
  └── User (many-to-many via TenantMember)
  └── Project (many)
        └── ProjectMember (many-to-many User)
        └── Field (many, ordered)
        └── View (many — Kanban/Table/Calendar)
        └── Task (many)
              └── FieldValue (one per Field)
              └── Comment (many)
        └── Webhook (many)
        └── Integration (many)
  └── Integration (tenant-wide, many)

SystemConfig (singleton — stores setup_complete, instance settings)
ApiKey (per user — for MCP access)
WebhookDelivery (append-only log)
```

### 5.2 Multi-Tenancy Strategy

- Row-level tenancy: every resource table has a `tenantId` column.
- Every API route validates that the requesting user belongs to the tenant in context.
- Tenant context is derived from the JWT claim (`tenantId`) or a URL segment (`/t/:tenantSlug/...`).

---

## 6. Technical Architecture

### 6.1 Monorepo Layout

```
namviek-v2/
├── apps/
│   ├── api/          # Hono server (TypeScript)
│   └── web/          # Vite + React (TypeScript)
├── packages/
│   ├── database/     # Prisma schema + generated client + migrations
│   └── api-client/   # Typed fetch client (shared between web and MCP consumers)
├── docs/             # Developer documentation
└── PRD.md
```

### 6.2 Backend (`apps/api`)

- **Framework:** Hono (fast, edge-compatible)
- **Database ORM:** Prisma (PostgreSQL)
- **Auth:** Better Auth (local + OAuth providers)
- **File uploads:** Multipart → S3-compatible object storage (MinIO for local dev)
- **Webhook delivery:** In-process queue (BullMQ or simple pg-based queue in v2)
- **MCP endpoint:** `GET /mcp` (SSE transport for MCP protocol)

**Route structure:**
```
/auth/**              Better Auth routes
/setup                First-run wizard
/api/tenants/**       Tenant CRUD (Super Admin)
/api/users/**         User management
/api/projects/**      Project CRUD + members
/api/projects/:id/fields/**    Field management
/api/projects/:id/tasks/**     Task CRUD + field values
/api/projects/:id/views/**     View management
/api/projects/:id/webhooks/**  Webhook CRUD
/api/integrations/**  Integration management
/api/keys/**          API key management
/mcp                  MCP server endpoint
```

### 6.3 Frontend (`apps/web`)

- **Framework:** Vite + React 19
- **Routing:** React Router v7 (data mode) — see `docs/how-to-add-router-to-react.md`
- **UI components:** shadcn/ui + Radix primitives
- **State management:** React Query (server state) + Zustand (local UI state)
- **Styling:** Vanilla CSS + CSS variables (design tokens)
- **Drag & drop:** `@dnd-kit/core` (Kanban columns + field reordering)

**Page structure:**
```
/setup                        First-run wizard
/login                        Login page (local + OAuth buttons)
/t/:tenantSlug/               Tenant home / project list
/t/:tenantSlug/projects/:id/  Project — redirects to default view
/t/:tenantSlug/projects/:id/kanban
/t/:tenantSlug/projects/:id/table
/t/:tenantSlug/projects/:id/calendar
/t/:tenantSlug/settings/      Tenant settings
/t/:tenantSlug/settings/users
/t/:tenantSlug/settings/integrations
/admin/                       Super Admin panel (tenants, system config)
```

---

## 7. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Security** | All API routes protected by JWT; HMAC webhook signing; secrets never returned after creation |
| **Data isolation** | Strict tenantId scoping; no cross-tenant data leakage |
| **Performance** | Task list queries < 200ms at p95 for up to 10k tasks per project |
| **Extensibility** | Field types, view types, and integration types should be addable without breaking existing data |
| **Developer experience** | `pnpm run dev:all` starts everything; `pnpm run setup` initialises env |
| **API consistency** | REST JSON API with consistent error shape: `{ error: { code, message, details? } }` |

---

## 8. Implementation Phases

### Phase 1 — Foundation ✅ (scaffold exists)
- [x] Monorepo setup (pnpm workspaces, TypeScript, Prisma, Hono, Vite)
- [ ] Prisma schema for all core entities
- [ ] Better Auth integration (local + JWT)
- [ ] First-run setup wizard (web + API)
- [ ] Super Admin panel (tenant CRUD)

### Phase 2 — Core Project Features
- [ ] Tenant & user management UI
- [ ] Project CRUD
- [ ] Dynamic field management (add/edit/delete/reorder)
- [ ] Task CRUD with dynamic field values
- [ ] Table view (first view to build — most foundational)
- [ ] Filter / sort engine (API + UI)

### Phase 3 — Views & UX Polish
- [ ] Kanban view with drag-and-drop
- [ ] Calendar view
- [ ] Search (full-text + field-value search)
- [ ] File upload support
- [ ] Relation field type

### Phase 4 — Integrations & AI
- [ ] Webhook delivery system
- [ ] Discord integration
- [ ] Telegram integration
- [ ] MCP server endpoint
- [ ] API Key management UI
- [ ] SSO (Google, Microsoft Entra ID) per-tenant config UI

---

## 9. Open Questions / Decisions Needed

| # | Question | Default / Proposal |
|---|---|---|
| Q1 | Should `View` filter/sort config be **per-user** or **shared** across the project? | Start with shared; add per-user overrides in Phase 3 |
| Q2 | File storage backend — S3-compatible (MinIO) or local filesystem for v2? | MinIO for local dev, S3 for production |
| Q3 | Should MCP use HTTP SSE or Stdio transport? | HTTP SSE — better for hosted environments |
| Q4 | Task hierarchy — flat list only, or sub-tasks in v2? | Flat list in v2; sub-tasks in v3 |
| Q5 | Comments on tasks — rich text or plain text in v2? | Plain text / Markdown in v2 |
| Q6 | Rate limiting on public API / MCP? | Simple in-memory rate limiter per API key in v2 |

---

## 10. Glossary

| Term | Definition |
|---|---|
| **Tenant** | An isolated workspace belonging to one organisation |
| **Project** | A work container inside a Tenant with its own fields and views |
| **Task** | A single record / item inside a Project |
| **Field** | A dynamic column in a Project's schema |
| **FieldValue** | The value of a specific Field for a specific Task |
| **View** | A saved perspective (Kanban / Table / Calendar) with its own filter/sort config |
| **MCP** | Model Context Protocol — standard for AI agent tool integration |
| **SSO** | Single Sign-On (Google OAuth, Microsoft Entra ID) |
| **Super Admin** | Instance-level administrator (manages tenants) |
| **Tenant Admin** | Organisation-level administrator within a single tenant |
