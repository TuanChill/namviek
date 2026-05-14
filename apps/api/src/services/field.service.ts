import { Hono } from 'hono'
import type { PrismaInstance } from '../lib/prisma.js'
import {
  getFields,
  getFieldById,
  createField,
  getFieldOptions,
  createFieldOption,
  updateFieldOption,
  deleteFieldOption,
  deleteField,
  updateField,
  reorderField,
  duplicateField,
  backfillIdField,
} from '../queries.js'
import type { FieldType } from '../generated/client/client.js'
import type { Prisma } from '../generated/client/client.js'

class ValidationError extends Error {}

const FIELD_TYPES = new Set<FieldType>([
  'text',
  'number',
  'select',
  'multi_select',
  'date',
  'person',
  'checkbox',
  'file',
  'url',
  'email',
  'id',
  'created_time',
  'created_by',
  'updated_time',
  'updated_by',
])

const DATE_FORMATS = new Set(['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY', 'MMM D, YYYY'])
const NUMBER_FORMATS = new Set([
  'number',
  'number_with_separators',
  'percent',
  'usd',
  'aud',
  'cad',
  'sgd',
  'eur',
  'gbp',
  // Legacy formats still supported by UI formatter
  'integer',
  'decimal',
  'currency',
])
const NUMBER_SHOW_AS = new Set(['number', 'bar', 'ring'])

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertBoolean(name: string, value: unknown): asserts value is boolean {
  if (typeof value !== 'boolean') {
    throw new ValidationError(`${name} must be a boolean`)
  }
}

