import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { streamSSE } from 'hono/streaming'
import { dbEvents } from './pubsub.js'
import {
  getAllTests,
  createTest,
  getDynDatabases,
  createDynDatabase,
  getDynRecords,
  createDynRecord,
  setFieldValue,
  getUsers,
  searchUsers,
  upsertDynUser,
  deleteDynRecords,
  deleteDynDatabase,
  getDatabaseStats,
  getDatabaseViews,
  createDatabaseView,
  updateDatabaseView,
  deleteDatabaseView,
  setDefaultDatabaseView,
  reorderDatabaseViews,
  ensureDefaultView,
  createField,
  ensurePrimaryField,
} from '@local/database'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import crypto from 'crypto'
import { TEMPLATES } from './config/templates.js'
import { createDatabaseFromTemplate } from './services/template.service.js'
import { registerFieldRoutes } from './services/field.service.js'

const app = new Hono()
const GLOBAL_DATABASE_STREAM_ID = '__GLOBAL_DATABASES__'

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
})

const R2_BUCKET = process.env.R2_BUCKET || ''
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || ''

// Enable CORS for web app
const origins = process.env.ORIGINS || 'http://localhost:2001'
app.use('/*', cors({
  origin: origins.split(','),
  credentials: true,
}))

// Protect all /api/* routes with a fixed API key (for MCP server access)
const MCP_API_KEY = process.env.MCP_API_KEY || 'namviek-mcp-dev-key'
app.use('/api/*', async (c, next) => {
  const key = c.req.header('x-api-key') || c.req.query('x-api-key')
  console.log(`[API] Incoming request: ${c.req.method} ${c.req.url} ${key}`)

  if (!key || key !== MCP_API_KEY) {
    return c.json({ error: 'Unauthorized: invalid or missing x-api-key' }, 401)
  }
  await next()
})

app.get('/', (c) => {
  return c.text('Hello Hono 2!')
})

// ─── Legacy test routes ────────────────────────────────────────────────────────

// Get all tests
app.get('/api/tests', async (c) => {
  try {
    const tests = await getAllTests()
    return c.json(tests)
  } catch (error) {
    console.log('error', error)
    return c.json({ error: 'Failed to fetch tests' }, 500)
  }
})

// Create a new test
app.post('/api/tests', async (c) => {
  try {
    const body = await c.req.json()
    const test = await createTest(body.name, body.description)
    return c.json(test, 201)
  } catch (error) {
    return c.json({ error: 'Failed to create test' }, 500)
  }
})

// ─── Dynamic Fields System routes ─────────────────────────────────────────────

// POST /api/databases/from-template — create database from template
app.post('/api/databases/from-template', async (c) => {
  try {
    const body = await c.req.json()
    if (!body.templateId) return c.json({ error: 'templateId is required' }, 400)
    const db = await createDatabaseFromTemplate(body.templateId, body.name, body.icon)
    return c.json(db, 201)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Failed to create database from template' }, 500)
  }
})

// GET /api/databases/from-template/stream — create database via SSE stream
app.get('/api/databases/from-template/stream', (c) => {
  console.log('[API] Hit /api/databases/from-template/stream endpoint');
  const templateId = c.req.query('templateId')
  const name = c.req.query('name')
  const icon = c.req.query('icon')

  console.log(`[API] templateId: ${templateId}, name: ${name}, icon: ${icon}`);

  if (!templateId) return c.json({ error: 'templateId is required' }, 400)

  return streamSSE(c, async (stream) => {
    console.log('[API] streamSSE initialized');
    try {
      console.log('[API] Calling createDatabaseFromTemplate...');
      const db = await createDatabaseFromTemplate(templateId, name, icon, async (msg) => {
        await stream.writeSSE({
          event: 'progress',
          data: msg,
        })
      })
      await stream.writeSSE({
        event: 'done',
        data: JSON.stringify(db),
      })
    } catch (error: any) {
      console.error(error)
      await stream.writeSSE({
        event: 'error',
        data: error.message || 'Failed to create from template',
      })
    }
  })
})

// GET /api/databases/:id/stream — SSE for real-time sync
app.get('/api/databases/:id/stream', (c) => {
  const dbId = c.req.param('id')

  return streamSSE(c, async (stream) => {
    let active = true

    const unsubscribe = dbEvents.subscribe(dbId, async (event, data) => {
      if (!active) return
      try {
        await stream.writeSSE({
          event,
          data: JSON.stringify(data),
        })
      } catch (err) {
        console.error('SSE write error', err)
      }
    })

    stream.onAbort(() => {
      active = false
      unsubscribe()
    })

    // Keep connection alive
    while (active) {
      await stream.sleep(15000)
    }
  })
})

