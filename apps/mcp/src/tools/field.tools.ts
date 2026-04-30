import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { apiGet, apiPost, apiPatch, apiDelete } from '../client.js'

const FIELD_TYPES = [
  'text', 'number', 'select', 'multi_select', 'date',
  'person', 'checkbox', 'file', 'url', 'email',
  'id', 'created_time', 'created_by', 'updated_time', 'updated_by',
] as const

const DATE_FORMATS = ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY', 'MMM D, YYYY'] as const
const NUMBER_FORMATS = [
  'number',
  'number_with_separators',
  'percent',
  'usd',
  'aud',
  'cad',
  'sgd',
  'eur',
  'gbp',
  'integer',
  'decimal',
  'currency',
] as const
const NUMBER_SHOW_AS = ['number', 'bar', 'ring'] as const

type FieldType = (typeof FIELD_TYPES)[number]
type ConfigPayload = {
  dateFormat?: (typeof DATE_FORMATS)[number]
  includeTime?: boolean
  numberFormat?: (typeof NUMBER_FORMATS)[number]
  precision?: number
  showAs?: (typeof NUMBER_SHOW_AS)[number]
  divideBy?: number
  color?: string
  showNumber?: boolean
  richText?: boolean
  allowMultiple?: boolean
  allowedUserIds?: string[]
  allowMultipleFiles?: boolean
  customIcon?: string
}

function pickProvidedConfig(payload: Record<string, unknown>): ConfigPayload {
  const config: ConfigPayload = {}

  if ('dateFormat' in payload && payload.dateFormat !== undefined) config.dateFormat = payload.dateFormat as ConfigPayload['dateFormat']
  if ('includeTime' in payload && payload.includeTime !== undefined) config.includeTime = payload.includeTime as boolean

  if ('numberFormat' in payload && payload.numberFormat !== undefined) config.numberFormat = payload.numberFormat as ConfigPayload['numberFormat']
  if ('precision' in payload && payload.precision !== undefined) config.precision = payload.precision as number
  if ('showAs' in payload && payload.showAs !== undefined) config.showAs = payload.showAs as ConfigPayload['showAs']
  if ('divideBy' in payload && payload.divideBy !== undefined) config.divideBy = payload.divideBy as number
  if ('color' in payload && payload.color !== undefined) config.color = payload.color as string
  if ('showNumber' in payload && payload.showNumber !== undefined) config.showNumber = payload.showNumber as boolean

  if ('richText' in payload && payload.richText !== undefined) config.richText = payload.richText as boolean

  if ('allowMultiple' in payload && payload.allowMultiple !== undefined) config.allowMultiple = payload.allowMultiple as boolean
  if ('allowedUserIds' in payload && payload.allowedUserIds !== undefined) config.allowedUserIds = payload.allowedUserIds as string[]

  if ('allowMultipleFiles' in payload && payload.allowMultipleFiles !== undefined) config.allowMultipleFiles = payload.allowMultipleFiles as boolean

  if ('customIcon' in payload && payload.customIcon !== undefined) config.customIcon = payload.customIcon as string

  return config
}

function isComputedType(type: FieldType) {
  return type === 'id' || type === 'created_time' || type === 'created_by' || type === 'updated_time' || type === 'updated_by'
}

function validateConfigByType(type: FieldType, config: ConfigPayload) {
  const keys = Object.keys(config)
  if (keys.length === 0) return

  const allowed = new Set<string>(['customIcon'])

  if (type === 'text' || type === 'url' || type === 'email') {
    allowed.add('richText')
  }
  if (type === 'date') {
    allowed.add('dateFormat')
    allowed.add('includeTime')
  }
  if (type === 'number') {
    allowed.add('numberFormat')
    allowed.add('precision')
    allowed.add('showAs')
    allowed.add('divideBy')
    allowed.add('color')
    allowed.add('showNumber')
  }
  if (type === 'person') {
    allowed.add('allowMultiple')
    allowed.add('allowedUserIds')
  }
  if (type === 'file') {
    allowed.add('allowMultipleFiles')
  }

  for (const key of keys) {
    if (!allowed.has(key)) {
      throw new Error(`Config key "${key}" is not valid for field type "${type}"`)
    }
  }

  if (isComputedType(type) || type === 'checkbox' || type === 'select' || type === 'multi_select') {
    if (keys.some((k) => k !== 'customIcon')) {
      throw new Error(`Only customIcon is supported for field type "${type}"`)
    }
  }
}

