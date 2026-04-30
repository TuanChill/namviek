import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { apiGet } from '../client.js'

interface StatsResponse {
  totalRecords: number
  byCreatedAt: { date: string; count: number }[]
  byUpdatedAt: { date: string; count: number }[]
}

type Field = {
  id: string
  name: string
  type: string
}

type FieldValue = {
  fieldId: string
  textValue?: string | null
  numberValue?: string | number | null
  selectValue?: string | null
  multiSelectValue?: string[]
  dateValue?: string | null
  personValue?: string[]
  boolValue?: boolean | null
}

type RecordRow = {
  id: string
  rowNumber: number
  createdAt: string
  updatedAt: string
  fieldValues: FieldValue[]
}

type User = {
  id: string
  name: string
  email: string
}

function resolveField(fields: Field[], field: string): Field | undefined {
  const byId = fields.find((f) => f.id === field)
  if (byId) return byId
  return fields.find((f) => f.name.toLowerCase() === field.toLowerCase())
}

function getFieldValue(row: RecordRow, fieldId: string): FieldValue | undefined {
  return row.fieldValues.find((v) => v.fieldId === fieldId)
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : null
}

function toBucket(date: Date, bucket: 'day' | 'week' | 'month'): string {
  if (bucket === 'day') return date.toISOString().slice(0, 10)
  if (bucket === 'month') return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`

  const day = date.getUTCDay() || 7
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  monday.setUTCDate(monday.getUTCDate() - day + 1)
  return monday.toISOString().slice(0, 10)
}

export function registerStatsTools(server: McpServer) {
  // ─── get_database_stats ──────────────────────────────────────────────────────
  server.registerTool(
    'get_database_stats',
    {
      description:
        'Get simple statistics for a database: total record count and daily record counts ' +
        'grouped by created_at and updated_at (last 30 days).',
      inputSchema: {
        databaseId: z.string().describe('Database ID'),
      },
    },
    async ({ databaseId }) => {
      const stats = await apiGet<StatsResponse>(`/api/databases/${databaseId}/stats`)

      // Build a human-readable summary alongside the raw JSON
      const summary = [
        `Database Stats (id: ${databaseId})`,
        ``,
        `Total active records: ${stats.totalRecords}`,
        ``,
        `Records created per day (last 30 days):`,
        stats.byCreatedAt.length === 0
          ? '  No data'
          : stats.byCreatedAt.map(r => `  - ${r.date}: ${r.count} record${r.count !== 1 ? 's' : ''}`).join('\n'),
        ``,
        `Records last updated per day (last 30 days):`,
        stats.byUpdatedAt.length === 0
          ? '  No data'
          : stats.byUpdatedAt.map(r => `  - ${r.date}: ${r.count} record${r.count !== 1 ? 's' : ''}`).join('\n'),
      ].join('\n')

      return {
        content: [
          { type: 'text', text: summary },
          { type: 'text', text: '\n\n**Raw JSON:**\n```json\n' + JSON.stringify(stats, null, 2) + '\n```' },
        ],
      }
    }
  )

  // ─── get_stats ──────────────────────────────────────────────────────────────
  server.registerTool(
    'get_stats',
    {
      description: 'Compute count, sum, average, min and max for a numeric field.',
      inputSchema: {
        databaseId: z.string().describe('Database ID'),
        field: z.string().describe('Numeric field ID or name'),
      },
    },
    async ({ databaseId, field }) => {
      const [fields, records] = await Promise.all([
        apiGet<Field[]>(`/api/databases/${databaseId}/fields`),
        apiGet<RecordRow[]>(`/api/databases/${databaseId}/records`),
      ])

      const resolved = resolveField(fields, field)
      if (!resolved) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: `Field not found: ${field}` }, null, 2) }] }
      }

      const values = records
        .map((row) => toNumber(getFieldValue(row, resolved.id)?.numberValue))
        .filter((v): v is number => v !== null)

      if (values.length === 0) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ field: resolved.name, type: resolved.type, count: 0, sum: 0, avg: null, min: null, max: null }, null, 2),
          }],
        }
      }

      const sum = values.reduce((acc, cur) => acc + cur, 0)
      const min = Math.min(...values)
      const max = Math.max(...values)

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            field: resolved.name,
            type: resolved.type,
            count: values.length,
            sum,
            avg: sum / values.length,
            min,
            max,
          }, null, 2),
        }],
      }
    }
  )

  // ─── get_distribution ───────────────────────────────────────────────────────
  server.registerTool(
    'get_distribution',
    {
      description: 'Get value distribution counts for select or multi_select fields.',
      inputSchema: {
        databaseId: z.string().describe('Database ID'),
        field: z.string().describe('Field ID or name'),
      },
    },
    async ({ databaseId, field }) => {
      const [fields, records] = await Promise.all([
        apiGet<Field[]>(`/api/databases/${databaseId}/fields`),
        apiGet<RecordRow[]>(`/api/databases/${databaseId}/records`),
      ])

      const resolved = resolveField(fields, field)
      if (!resolved) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: `Field not found: ${field}` }, null, 2) }] }
      }

      const dist = new Map<string, number>()
      for (const row of records) {
        const value = getFieldValue(row, resolved.id)
        if (!value) continue

        if (resolved.type === 'multi_select') {
          for (const option of value.multiSelectValue ?? []) {
            dist.set(option, (dist.get(option) ?? 0) + 1)
          }
          continue
        }

        const option = value.selectValue
        if (option) {
          dist.set(option, (dist.get(option) ?? 0) + 1)
        }
      }

      const distribution = Array.from(dist.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ field: resolved.name, type: resolved.type, distribution }, null, 2),
        }],
      }
    }
  )

  // ─── get_timeline ───────────────────────────────────────────────────────────
  server.registerTool(
    'get_timeline',
    {
      description: 'Get date-bucketed record counts by createdAt or updatedAt.',
      inputSchema: {
        databaseId: z.string().describe('Database ID'),
        dateSource: z.enum(['createdAt', 'updatedAt']).optional().default('createdAt'),
        bucket: z.enum(['day', 'week', 'month']).optional().default('day'),
      },
    },
    async ({ databaseId, dateSource, bucket }) => {
      const records = await apiGet<RecordRow[]>(`/api/databases/${databaseId}/records`)
      const counts = new Map<string, number>()

      for (const row of records) {
        const raw = dateSource === 'updatedAt' ? row.updatedAt : row.createdAt
        const date = new Date(raw)
        if (Number.isNaN(date.getTime())) continue
        const key = toBucket(date, bucket)
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }

      const timeline = Array.from(counts.entries())
        .map(([bucketLabel, count]) => ({ bucket: bucketLabel, count }))
        .sort((a, b) => a.bucket.localeCompare(b.bucket))

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ dateSource, bucket, timeline }, null, 2),
        }],
      }
    }
  )

  // ─── get_person_activity ────────────────────────────────────────────────────
  server.registerTool(
    'get_person_activity',
    {
      description: 'Count how many records are assigned to each person for a person field.',
      inputSchema: {
        databaseId: z.string().describe('Database ID'),
        field: z.string().describe('Person field ID or name'),
      },
    },
    async ({ databaseId, field }) => {
      const [fields, records, users] = await Promise.all([
        apiGet<Field[]>(`/api/databases/${databaseId}/fields`),
        apiGet<RecordRow[]>(`/api/databases/${databaseId}/records`),
        apiGet<User[]>('/api/users'),
      ])

      const resolved = resolveField(fields, field)
      if (!resolved) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: `Field not found: ${field}` }, null, 2) }] }
      }

      const usersById = new Map(users.map((u) => [u.id, u]))
      const counts = new Map<string, number>()

      for (const row of records) {
        const personIds = getFieldValue(row, resolved.id)?.personValue ?? []
        for (const id of personIds) {
          counts.set(id, (counts.get(id) ?? 0) + 1)
        }
      }

      const activity = Array.from(counts.entries())
        .map(([userId, count]) => {
          const user = usersById.get(userId)
          return {
            userId,
            name: user?.name ?? null,
            email: user?.email ?? null,
            count,
          }
        })
        .sort((a, b) => b.count - a.count)

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ field: resolved.name, activity }, null, 2),
        }],
      }
    }
  )
}