function assertString(name: string, value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${name} must be a string`)
  }
}

function assertNumber(name: string, value: unknown): asserts value is number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new ValidationError(`${name} must be a valid number`)
  }
}

function assertStringArray(name: string, value: unknown): asserts value is string[] {
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
    throw new ValidationError(`${name} must be an array of strings`)
  }
}

function isComputedType(type: FieldType) {
  return type === 'id' || type === 'created_time' || type === 'created_by' || type === 'updated_time' || type === 'updated_by'
}

function sanitizeConfigForType(type: FieldType, raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined) return undefined
  if (!isObject(raw)) {
    throw new ValidationError('config must be an object')
  }

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

  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      throw new ValidationError(`config.${key} is not valid for field type ${type}`)
    }
  }

  const config: Record<string, unknown> = {}

  if (raw.customIcon !== undefined) {
    assertString('config.customIcon', raw.customIcon)
    config.customIcon = raw.customIcon
  }

  if (raw.richText !== undefined) {
    assertBoolean('config.richText', raw.richText)
    config.richText = raw.richText
  }

  if (raw.dateFormat !== undefined) {
    assertString('config.dateFormat', raw.dateFormat)
    if (!DATE_FORMATS.has(raw.dateFormat)) {
      throw new ValidationError(`config.dateFormat must be one of: ${Array.from(DATE_FORMATS).join(', ')}`)
    }
    config.dateFormat = raw.dateFormat
  }

  if (raw.includeTime !== undefined) {
    assertBoolean('config.includeTime', raw.includeTime)
    config.includeTime = raw.includeTime
  }

  if (raw.numberFormat !== undefined) {
    assertString('config.numberFormat', raw.numberFormat)
    if (!NUMBER_FORMATS.has(raw.numberFormat)) {
      throw new ValidationError(`config.numberFormat must be one of: ${Array.from(NUMBER_FORMATS).join(', ')}`)
    }
    config.numberFormat = raw.numberFormat
  }

  if (raw.precision !== undefined) {
    assertNumber('config.precision', raw.precision)
    config.precision = Math.max(0, Math.min(10, Math.trunc(raw.precision)))
  }

  if (raw.showAs !== undefined) {
    assertString('config.showAs', raw.showAs)
    if (!NUMBER_SHOW_AS.has(raw.showAs)) {
      throw new ValidationError(`config.showAs must be one of: ${Array.from(NUMBER_SHOW_AS).join(', ')}`)
    }
    config.showAs = raw.showAs
  }

  if (raw.divideBy !== undefined) {
    assertNumber('config.divideBy', raw.divideBy)
    if (raw.divideBy <= 0) throw new ValidationError('config.divideBy must be greater than 0')
    config.divideBy = raw.divideBy
  }

  if (raw.color !== undefined) {
    assertString('config.color', raw.color)
    config.color = raw.color
  }

  if (raw.showNumber !== undefined) {
    assertBoolean('config.showNumber', raw.showNumber)
    config.showNumber = raw.showNumber
  }

  if (raw.allowMultiple !== undefined) {
    assertBoolean('config.allowMultiple', raw.allowMultiple)
    config.allowMultiple = raw.allowMultiple
  }

  if (raw.allowedUserIds !== undefined) {
    assertStringArray('config.allowedUserIds', raw.allowedUserIds)
    config.allowedUserIds = raw.allowedUserIds
  }

  if (raw.allowMultipleFiles !== undefined) {
    assertBoolean('config.allowMultipleFiles', raw.allowMultipleFiles)
    config.allowMultipleFiles = raw.allowMultipleFiles
  }

  if ((type === 'checkbox' || type === 'select' || type === 'multi_select' || isComputedType(type)) && Object.keys(config).length > 0) {
    // these types currently only support customIcon in config
    if (Object.keys(config).some((k) => k !== 'customIcon')) {
      throw new ValidationError(`Only config.customIcon is supported for field type ${type}`)
    }
  }

  return config
}

function parseFieldType(value: unknown): FieldType {
  if (typeof value !== 'string' || !FIELD_TYPES.has(value as FieldType)) {
    throw new ValidationError(`type must be one of: ${Array.from(FIELD_TYPES).join(', ')}`)
  }
  return value as FieldType
}

type DbEventPublisher = {
  publish: (databaseId: string, event: string, payload: unknown) => void
}

type AppWithPrisma = Hono<any>

export function registerFieldRoutes(app: AppWithPrisma, dbEvents: DbEventPublisher) {
  // GET /api/databases/:id/fields — list fields
  app.get('/api/databases/:id/fields', async (c) => {
    try {
      const fields = await getFields(c.var.prisma, c.req.param('id'))
      return c.json(fields)
    } catch (error) {
      console.error(error)
      return c.json({ error: 'Failed to fetch fields' }, 500)
    }
  })

  // GET /api/fields/:fieldId — get one field with options
  app.get('/api/fields/:fieldId', async (c) => {
    try {
      const field = await getFieldById(c.var.prisma, c.req.param('fieldId'))
      if (!field) return c.json({ error: 'Field not found' }, 404)
      return c.json(field)
    } catch (error) {
      console.error(error)
      return c.json({ error: 'Failed to fetch field' }, 500)
    }
  })

  // POST /api/databases/:id/fields — create a field
  app.post('/api/databases/:id/fields', async (c) => {
    try {
      const body = await c.req.json()
      if (!isObject(body)) return c.json({ error: 'Invalid request body' }, 400)
      const name = typeof body.name === 'string' ? body.name.trim() : ''
      if (!name) return c.json({ error: 'name is required' }, 400)
      if (!body.type) return c.json({ error: 'type is required' }, 400)
      const type = parseFieldType(body.type)
      const config = sanitizeConfigForType(type, body.config)

      const field = await createField(
        c.var.prisma,
        c.req.param('id'),
        name,
        type,
        { isPrimary: body.isPrimary === true, required: body.required === true, config }
      )
      dbEvents.publish(c.req.param('id'), 'FIELD_CREATED', field)
      return c.json(field, 201)
    } catch (error) {
      if (error instanceof ValidationError) {
        return c.json({ error: error.message }, 400)
      }
      console.error(error)
      return c.json({ error: 'Failed to create field' }, 500)
    }
  })

  // GET /api/fields/:fieldId/options — list options for a field
  app.get('/api/fields/:fieldId/options', async (c) => {
    try {
      const options = await getFieldOptions(c.var.prisma, c.req.param('fieldId'))
      return c.json(options)
    } catch (error) {
      console.error(error)
      return c.json({ error: 'Failed to fetch options' }, 500)
    }
  })

  // POST /api/fields/:fieldId/options — create an option
  app.post('/api/fields/:fieldId/options', async (c) => {
    try {
      const body = await c.req.json()
      if (!body.label?.trim()) return c.json({ error: 'label is required' }, 400)
      if (body.position !== undefined) {
        assertNumber('position', body.position)
      }
      const option = await createFieldOption(
        c.var.prisma,
        c.req.param('fieldId'),
        body.label.trim(),
        body.color,
        body.position
      )
      return c.json(option, 201)
    } catch (error) {
      if (error instanceof ValidationError) {
        return c.json({ error: error.message }, 400)
      }
      console.error(error)
      return c.json({ error: 'Failed to create option' }, 500)
    }
  })

  // PATCH /api/fields/:fieldId/options/:optionId — update option
  app.patch('/api/fields/:fieldId/options/:optionId', async (c) => {
    try {
      const body = await c.req.json()
      if (!isObject(body)) return c.json({ error: 'Invalid request body' }, 400)

      const payload: { label?: string; color?: string | null; position?: number } = {}

      if (body.label !== undefined) {
        if (typeof body.label !== 'string' || !body.label.trim()) {
          return c.json({ error: 'label must be a non-empty string' }, 400)
        }
        payload.label = body.label.trim()
      }

      if (body.color !== undefined) {
        if (body.color !== null && typeof body.color !== 'string') {
          return c.json({ error: 'color must be a string or null' }, 400)
        }
        payload.color = body.color
      }

      if (body.position !== undefined) {
        assertNumber('position', body.position)
        payload.position = body.position
      }

      if (Object.keys(payload).length === 0) {
        return c.json({ error: 'At least one of label, color, or position must be provided' }, 400)
      }

      const option = await updateFieldOption(c.var.prisma, c.req.param('fieldId'), c.req.param('optionId'), payload)
      return c.json(option)
    } catch (error: any) {
      if (error instanceof ValidationError) {
        return c.json({ error: error.message }, 400)
      }
      if (error?.message === 'Field option not found') {
        return c.json({ error: error.message }, 404)
      }
      console.error(error)
      return c.json({ error: 'Failed to update option' }, 500)
    }
  })

  // DELETE /api/fields/:fieldId/options/:optionId — delete an option
  app.delete('/api/fields/:fieldId/options/:optionId', async (c) => {
    try {
      await deleteFieldOption(c.var.prisma, c.req.param('optionId'))
      return c.json({ success: true })
    } catch (error) {
      console.error(error)
      return c.json({ error: 'Failed to delete option' }, 500)
    }
  })

  // DELETE /api/fields/:fieldId — delete a field
  app.delete('/api/fields/:fieldId', async (c) => {
    try {
      const databaseId = c.req.query('databaseId')
      await deleteField(c.var.prisma, c.req.param('fieldId'))
      if (databaseId) {
        dbEvents.publish(databaseId, 'FIELD_DELETED', { id: c.req.param('fieldId') })
      }
      return c.json({ success: true })
    } catch (error: any) {
      if (error?.message === 'Cannot delete the primary field') {
        return c.json({ error: error.message }, 400)
      }
      console.error(error)
      return c.json({ error: 'Failed to delete field' }, 500)
    }
  })

  // PATCH /api/fields/:fieldId — rename or update config
  app.patch('/api/fields/:fieldId', async (c) => {
    try {
      const body = await c.req.json()
      if (!isObject(body)) return c.json({ error: 'Invalid request body' }, 400)

      const current = await getFieldById(c.var.prisma, c.req.param('fieldId'))
      if (!current) return c.json({ error: 'Field not found' }, 404)

      const data: { name?: string; config?: Prisma.InputJsonValue } = {}

      if (body.name !== undefined) {
        if (typeof body.name !== 'string' || !body.name.trim()) {
          return c.json({ error: 'name must be a non-empty string' }, 400)
        }
        data.name = body.name.trim()
      }

      if (body.config !== undefined) {
        const currentConfig = isObject(current.config) ? current.config : {}
        if (!isObject(body.config)) {
          return c.json({ error: 'config must be an object' }, 400)
        }
        const mergedConfig = { ...currentConfig, ...body.config }
        data.config = sanitizeConfigForType(current.type as FieldType, mergedConfig) as Prisma.InputJsonValue
      }

      if (Object.keys(data).length === 0) {
        return c.json({ error: 'At least one of name or config must be provided' }, 400)
      }

      const field = await updateField(c.var.prisma, c.req.param('fieldId'), data)
      dbEvents.publish(field.databaseId, 'FIELD_UPDATED', field)
      return c.json(field)
    } catch (error) {
      if (error instanceof ValidationError) {
        return c.json({ error: error.message }, 400)
      }
      console.error(error)
      return c.json({ error: 'Failed to update field' }, 500)
    }
  })

  // POST /api/fields/:fieldId/move — reorder left/right
  app.post('/api/fields/:fieldId/move', async (c) => {
    try {
      const body = await c.req.json()
      const result = await reorderField(c.var.prisma, c.req.param('fieldId'), body.direction)
      if (body.databaseId) {
        dbEvents.publish(body.databaseId, 'FIELDS_REORDERED', {})
      }
      return c.json({ success: result !== null })
    } catch (error) {
      console.error(error)
      return c.json({ error: 'Failed to move field' }, 500)
    }
  })

  // POST /api/fields/:fieldId/duplicate — duplicate a field
  app.post('/api/fields/:fieldId/duplicate', async (c) => {
    try {
      const field = await duplicateField(c.var.prisma, c.req.param('fieldId'))
      if (!field) {
        return c.json({ error: 'Field not found' }, 404)
      }
      dbEvents.publish(field.databaseId, 'FIELD_CREATED', field)
      return c.json(field, 201)
    } catch (error) {
      console.error(error)
      return c.json({ error: 'Failed to duplicate field' }, 500)
    }
  })

  // POST /api/fields/:fieldId/backfill — backfill id-type field for existing records
  app.post('/api/fields/:fieldId/backfill', async (c) => {
    try {
      const body = await c.req.json()
      const count = await backfillIdField(c.var.prisma, c.req.param('fieldId'), body.databaseId)
      return c.json({ backfilled: count })
    } catch (error) {
      console.error(error)
      return c.json({ error: 'Failed to backfill field' }, 500)
    }
  })
}
