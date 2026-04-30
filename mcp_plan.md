# MCP Server — Namviek Dynamic Field System

## Overview

Build a **Model Context Protocol (MCP) server** that wraps the Dynamic Field app's REST API and exposes every operation as a typed, AI-callable **tool**. AI agents (Claude, Gemini, Codex/ChatGPT) can then use these tools to create databases, manage fields, write records, query data, and generate statistics — all in natural language.

---

## Can We Do Statistics / Previews?

**Yes — absolutely.** MCP tools can return any JSON, including computed aggregations. The AI can call a `query_stats` tool and receive back a structured summary (counts, averages, distributions, etc.) which it then describes to the user in natural language. You can also return a **chart-ready data structure** (e.g., `{ labels, values, type: "bar" }`) that a lightweight frontend widget renders. No extra service is needed.

---

## Architecture

```
AI Agent (Claude / Gemini / Codex)
        │  MCP protocol (stdio or HTTP/SSE)
        ▼
 ┌─────────────────────────────┐
 │   apps/mcp/  (new package)  │   ← MCP server (TypeScript, Node.js)
 │   Uses @modelcontextprotocol│
 │   /sdk                      │
 └──────────┬──────────────────┘
            │  HTTP calls to existing REST API
            ▼
 ┌──────────────────────┐
 │  apps/api  (port 4001)│   ← Unchanged Hono API
 └──────────┬───────────┘
            │  Prisma
            ▼
 ┌──────────────────────┐
 │  PostgreSQL Database  │
 └──────────────────────┘
```

> The MCP server is a **thin adapter** — it translates MCP tool calls into REST calls against your existing `apps/api`. This keeps the api unchanged and the MCP stateless.

Alternatively (for lower latency), the MCP server can **import `@local/database` directly** and call queries without going through HTTP. Both work; HTTP is safer for production, direct DB access is faster for local dev.

---

## Proposed Tool List

### 🗄 Database Tools

| Tool | Description |
|---|---|
| `list_databases` | List all databases with field/record counts |
| `create_database` | Create a new database (name, description) |
| `get_database` | Get details of a single database |
| `delete_database` | Delete a database and all its data |
| `create_database_from_template` | Create database from a predefined template |

### 🏷 Field Tools

| Tool | Description |
|---|---|
| `list_fields` | List all fields in a database |
| `create_field` | Create a field (name, type, required, config) |
| `update_field` | Rename or update field config |
| `delete_field` | Delete a field and its values |
| `reorder_field` | Move a field left or right |
| `duplicate_field` | Clone a field (with options) |

### 📄 Record Tools

| Tool | Description |
|---|---|
| `list_records` | List all records with their field values |
| `create_record` | Add a new empty record |
| `delete_records` | Delete one or more records by ID |
| `set_field_value` | Set a single cell value (any type) |
| `bulk_set_values` | Set multiple cell values in one call |

### 🔍 Query Tools

| Tool | Description |
|---|---|
| `query_records` | Filter records by field value, date range, text search |
| `search_records` | Full-text search across text fields |

### 📊 Statistics / Preview Tools

| Tool | Description |
|---|---|
| `get_stats` | Count, sum, avg, min, max on number fields |
| `get_distribution` | Value counts for select/multi_select fields |
| `get_timeline` | Date-bucketed record counts (day/week/month) |
| `get_person_activity` | Records per person (for person fields) |
| `preview_table` | Return first N records formatted as a markdown table |

### 👤 User Tools

| Tool | Description |
|---|---|
| `list_users` | List available users |
| `search_users` | Search users by name or email |

---

## Integration: Claude, Gemini, Codex

### Claude (Desktop / API)
- MCP is natively supported via `claude_desktop_config.json`
- Transport: **stdio** (local process) — zero extra infra
- Config snippet:
```json
{
  "mcpServers": {
    "namviek": {
      "command": "node",
      "args": ["/path/to/namviek-v2/apps/mcp/dist/index.js"],
      "env": { "API_URL": "http://localhost:4001" }
    }
  }
}
```

### Gemini (Google AI Studio / Vertex)
- Gemini supports **function calling** with custom tool definitions (JSON Schema)
- You can expose MCP tools as Gemini function declarations
- Requires a small HTTP wrapper or the `@google/generative-ai` SDK
- Alternatively: Google's **MCP adapter** in Vertex AI Agent Builder (preview)

### Codex / OpenAI (ChatGPT / Assistants)
- OpenAI supports **custom tools** via the Assistants API
- MCP tools map directly to OpenAI `function` definitions
- An HTTP bridge (e.g., the open-source `mcp-proxy`) exposes MCP over HTTP for OpenAI
- ChatGPT Plus supports MCP via the **Deep Research** connector (in beta)

---

## Proposed File Layout

```
apps/
  mcp/                          ← NEW package
    package.json
    tsconfig.json
    src/
      index.ts                  ← MCP server entrypoint (stdio)
      client.ts                 ← HTTP client wrapping apps/api
      tools/
        database.tools.ts       ← Database CRUD tools
        field.tools.ts          ← Field CRUD tools
        record.tools.ts         ← Record tools
        query.tools.ts          ← Query & search tools
        stats.tools.ts          ← Statistics & preview tools
        user.tools.ts           ← User tools
      types.ts                  ← Shared input/output types
```

---

## Statistics Preview — How It Works

When the agent calls `get_stats`:
1. MCP server fetches all records for the database from the API
2. Groups/aggregates field values server-side in TypeScript
3. Returns a JSON payload like:
```json
{
  "field": "Revenue",
  "type": "number",
  "count": 120,
  "sum": 450000,
  "avg": 3750,
  "min": 100,
  "max": 25000,
  "distribution": [
    { "bucket": "0-1000", "count": 45 },
    { "bucket": "1000-5000", "count": 60 },
    { "bucket": "5000+", "count": 15 }
  ]
}
```
4. The AI narrates this as: *"Your Revenue field has 120 entries averaging $3,750, with most values between $1,000 and $5,000."*

You can also add a `preview_table` tool that returns records formatted as a **markdown table** — Claude and Gemini render these natively in chat.

---

## Open Questions

> [!IMPORTANT]
> **Transport mode**: Should the MCP server use `stdio` (local process, simplest) or `HTTP/SSE` (deployable, works for cloud-hosted agents)? We can support both.

> [!IMPORTANT]
> **Direct DB vs. HTTP proxy**: Should the MCP server call `@local/database` directly (faster, single process) or proxy to `apps/api` (safer, decoupled)? Recommend HTTP proxy to avoid tightly coupling MCP to DB internals.

> [!NOTE]
> **Authentication**: Should MCP tools require an API key / bearer token? Useful if you plan to expose the MCP server publicly (not just locally).

> [!NOTE]
> **Statistics backend**: Should aggregations happen in the MCP server (JS/TS) or be pushed down to Prisma/PostgreSQL queries for performance on large datasets?

---

## Verification Plan

- Run the MCP server in stdio mode and test with Claude Desktop
- Use the MCP Inspector (`npx @modelcontextprotocol/inspector`) to exercise each tool
- Verify statistics tools return correct aggregations against seeded data
- Test Gemini function calling with the tool definitions