function contractText() {
  return JSON.stringify({
    configByType: {
      text: ['richText', 'customIcon'],
      url: ['richText', 'customIcon'],
      email: ['richText', 'customIcon'],
      number: ['numberFormat', 'precision', 'showAs', 'divideBy', 'color', 'showNumber', 'customIcon'],
      date: ['dateFormat', 'includeTime', 'customIcon'],
      person: ['allowMultiple', 'allowedUserIds', 'customIcon'],
      file: ['allowMultipleFiles', 'customIcon'],
      select: ['customIcon'],
      multi_select: ['customIcon'],
      checkbox: ['customIcon'],
      id: ['customIcon'],
      created_time: ['customIcon'],
      created_by: ['customIcon'],
      updated_time: ['customIcon'],
      updated_by: ['customIcon'],
    },
    enums: {
      dateFormat: DATE_FORMATS,
      numberFormat: NUMBER_FORMATS,
      showAs: NUMBER_SHOW_AS,
    },
    optionTools: ['list_field_options', 'create_field_option', 'delete_field_option'],
    note: 'For select/multi_select options, use list_field_options/create_field_option/delete_field_option instead of config.',
  }, null, 2)
}

async function assertOptionFieldType(fieldId: string) {
  const field = await apiGet<{ type: FieldType; name: string }>(`/api/fields/${fieldId}`)
  if (field.type !== 'select' && field.type !== 'multi_select') {
    throw new Error(`Field "${field.name}" is type "${field.type}". Options are only supported for select and multi_select fields.`)
  }
  return field
}