// GET /api/databases/stream — SSE for database list changes
app.get('/api/databases/stream', (c) => {
  return streamSSE(c, async (stream) => {
    let active = true

    const unsubscribe = dbEvents.subscribe(GLOBAL_DATABASE_STREAM_ID, async (event, data) => {
      if (!active) return
      try {
        await stream.writeSSE({
          event,
          data: JSON.stringify(data),
        })
      } catch (err) {
        console.error('Database SSE write error', err)
      }
    })

    stream.onAbort(() => {
      active = false
      unsubscribe()
    })

    while (active) {
      await stream.sleep(15000)
    }
  })
})

// GET /api/databases — list all databases
app.get('/api/databases', async (c) => {
  try {
    const databases = await getDynDatabases()
    return c.json(databases)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Failed to fetch databases' }, 500)
  }
})

// POST /api/databases — create a database
app.post('/api/databases', async (c) => {
  try {
    const body = await c.req.json()
    if (!body.name?.trim()) return c.json({ error: 'name is required' }, 400)
    const icon = typeof body.icon === 'string' && body.icon.trim() ? body.icon.trim() : undefined
    const db = await createDynDatabase(body.name.trim(), body.description, icon)
    // Create primary text (title) field
    await createField(db.id, 'Name', 'text', { isPrimary: true })
    // Create default view (use provided or fallback to Spreadsheet)
    await createDatabaseView({
      databaseId: db.id,
      name: body.defaultView?.name ?? 'Spreadsheet',
      type: body.defaultView?.type ?? 'spreadsheet',
      icon: body.defaultView?.icon,
      config: body.defaultView?.config,
      isDefault: true,
    })
    dbEvents.publish(GLOBAL_DATABASE_STREAM_ID, 'DATABASE_CREATED', db)
    return c.json(db, 201)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Failed to create database' }, 500)
  }
})

// DELETE /api/databases/:id — delete a database
app.delete('/api/databases/:id', async (c) => {
  try {
    const dbId = c.req.param('id')
    dbEvents.publish(GLOBAL_DATABASE_STREAM_ID, 'DATABASE_DELETED', { id: dbId })
    await deleteDynDatabase(dbId)
    return c.json({ success: true })
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Failed to delete database' }, 500)
  }
})

// GET /api/templates — get all predefined templates
app.get('/api/templates', (c) => {
  return c.json(TEMPLATES)
})

// GET /api/databases/:id/stats — simple stats for MCP agent
app.get('/api/databases/:id/stats', async (c) => {
  try {
    const stats = await getDatabaseStats(c.req.param('id'))
    return c.json(stats)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Failed to fetch stats' }, 500)
  }
})

// /api/fields routes are handled in field.service.ts to keep things organized
registerFieldRoutes(app, dbEvents)

// ─── View routes ───────────────────────────────────────────────────────────────

const VALID_VIEW_TYPES = ['spreadsheet', 'kanban', 'calendar', 'timeline'] as const
const VALID_GROUPBY_FIELD_TYPES = ['select', 'multi_select', 'date', 'created_time', 'updated_time'] as const
const VALID_GRANULARITIES = ['day', 'month', 'quarter'] as const
const VALID_CALENDAR_MODES = ['month', 'week'] as const

