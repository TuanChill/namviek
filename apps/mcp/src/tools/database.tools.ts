import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { apiGet, apiPost, apiDelete } from '../client.js'

export function registerDatabaseTools(server: McpServer) {
  // ─── list_databases ──────────────────────────────────────────────────────────
  server.registerTool(
    'list_databases',
    {
      description: 'List all databases with their field and record counts.',
      inputSchema: {},
    },
    async () => {
      const databases = await apiGet('/api/databases')
      return {
        content: [{ type: 'text', text: JSON.stringify(databases, null, 2) }],
      }
    }
  )

  // ─── get_database ───────────────────────────────────────────────────────────
  server.registerTool(
    'get_database',
    {
      description: 'Get details for a single database by ID.',
      inputSchema: {
        id: z.string().describe('Database ID'),
      },
    },
    async ({ id }) => {
      const databases = await apiGet<Array<Record<string, unknown>>>('/api/databases')
      const database = databases.find((db) => String(db.id) === id)
      if (!database) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: `Database not found: ${id}` }, null, 2) }],
        }
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(database, null, 2) }],
      }
    }
  )

  // ─── create_database ─────────────────────────────────────────────────────────
  server.registerTool(
    'create_database',
    {
      description: 'Create a new database.',
      inputSchema: {
        name: z.string().describe('Name of the new database'),
        description: z.string().optional().describe('Optional description'),
      },
    },
    async ({ name, description }) => {
      const db = await apiPost('/api/databases', { name, description })
      return {
        content: [{ type: 'text', text: JSON.stringify(db, null, 2) }],
      }
    }
  )

  // ─── delete_database ─────────────────────────────────────────────────────────
  server.registerTool(
    'delete_database',
    {
      description: 'Delete a database and all its fields, records and values.',
      inputSchema: {
        id: z.string().describe('Database ID to delete'),
      },
    },
    async ({ id }) => {
      const result = await apiDelete(`/api/databases/${id}`)
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      }
    }
  )

  // ─── create_database_from_template ───────────────────────────────────────────
  server.registerTool(
    'create_database_from_template',
    {
      description: 'Create a database from a predefined template (e.g. CRM, Project Tracker).',
      inputSchema: {
        templateId: z.string().describe('Template ID'),
        name: z.string().optional().describe('Optional custom name for the database'),
      },
    },
    async ({ templateId, name }) => {
      const db = await apiPost('/api/databases/from-template', { templateId, name })
      return {
        content: [{ type: 'text', text: JSON.stringify(db, null, 2) }],
      }
    }
  )
}
