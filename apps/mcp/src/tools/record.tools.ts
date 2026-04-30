import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { apiGet, apiPost, apiPut, apiDelete } from '../client.js'

export function registerRecordTools(server: McpServer) {
  // ─── list_records ────────────────────────────────────────────────────────────
  server.registerTool(
    'list_records',
    {
      description: 'List all records (rows) in a database with all their field values.',
      inputSchema: {
        databaseId: z.string().describe('Database ID'),
      },
    },
    async ({ databaseId }) => {
      const records = await apiGet(`/api/databases/${databaseId}/records`)
      return {
        content: [{ type: 'text', text: JSON.stringify(records, null, 2) }],
      }
    }
  )

  // ─── create_record ───────────────────────────────────────────────────────────
  server.registerTool(
    'create_record',
    {
      description: 'Add a new empty record (row) to a database.',
      inputSchema: {
        databaseId: z.string().describe('Database ID'),
      },
    },
    async ({ databaseId }) => {
      const record = await apiPost(`/api/databases/${databaseId}/records`)
      return {
        content: [{ type: 'text', text: JSON.stringify(record, null, 2) }],
      }
    }
  )

  // ─── delete_records ──────────────────────────────────────────────────────────
  server.registerTool(
    'delete_records',
    {
      description: 'Delete one or more records by their IDs.',
      inputSchema: {
        ids: z.array(z.string()).describe('Array of record IDs to delete'),
        databaseId: z.string().optional().describe('Database ID (for real-time sync event)'),
      },
    },
    async ({ ids, databaseId }) => {
      const result = await apiDelete('/api/records', { ids, databaseId })
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      }
    }
  )

  // ─── set_field_value ─────────────────────────────────────────────────────────
  server.registerTool(
    'set_field_value',
    {
      description:
        'Set (upsert) a cell value for a specific record and field. ' +
        'Pass only the value property matching the field type: ' +
        'textValue (text/url/email), numberValue (number), ' +
        'selectValue (select), multiSelectValue (multi_select array), ' +
        'dateValue (ISO date string), boolValue (checkbox), ' +
        'personValue (array of user IDs).',
      inputSchema: {
        recordId: z.string().describe('Record ID'),
        fieldId: z.string().describe('Field ID'),
        databaseId: z.string().describe('Database ID (for real-time sync event)'),
        textValue: z.string().nullable().optional(),
        numberValue: z.number().nullable().optional(),
        selectValue: z.string().nullable().optional(),
        multiSelectValue: z.array(z.string()).optional(),
        dateValue: z.string().nullable().optional().describe('ISO date string, e.g. 2026-04-29'),
        boolValue: z.boolean().nullable().optional(),
        personValue: z.array(z.string()).optional().describe('Array of user IDs'),
      },
    },
    async ({ recordId, fieldId, databaseId, ...valuePayload }) => {
      const value = await apiPut(`/api/records/${recordId}/values/${fieldId}`, {
        databaseId,
        ...valuePayload,
      })
      return {
        content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
      }
    }
  )

  // ─── preview_table ───────────────────────────────────────────────────────────
  server.registerTool(
    'preview_table',
    {
      description:
        'Return a formatted markdown table preview of records in a database. ' +
        'Useful for quickly visualising the data without listing raw JSON.',
      inputSchema: {
        databaseId: z.string().describe('Database ID'),
        limit: z.number().int().min(1).max(100).optional().default(20).describe('Max rows to show (default 20)'),
      },
    },
    async ({ databaseId, limit }) => {
      const [fields, records] = await Promise.all([
        apiGet<{ id: string; name: string }[]>(`/api/databases/${databaseId}/fields`),
        apiGet<{
          id: string
          rowNumber: number
          fieldValues: { fieldId: string; textValue?: string | null; numberValue?: string | null; selectValue?: string | null; boolValue?: boolean | null; dateValue?: string | null }[]
        }[]>(`/api/databases/${databaseId}/records`),
      ])

      const slicedRecords = records.slice(0, limit)
      if (fields.length === 0) {
        return { content: [{ type: 'text', text: 'No fields in this database.' }] }
      }

      // Build markdown table
      const header = `| # | ${fields.map(f => f.name).join(' | ')} |`
      const separator = `|---|${fields.map(() => '---').join('|')}|`
      const rows = slicedRecords.map(rec => {
        const cells = fields.map(field => {
          const fv = rec.fieldValues.find(v => v.fieldId === field.id)
          if (!fv) return ''

          const boolText = fv.boolValue === null || fv.boolValue === undefined
            ? undefined
            : (fv.boolValue ? 'true' : 'false')

          return String(
            fv.textValue ?? fv.numberValue ?? fv.selectValue ?? boolText ?? fv.dateValue ?? ''
          )
        })
        return `| ${rec.rowNumber} | ${cells.join(' | ')} |`
      })

      const table = [header, separator, ...rows].join('\n')
      return { content: [{ type: 'text', text: table }] }
    }
  )

  // ─── bulk_set_values ────────────────────────────────────────────────────────
  server.registerTool(
    'bulk_set_values',
    {
      description: 'Set multiple field values across one or more records in a single call.',
      inputSchema: {
        updates: z.array(
          z.object({
            recordId: z.string().describe('Record ID'),
            fieldId: z.string().describe('Field ID'),
            databaseId: z.string().describe('Database ID'),
            textValue: z.string().nullable().optional(),
            numberValue: z.number().nullable().optional(),
            selectValue: z.string().nullable().optional(),
            multiSelectValue: z.array(z.string()).optional(),
            dateValue: z.string().nullable().optional(),
            boolValue: z.boolean().nullable().optional(),
            personValue: z.array(z.string()).optional(),
          })
        ).min(1).describe('List of value updates to apply'),
      },
    },
    async ({ updates }) => {
      const results = await Promise.all(
        updates.map(({ recordId, fieldId, databaseId, ...valuePayload }) =>
          apiPut(`/api/records/${recordId}/values/${fieldId}`, {
            databaseId,
            ...valuePayload,
          })
        )
      )

      return {
        content: [{ type: 'text', text: JSON.stringify({ updated: results.length, results }, null, 2) }],
      }
    }
  )
}
