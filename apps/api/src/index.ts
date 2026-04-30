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
  const key = c.req.header('x-api-key')
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
    const db = await createDatabaseFromTemplate(body.templateId, body.name)
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

  console.log(`[API] templateId: ${templateId}, name: ${name}`);

  if (!templateId) return c.json({ error: 'templateId is required' }, 400)

  return streamSSE(c, async (stream) => {
    console.log('[API] streamSSE initialized');
    try {
      console.log('[API] Calling createDatabaseFromTemplate...');
      const db = await createDatabaseFromTemplate(templateId, name, async (msg) => {
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
    const db = await createDynDatabase(body.name.trim(), body.description)
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