function validateViewConfig(config: any): string | null {
  if (!config || typeof config !== 'object') return null

  if (config.groupBy !== undefined) {
    if (!config.groupBy || typeof config.groupBy !== 'object') {
      return 'groupBy must be an object'
    }

    if (!VALID_GROUPBY_FIELD_TYPES.includes(config.groupBy.fieldType)) {
      return `groupBy fieldType must be one of: ${VALID_GROUPBY_FIELD_TYPES.join(', ')}`
    }

    const isDateLike = ['date', 'created_time', 'updated_time'].includes(config.groupBy.fieldType)
    if (isDateLike && !VALID_GRANULARITIES.includes(config.groupBy.granularity)) {
      return `granularity must be one of: ${VALID_GRANULARITIES.join(', ')}`
    }
  }

  if (config.calendar !== undefined) {
    if (!config.calendar || typeof config.calendar !== 'object') {
      return 'calendar must be an object'
    }
    if (config.calendar.mode !== undefined && !VALID_CALENDAR_MODES.includes(config.calendar.mode)) {
      return `calendar mode must be one of: ${VALID_CALENDAR_MODES.join(', ')}`
    }
    if (config.calendar.startDateFieldId !== undefined && typeof config.calendar.startDateFieldId !== 'string') {
      return 'calendar startDateFieldId must be a string'
    }
    if (config.calendar.endDateFieldId !== undefined && typeof config.calendar.endDateFieldId !== 'string') {
      return 'calendar endDateFieldId must be a string'
    }
  }

  if (config.timeline !== undefined) {
    if (!config.timeline || typeof config.timeline !== 'object') {
      return 'timeline must be an object'
    }
    if (config.timeline.startDateFieldId !== undefined && typeof config.timeline.startDateFieldId !== 'string') {
      return 'timeline startDateFieldId must be a string'
    }
    if (config.timeline.endDateFieldId !== undefined && typeof config.timeline.endDateFieldId !== 'string') {
      return 'timeline endDateFieldId must be a string'
    }
    if (config.timeline.assigneeFieldId !== undefined && typeof config.timeline.assigneeFieldId !== 'string') {
      return 'timeline assigneeFieldId must be a string'
    }
    if (config.timeline.colorFieldId !== undefined && typeof config.timeline.colorFieldId !== 'string') {
      return 'timeline colorFieldId must be a string'
    }
    if (config.timeline.highlightedWeekdays !== undefined) {
      if (!Array.isArray(config.timeline.highlightedWeekdays)) {
        return 'timeline highlightedWeekdays must be an array'
      }
      const invalid = config.timeline.highlightedWeekdays.some((day: unknown) =>
        typeof day !== 'number' || Number.isNaN(day) || day < 0 || day > 6
      )
      if (invalid) {
        return 'timeline highlightedWeekdays must contain numbers between 0 and 6'
      }
    }
    if (config.timeline.groupHeight !== undefined) {
      if (typeof config.timeline.groupHeight !== 'number' || Number.isNaN(config.timeline.groupHeight)) {
        return 'timeline groupHeight must be a number'
      }
      if (config.timeline.groupHeight < 120 || config.timeline.groupHeight > 1200) {
        return 'timeline groupHeight must be between 120 and 1200'
      }
    }
  }

  return null
}

// GET /api/databases/:id/views
app.get('/api/databases/:id/views', async (c) => {
  try {
    const views = await getDatabaseViews(c.req.param('id'))
    return c.json(views)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Failed to fetch views' }, 500)
  }
})

// POST /api/databases/:id/views
app.post('/api/databases/:id/views', async (c) => {
  try {
    const databaseId = c.req.param('id')
    const body = await c.req.json()
    if (!body.name?.trim()) return c.json({ error: 'name is required' }, 400)
    if (!VALID_VIEW_TYPES.includes(body.type)) {
      return c.json({ error: `type must be one of: ${VALID_VIEW_TYPES.join(', ')}` }, 400)
    }
    const validationError = validateViewConfig(body.config)
    if (validationError) {
      return c.json({ error: validationError }, 400)
    }
    const view = await createDatabaseView({
      databaseId,
      name: body.name.trim(),
      type: body.type,
      icon: body.icon,
      config: body.config,
    })
    return c.json(view, 201)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Failed to create view' }, 500)
  }
})

// PATCH /api/views/:viewId
app.patch('/api/views/:viewId', async (c) => {
  try {
    const viewId = c.req.param('viewId')
    const body = await c.req.json()
    const patch: Record<string, unknown> = {}
    if (body.name !== undefined) patch.name = body.name
    if (body.icon !== undefined) patch.icon = body.icon
    if (body.config !== undefined) {
      const validationError = validateViewConfig(body.config)
      if (validationError) {
        return c.json({ error: validationError }, 400)
      }
      patch.config = body.config
    }
    const view = await updateDatabaseView(viewId, patch)
    return c.json(view)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Failed to update view' }, 500)
  }
})

// DELETE /api/views/:viewId
app.delete('/api/views/:viewId', async (c) => {
  try {
    const view = await deleteDatabaseView(c.req.param('viewId'))
    return c.json(view)
  } catch (error: any) {
    if (error?.message === 'Cannot delete the last remaining view' || error?.message === 'Cannot delete the default view') {
      return c.json({ error: error.message }, 400)
    }
    console.error(error)
    return c.json({ error: 'Failed to delete view' }, 500)
  }
})

// POST /api/databases/:id/views/reorder
app.post('/api/databases/:id/views/reorder', async (c) => {
  try {
    const databaseId = c.req.param('id')
    const body = await c.req.json()
    if (!Array.isArray(body.viewIds)) return c.json({ error: 'viewIds array is required' }, 400)
    await reorderDatabaseViews(databaseId, body.viewIds)
    return c.json({ success: true })
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Failed to reorder views' }, 500)
  }
})