export function registerFieldTools(server: McpServer) {
  // ─── get_field_config_contract ─────────────────────────────────────────────
  server.registerTool(
    'get_field_config_contract',
    {
      description: 'Return the exact allowed config keys/values per field type for create_field and update_field.',
      inputSchema: {},
    },
    async () => {
      return {
        content: [{ type: 'text', text: contractText() }],
      }
    }
  )

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

  // ─── list_field_options ───────────────────────────────────────────────────
  server.registerTool(
    'list_field_options',
    {
      description: 'List all live options for a select or multi_select field.',
      inputSchema: {
        fieldId: z.string().describe('Field ID for a select or multi_select field'),
      },
    },
    async ({ fieldId }) => {
      await assertOptionFieldType(fieldId)
      const options = await apiGet(`/api/fields/${fieldId}/options`)
      return {
        content: [{ type: 'text', text: JSON.stringify(options, null, 2) }],
      }
    }
  )

  // ─── create_field_option ──────────────────────────────────────────────────
  server.registerTool(
    'create_field_option',
    {
      description: 'Create one live option for a select or multi_select field.',
      inputSchema: {
        fieldId: z.string().describe('Field ID for a select or multi_select field'),
        label: z.string().describe('Option label'),
        color: z.string().optional().describe('Optional option color, e.g. #22c55e'),
      },
    },
    async ({ fieldId, label, color }) => {
      await assertOptionFieldType(fieldId)
      const option = await apiPost(`/api/fields/${fieldId}/options`, { label, color })
      return {
        content: [{ type: 'text', text: JSON.stringify(option, null, 2) }],
      }
    }
  )

  // ─── delete_field_option ──────────────────────────────────────────────────
  server.registerTool(
    'delete_field_option',
    {
      description: 'Delete one live option from a select or multi_select field.',
      inputSchema: {
        fieldId: z.string().describe('Field ID for a select or multi_select field'),
        optionId: z.string().describe('Option ID to delete'),
      },
    },
    async ({ fieldId, optionId }) => {
      await assertOptionFieldType(fieldId)
      const result = await apiDelete(`/api/fields/${fieldId}/options/${optionId}`)
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      }
    }
  )

  // ─── create_field ────────────────────────────────────────────────────────────
  server.registerTool(
    'create_field',
    {
      description: 'Create a new field (column) in a database with type-aware config keys.',
      inputSchema: {
        databaseId: z.string().describe('Database ID'),
        name: z.string().describe('Field name'),
        type: z.enum(FIELD_TYPES).describe('Field type'),
        required: z.boolean().optional().describe('Whether the field is required'),
        // text/url/email
        richText: z.boolean().optional().describe('Only for text/url/email: rich text mode'),
        // date
        dateFormat: z.enum(DATE_FORMATS).optional().describe('Only for date fields'),
        includeTime: z.boolean().optional().describe('Only for date fields'),
        // number
        numberFormat: z.enum(NUMBER_FORMATS).optional().describe('Only for number fields'),
        precision: z.number().int().min(0).max(10).optional().describe('Only for number fields'),
        showAs: z.enum(NUMBER_SHOW_AS).optional().describe('Only for number fields'),
        divideBy: z.number().positive().optional().describe('Only for number fields when showAs=bar/ring'),
        color: z.string().optional().describe('Only for number fields when showAs=bar/ring'),
        showNumber: z.boolean().optional().describe('Only for number fields when showAs=bar/ring'),
        // person
        allowMultiple: z.boolean().optional().describe('Only for person fields'),
        allowedUserIds: z.array(z.string()).optional().describe('Only for person fields; empty or omitted means all users'),
        // file
        allowMultipleFiles: z.boolean().optional().describe('Only for file fields'),
        // all types
        customIcon: z.string().optional().describe('Optional icon override for all field types'),
      },
    },
    async (args) => {
      const { databaseId, name, type, required } = args
      const config = pickProvidedConfig(args as Record<string, unknown>)
      validateConfigByType(type, config)

      const field = await apiPost(`/api/databases/${databaseId}/fields`, {
        name,
        type,
        required: required ?? false,
        ...(Object.keys(config).length > 0 ? { config } : {}),
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
      description: 'Rename a field and/or update config. Config keys are validated against the field type.',
      inputSchema: {
        fieldId: z.string().describe('Field ID'),
        name: z.string().optional().describe('New field name'),
        // Optional override if caller already knows the type; otherwise tool fetches it.
        fieldType: z.enum(FIELD_TYPES).optional().describe('Optional field type hint'),
        // text/url/email
        richText: z.boolean().optional().describe('Only for text/url/email: rich text mode'),
        // date
        dateFormat: z.enum(DATE_FORMATS).optional().describe('Only for date fields'),
        includeTime: z.boolean().optional().describe('Only for date fields'),
        // number
        numberFormat: z.enum(NUMBER_FORMATS).optional().describe('Only for number fields'),
        precision: z.number().int().min(0).max(10).optional().describe('Only for number fields'),
        showAs: z.enum(NUMBER_SHOW_AS).optional().describe('Only for number fields'),
        divideBy: z.number().positive().optional().describe('Only for number fields when showAs=bar/ring'),
        color: z.string().optional().describe('Only for number fields when showAs=bar/ring'),
        showNumber: z.boolean().optional().describe('Only for number fields when showAs=bar/ring'),
        // person
        allowMultiple: z.boolean().optional().describe('Only for person fields'),
        allowedUserIds: z.array(z.string()).optional().describe('Only for person fields; empty or omitted means all users'),
        // file
        allowMultipleFiles: z.boolean().optional().describe('Only for file fields'),
        // all types
        customIcon: z.string().optional().describe('Optional icon override for all field types'),
      },
    },
    async (args) => {
      const { fieldId, name, fieldType } = args

      let resolvedType = fieldType as FieldType | undefined
      if (!resolvedType) {
        const currentField = await apiGet<{ type: FieldType }>(`/api/fields/${fieldId}`)
        resolvedType = currentField.type
      }

      const config = pickProvidedConfig(args as Record<string, unknown>)
      validateConfigByType(resolvedType, config)

      if (name === undefined && Object.keys(config).length === 0) {
        throw new Error('Nothing to update. Provide name and/or one config key.')
      }

      const field = await apiPatch(`/api/fields/${fieldId}`, {
        ...(name !== undefined ? { name } : {}),
        ...(Object.keys(config).length > 0 ? { config } : {}),
      })
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
