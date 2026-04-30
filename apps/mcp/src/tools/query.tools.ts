import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { apiGet } from '../client.js'

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
  createdAt?: string
  updatedAt?: string
  fieldValues: FieldValue[]
}

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim().toLowerCase()
}

function getRawValue(row: RecordRow, fieldId: string): unknown {
  const fv = row.fieldValues.find((v) => v.fieldId === fieldId)
  if (!fv) return undefined
  if (fv.textValue !== null && fv.textValue !== undefined) return fv.textValue
  if (fv.numberValue !== null && fv.numberValue !== undefined) return fv.numberValue
  if (fv.selectValue !== null && fv.selectValue !== undefined) return fv.selectValue
  if (fv.multiSelectValue !== undefined) return fv.multiSelectValue
  if (fv.dateValue !== null && fv.dateValue !== undefined) return fv.dateValue
  if (fv.personValue !== undefined) return fv.personValue
  if (fv.boolValue !== null && fv.boolValue !== undefined) return fv.boolValue
  return undefined
}

function toSearchString(row: RecordRow, fields: Field[]): string {
  const parts: string[] = []
  for (const field of fields) {
    const value = getRawValue(row, field.id)
    if (Array.isArray(value)) {
      parts.push(value.join(' '))
      continue
    }
    if (value !== null && value !== undefined) {
      parts.push(String(value))
    }
  }
  return parts.join(' ').toLowerCase()
}

function toComparable(value: unknown): number | string {
  if (typeof value === 'number') return value
  const asNumber = Number(value)
  if (!Number.isNaN(asNumber) && value !== '' && value !== null && value !== undefined) {
    return asNumber
  }
  return normalizeText(value)
}