// POST /api/databases/:id/views/:viewId/default
app.post('/api/databases/:id/views/:viewId/default', async (c) => {
  try {
    const { id: databaseId, viewId } = c.req.param()
    await setDefaultDatabaseView(databaseId, viewId)
    return c.json({ success: true })
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Failed to set default view' }, 500)
  }
})

// GET /api/databases/:id/records — list records with field values
app.get('/api/databases/:id/records', async (c) => {
  try {
    const records = await getDynRecords(c.req.param('id'))
    return c.json(records)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Failed to fetch records' }, 500)
  }
})

// POST /api/databases/:id/records — create an empty record
app.post('/api/databases/:id/records', async (c) => {
  try {
    const record = await createDynRecord(c.req.param('id'))
    dbEvents.publish(c.req.param('id'), 'RECORD_CREATED', record)
    return c.json(record, 201)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Failed to create record' }, 500)
  }
})

// DELETE /api/records — delete multiple records
app.delete('/api/records', async (c) => {
  try {
    const body = await c.req.json()
    if (!Array.isArray(body.ids)) return c.json({ error: 'ids array is required' }, 400)
    await deleteDynRecords(body.ids)

    // We don't have dbId directly here, but we could pass it or clients can just listen.
    // Actually, deleteDynRecords doesn't return dbId, so frontend should pass databaseId.
    if (body.databaseId) {
      dbEvents.publish(body.databaseId, 'RECORDS_DELETED', { ids: body.ids })
    }
    return c.json({ success: true })
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Failed to delete records' }, 500)
  }
})

// PUT /api/records/:recordId/values/:fieldId — upsert a field value
app.put('/api/records/:recordId/values/:fieldId', async (c) => {
  try {
    const body = await c.req.json()
    const { databaseId, ...payload } = body
    const value = await setFieldValue(
      c.req.param('recordId'),
      c.req.param('fieldId'),
      payload
    )
    if (body.databaseId) {
      dbEvents.publish(body.databaseId, 'VALUE_UPDATED', value)
    }
    return c.json(value)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Failed to set field value' }, 500)
  }
})

// ─── Users routes ──────────────────────────────────────────────────────────────

// ─── Upload routes ─────────────────────────────────────────────────────────────

app.post('/api/upload', async (c) => {
  try {
    const body = await c.req.parseBody()
    const file = body['file'] as File

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'File is required' }, 400)
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Generate a unique key
    const uniqueId = crypto.randomBytes(8).toString('hex')
    const extension = file.name.split('.').pop() || ''
    const key = `uploads/${Date.now()}-${uniqueId}.${extension}`

    await s3Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    }))

    const url = `${R2_PUBLIC_URL}/${key}`

    return c.json({
      url,
      name: file.name,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return c.json({ error: 'Failed to upload file' }, 500)
  }
})

app.delete('/api/upload', async (c) => {
  try {
    const url = c.req.query('url')
    if (!url) return c.json({ error: 'url is required' }, 400)

    // Extract key from URL
    const publicUrlPrefix = `${R2_PUBLIC_URL}/`
    if (!url.startsWith(publicUrlPrefix)) {
      return c.json({ error: 'Invalid URL' }, 400)
    }

    const key = url.slice(publicUrlPrefix.length)

    await s3Client.send(new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    }))

    return c.json({ success: true })
  } catch (error) {
    console.error('Delete upload error:', error)
    return c.json({ error: 'Failed to delete file' }, 500)
  }
})

// ─── Users routes ──────────────────────────────────────────────────────────────

// GET /api/users?q= — list or search users
app.get('/api/users', async (c) => {
  try {
    const q = c.req.query('q')?.trim()
    const users = q ? await searchUsers(q) : await getUsers()
    return c.json(users)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Failed to fetch users' }, 500)
  }
})

// POST /api/users — create/upsert a user (useful for seeding)
app.post('/api/users', async (c) => {
  try {
    const body = await c.req.json()
    if (!body.name?.trim() || !body.email?.trim()) {
      return c.json({ error: 'name and email are required' }, 400)
    }
    const user = await upsertDynUser(body.name.trim(), body.email.trim(), body.avatarUrl)
    return c.json(user, 201)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Failed to create user' }, 500)
  }
})

serve({
  fetch: app.fetch,
  port: Number(process.env.PORT) || 4001
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})

