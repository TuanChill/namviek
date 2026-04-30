import { Hono } from 'hono'
import {
  getFields,
  createField,
  getFieldOptions,
  createFieldOption,
  deleteFieldOption,
  deleteField,
  updateField,
  reorderField,
  duplicateField,
  backfillIdField,
} from '@local/database'
import type { FieldType } from '@local/database'

type DbEventPublisher = {
  publish: (databaseId: string, event: string, payload: unknown) => void
}

export function registerFieldRoutes(app: Hono, dbEvents: DbEventPublisher) {
  // GET /api/databases/:id/fields — list fields
  app.get('/api/databases/:id/fields', async (c) => {
    try {
      const fields = await getFields(c.req.param('id'))
      return c.json(fields)
    } catch (error) {
      console.error(error)
      return c.json({ error: 'Failed to fetch fields' }, 500)
    }
  })

  // POST /api/databases/:id/fields — create a field
  app.post('/api/databases/:id/fields', async (c) => {
    try {
      const body = await c.req.json()
      if (!body.name?.trim()) return c.json({ error: 'name is required' }, 400)
      if (!body.type) return c.json({ error: 'type is required' }, 400)
      const field = await createField(
        c.req.param('id'),
        body.name.trim(),
        body.type as FieldType,
        { isPrimary: body.isPrimary, required: body.required, config: body.config }
      )
      dbEvents.publish(c.req.param('id'), 'FIELD_CREATED', field)
      return c.json(field, 201)
    } catch (error) {
      console.error(error)
      return c.json({ error: 'Failed to create field' }, 500)
    }
  })

  // GET /api/fields/:fieldId/options — list options for a field
  app.get('/api/fields/:fieldId/options', async (c) => {
    try {
      const options = await getFieldOptions(c.req.param('fieldId'))
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
      const option = await createFieldOption(
        c.req.param('fieldId'),
        body.label.trim(),
        body.color
      )
      return c.json(option, 201)
    } catch (error) {
      console.error(error)
      return c.json({ error: 'Failed to create option' }, 500)
    }
  })

  // DELETE /api/fields/:fieldId/options/:optionId — delete an option
  app.delete('/api/fields/:fieldId/options/:optionId', async (c) => {
    try {
      await deleteFieldOption(c.req.param('optionId'))
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
      await deleteField(c.req.param('fieldId'))
      if (databaseId) {
        dbEvents.publish(databaseId, 'FIELD_DELETED', { id: c.req.param('fieldId') })
      }
      return c.json({ success: true })
    } catch (error) {
      console.error(error)
      return c.json({ error: 'Failed to delete field' }, 500)
    }
  })

  // PATCH /api/fields/:fieldId — rename or update config
  app.patch('/api/fields/:fieldId', async (c) => {
    try {
      const body = await c.req.json()
      const field = await updateField(c.req.param('fieldId'), body)
      dbEvents.publish(field.databaseId, 'FIELD_UPDATED', field)
      return c.json(field)
    } catch (error) {
      console.error(error)
      return c.json({ error: 'Failed to update field' }, 500)
    }
  })

  // POST /api/fields/:fieldId/move — reorder left/right
  app.post('/api/fields/:fieldId/move', async (c) => {
    try {
      const body = await c.req.json()
      const result = await reorderField(c.req.param('fieldId'), body.direction)
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
      const field = await duplicateField(c.req.param('fieldId'))
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
      const count = await backfillIdField(c.req.param('fieldId'), body.databaseId)
      return c.json({ backfilled: count })
    } catch (error) {
      console.error(error)
      return c.json({ error: 'Failed to backfill field' }, 500)
    }
  })
}