export function registerQueryTools(server: McpServer) {
  server.registerTool(
    'query_records',
    {
      description:
        'Filter records in a database by field value, date range, sort order, and optional free text.',
      inputSchema: {
        databaseId: z.string().describe('Database ID'),
        filters: z.array(
          z.object({
            field: z.string().describe('Field ID or field name'),
            operator: z
              .enum(['eq', 'neq', 'contains', 'starts_with', 'gt', 'gte', 'lt', 'lte', 'in', 'is_empty', 'not_empty'])
              .describe('Comparison operator'),
            value: z.any().optional().describe('Comparison value (not needed for is_empty/not_empty)'),
          })
        ).optional().describe('List of filters that all must match'),
        textSearch: z.string().optional().describe('Case-insensitive text search across all fields'),
        dateRange: z.object({
          field: z.string().describe('Date field ID or name'),
          from: z.string().optional().describe('Inclusive ISO date start, e.g. 2026-01-01'),
          to: z.string().optional().describe('Inclusive ISO date end, e.g. 2026-12-31'),
        }).optional(),
        sort: z.object({
          field: z.string().describe('Field ID or name to sort by'),
          direction: z.enum(['asc', 'desc']).default('asc'),
        }).optional(),
        limit: z.number().int().min(1).max(500).optional().default(100),
      },
    },
    async ({ databaseId, filters = [], textSearch, dateRange, sort, limit }) => {
      const [fields, records] = await Promise.all([
        apiGet<Field[]>(`/api/databases/${databaseId}/fields`),
        apiGet<RecordRow[]>(`/api/databases/${databaseId}/records`),
      ])

      const byId = new Map(fields.map((f) => [f.id, f]))
      const byName = new Map(fields.map((f) => [f.name.toLowerCase(), f]))
      const resolveField = (input: string): Field | undefined => byId.get(input) ?? byName.get(input.toLowerCase())

      let result = records.filter((row) => {
        for (const filter of filters) {
          const field = resolveField(filter.field)
          if (!field) return false
          const value = getRawValue(row, field.id)

          if (filter.operator === 'is_empty') {
            if (Array.isArray(value)) {
              if (value.length > 0) return false
            } else if (value !== null && value !== undefined && String(value).trim() !== '') {
              return false
            }
            continue
          }

          if (filter.operator === 'not_empty') {
            if (Array.isArray(value)) {
              if (value.length === 0) return false
            } else if (value === null || value === undefined || String(value).trim() === '') {
              return false
            }
            continue
          }

          const target = filter.value
          const currentText = normalizeText(value)
          const targetText = normalizeText(target)

          if (filter.operator === 'eq' && currentText !== targetText) return false
          if (filter.operator === 'neq' && currentText === targetText) return false
          if (filter.operator === 'contains' && !currentText.includes(targetText)) return false
          if (filter.operator === 'starts_with' && !currentText.startsWith(targetText)) return false

          if (['gt', 'gte', 'lt', 'lte'].includes(filter.operator)) {
            const current = toComparable(value)
            const expected = toComparable(target)

            if (typeof current === 'number' && typeof expected === 'number') {
              if (filter.operator === 'gt' && !(current > expected)) return false
              if (filter.operator === 'gte' && !(current >= expected)) return false
              if (filter.operator === 'lt' && !(current < expected)) return false
              if (filter.operator === 'lte' && !(current <= expected)) return false
            } else {
              const c = String(current)
              const e = String(expected)
              if (filter.operator === 'gt' && !(c > e)) return false
              if (filter.operator === 'gte' && !(c >= e)) return false
              if (filter.operator === 'lt' && !(c < e)) return false
              if (filter.operator === 'lte' && !(c <= e)) return false
            }
          }

          if (filter.operator === 'in') {
            const items = Array.isArray(target) ? target.map((v) => normalizeText(v)) : [targetText]
            if (!items.includes(currentText)) return false
          }
        }

        if (textSearch) {
          const haystack = toSearchString(row, fields)
          if (!haystack.includes(textSearch.toLowerCase())) return false
        }

        if (dateRange) {
          const field = resolveField(dateRange.field)
          if (!field) return false
          const value = getRawValue(row, field.id)
          if (!value) return false

          const date = new Date(String(value))
          if (Number.isNaN(date.getTime())) return false

          if (dateRange.from) {
            const from = new Date(dateRange.from)
            if (Number.isNaN(from.getTime()) || date < from) return false
          }
          if (dateRange.to) {
            const to = new Date(dateRange.to)
            if (Number.isNaN(to.getTime()) || date > to) return false
          }
        }

        return true
      })

      if (sort) {
        const field = resolveField(sort.field)
        if (field) {
          result = [...result].sort((a, b) => {
            const av = toComparable(getRawValue(a, field.id))
            const bv = toComparable(getRawValue(b, field.id))
            if (av < bv) return sort.direction === 'asc' ? -1 : 1
            if (av > bv) return sort.direction === 'asc' ? 1 : -1
            return a.rowNumber - b.rowNumber
          })
        }
      }

      const limited = result.slice(0, limit)

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            totalMatched: result.length,
            returned: limited.length,
            fields,
            records: limited,
          }, null, 2),
        }],
      }
    }
  )

  server.registerTool(
    'search_records',
    {
      description: 'Run a case-insensitive full-text style search across all field values in a database.',
      inputSchema: {
        databaseId: z.string().describe('Database ID'),
        query: z.string().min(1).describe('Search query text'),
        limit: z.number().int().min(1).max(200).optional().default(50),
      },
    },
    async ({ databaseId, query, limit }) => {
      const [fields, records] = await Promise.all([
        apiGet<Field[]>(`/api/databases/${databaseId}/fields`),
        apiGet<RecordRow[]>(`/api/databases/${databaseId}/records`),
      ])

      const q = query.toLowerCase().trim()
      const matches = records
        .map((row) => ({ row, score: toSearchString(row, fields).split(q).length - 1 }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score || a.row.rowNumber - b.row.rowNumber)
        .slice(0, limit)

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            totalMatched: matches.length,
            records: matches.map((m) => ({ ...m.row, _score: m.score })),
          }, null, 2),
        }],
      }
    }
  )
}
