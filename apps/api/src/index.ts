import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import {
  getAllTests,
  createTest,
  getDynDatabases,
  createDynDatabase,
  getFields,
  createField,
  getDynRecords,
  createDynRecord,
  setFieldValue,
  getFieldOptions,
  createFieldOption,
  deleteFieldOption,
  deleteField,
  updateField,
  reorderField,
  duplicateField,
  getUsers,
  searchUsers,
  upsertDynUser,
  backfillIdField,
  deleteDynRecords,
} from '@local/database'
import type { FieldType } from '@local/database'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import crypto from 'crypto'

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


const app = new Hono()

// Enable CORS for web app
const origins = process.env.ORIGINS || 'http://localhost:2001'
app.use('/*', cors({
  origin: origins.split(','),
  credentials: true,
}))

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
    return c.json(db, 201)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Failed to create database' }, 500)
  }
})

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
    return c.json(field, 201)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Failed to create field' }, 500)
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
    const value = await setFieldValue(
      c.req.param('recordId'),
      c.req.param('fieldId'),
      body
    )
    return c.json(value)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Failed to set field value' }, 500)
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
    await deleteField(c.req.param('fieldId'))
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

