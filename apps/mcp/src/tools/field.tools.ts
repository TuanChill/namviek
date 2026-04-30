import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { apiGet, apiPost, apiPatch, apiDelete } from '../client.js'

const FIELD_TYPES = [
  'text', 'number', 'select', 'multi_select', 'date',
  'person', 'checkbox', 'file', 'url', 'email',
  'id', 'created_time', 'created_by', 'updated_time', 'updated_by',
] as const

export function registerFieldTools(server: McpServer) {
  // ─── list_fields ─────────────────────────────────────────────────────────────
  server.registerTool(
    'list_fields',
    {
      description: 'List all fields (columns) in a database, ordered by position.',
      inputSchema: {
        databaseId: z.string().describe('Database ID'),
      },
    },
    async ({ databaseId }) => {
      const fields = await apiGet(`/api/databases/${databaseId}/fields`)
      return {
        content: [{ type: 'text', text: JSON.stringify(fields, null, 2) }],
      }
    }
  )

  // ─── create_field ────────────────────────────────────────────────────────────
  server.registerTool(
    'create_field',
    {
      description: 'Create a new field (column) in a database.',
      inputSchema: {
        databaseId: z.string().describe('Database ID'),
        name: z.string().describe('Field name'),
        type: z.enum(FIELD_TYPES).describe('Field type'),
        required: z.boolean().optional().describe('Whether the field is required'),
      },
    },
    async ({ databaseId, name, type, required }) => {
      const field = await apiPost(`/api/databases/${databaseId}/fields`, {
        name,
        type,
        required: required ?? false,
      })
      return {
        content: [{ type: 'text', text: JSON.stringify(field, null, 2) }],
      }
    }
  )

  // ─── update_field ────────────────────────────────────────────────────────────
  server.registerTool(
    'update_field',
    {
      description: 'Rename a field or update its configuration.',
      inputSchema: {
        fieldId: z.string().describe('Field ID'),
        name: z.string().optional().describe('New field name'),
        config: z.record(z.string(), z.unknown()).optional().describe('Field config JSON'),
      },
    },
    async ({ fieldId, name, config }) => {
      const field = await apiPatch(`/api/fields/${fieldId}`, { name, config })
      return {
        content: [{ type: 'text', text: JSON.stringify(field, null, 2) }],
      }
    }
  )

  // ─── delete_field ────────────────────────────────────────────────────────────
  server.registerTool(
    'delete_field',
    {
      description: 'Delete a field and all its stored values.',
      inputSchema: {
        fieldId: z.string().describe('Field ID'),
        databaseId: z.string().describe('Parent database ID (used to broadcast real-time event)'),
      },
    },
    async ({ fieldId, databaseId }) => {
      const result = await apiDelete(`/api/fields/${fieldId}?databaseId=${databaseId}`)
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      }
    }
  )

  // ─── reorder_field ──────────────────────────────────────────────────────────
  server.registerTool(
    'reorder_field',
    {
      description: 'Move a field left or right in the table.',
      inputSchema: {
        fieldId: z.string().describe('Field ID'),
        direction: z.enum(['left', 'right']).describe('Move direction'),
        databaseId: z.string().optional().describe('Database ID for sync broadcast'),
      },
    },
    async ({ fieldId, direction, databaseId }) => {
      const result = await apiPost(`/api/fields/${fieldId}/move`, { direction, databaseId })
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      }
    }
  )

  // ─── duplicate_field ────────────────────────────────────────────────────────
  server.registerTool(
    'duplicate_field',
    {
      description: 'Duplicate a field and place the copy next to the original.',
      inputSchema: {
        fieldId: z.string().describe('Field ID'),
      },
    },
    async ({ fieldId }) => {
      const field = await apiPost(`/api/fields/${fieldId}/duplicate`)
      return {
        content: [{ type: 'text', text: JSON.stringify(field, null, 2) }],
      }
    }
  )
}
