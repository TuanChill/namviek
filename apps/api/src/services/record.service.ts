import { Hono } from 'hono'
import { moveDynRecordKanban } from '@local/database'

type DbEventPublisher = {
  publish: (databaseId: string, event: string, payload: unknown) => void
}

export function registerRecordRoutes(app: Hono, dbEvents: DbEventPublisher) {
  // POST /api/records/:recordId/move-kanban — move a record and update order optimistically
  app.post('/api/records/:recordId/move-kanban', async (c) => {
    try {
      const recordId = c.req.param('recordId')
      const body = await c.req.json()
      const databaseId = body.databaseId
      const viewId = body.viewId
      const groupFieldId = body.groupFieldId
      const toGroupKey = body.toGroupKey

      if (!databaseId || !viewId || !groupFieldId || typeof toGroupKey !== 'string') {
        return c.json({ error: 'databaseId, viewId, groupFieldId and toGroupKey are required' }, 400)
      }

      const moved = await moveDynRecordKanban({
        databaseId,
        viewId,
        recordId,
        groupFieldId,
        toGroupKey,
        beforeRecordId: body.beforeRecordId ?? null,
        afterRecordId: body.afterRecordId ?? null,
      })

      dbEvents.publish(databaseId, 'RECORD_MOVED', {
        id: moved.id,
        order: moved.order,
        groupFieldId,
        toGroupKey,
      })

      return c.json(moved)
    } catch (error: any) {
      if (typeof error?.message === 'string') {
        return c.json({ error: error.message }, 400)
      }

      console.error(error)
      return c.json({ error: 'Failed to move record in kanban' }, 500)
    }
  })
}