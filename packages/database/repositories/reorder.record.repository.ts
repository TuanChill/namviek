import { prisma } from '../client.js';
import type { Prisma } from '../generated/client/client.js';

const ORDER_STEP = 1024;
const ORDER_MIN_GAP = 1e-6;

interface MoveDynRecordKanbanInput {
  databaseId: string;
  viewId: string;
  recordId: string;
  groupFieldId: string;
  toGroupKey: string;
  beforeRecordId?: string | null;
  afterRecordId?: string | null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeViewAndFilterConfig(
  viewConfig: Prisma.JsonValue | null,
  filterConfig: Prisma.JsonValue | undefined,
): Prisma.JsonValue | null {
  if (filterConfig === undefined) return viewConfig;
  if (isPlainObject(viewConfig)) {
    return { ...viewConfig, filter: filterConfig } as Prisma.JsonValue;
  }
  return { filter: filterConfig } as Prisma.JsonValue;
}

function getDateValueForGroupKey(
  groupKey: string,
  granularity: 'day' | 'month' | 'quarter' | undefined,
): Date | null {
  if (groupKey === '__none__') return null;

  if (granularity === 'month') {
    if (!/^\d{4}-\d{2}$/.test(groupKey)) return null;
    return new Date(`${groupKey}-01T00:00:00.000Z`);
  }

  if (granularity === 'quarter') {
    const match = groupKey.match(/^(\d{4})-Q([1-4])$/);
    if (!match) return null;
    const year = match[1] ?? '';
    const quarterPart = match[2] ?? '';
    const quarter = Number.parseInt(quarterPart, 10);
    const month = String((quarter - 1) * 3 + 1).padStart(2, '0');
    return new Date(`${year}-${month}-01T00:00:00.000Z`);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(groupKey)) return null;
  return new Date(`${groupKey}T00:00:00.000Z`);
}

export async function moveDynRecordKanban(input: MoveDynRecordKanbanInput) {
  const { databaseId, viewId, recordId, groupFieldId, toGroupKey } = input;

  const moveResult = await prisma.$transaction(async (tx) => {
    const [record, groupField, view] = await Promise.all([
      tx.dynRecord.findUnique({ where: { id: recordId } }),
      tx.field.findUnique({ where: { id: groupFieldId } }),
      tx.dynView.findUnique({ where: { id: viewId }, include: { filter: true } }),
    ]);

    if (!record || record.databaseId !== databaseId || record.archivedAt !== null) {
      throw new Error('Record not found in database');
    }
    if (!groupField || groupField.databaseId !== databaseId) {
      throw new Error('Invalid group field');
    }
    if (!view || view.databaseId !== databaseId) {
      throw new Error('Invalid view');
    }

    const viewConfig = mergeViewAndFilterConfig(view.config, view.filter?.config);
    const groupBy = isPlainObject(viewConfig) && isPlainObject(viewConfig.groupBy)
      ? viewConfig.groupBy as { fieldId?: unknown; granularity?: unknown }
      : undefined;
    const granularity = groupBy?.granularity === 'day' || groupBy?.granularity === 'month' || groupBy?.granularity === 'quarter'
      ? groupBy.granularity
      : undefined;

    const whereById = {
      databaseId,
      archivedAt: null,
      ...(toGroupKey === '__none__'
        ? {
            OR: [
              { fieldValues: { none: { fieldId: groupFieldId } } },
              {
                fieldValues: {
                  some: {
                    fieldId: groupFieldId,
                    ...(groupField.type === 'select'
                      ? { selectValue: null }
                      : groupField.type === 'multi_select'
                        ? { multiSelectValue: { equals: [] } }
                        : { dateValue: null }),
                  },
                },
              },
            ],
          }
        : groupField.type === 'select'
          ? { fieldValues: { some: { fieldId: groupFieldId, selectValue: toGroupKey } } }
          : groupField.type === 'multi_select'
            ? { fieldValues: { some: { fieldId: groupFieldId, multiSelectValue: { equals: [toGroupKey] } } } }
            : {
                fieldValues: {
                  some: {
                    fieldId: groupFieldId,
                    dateValue: getDateValueForGroupKey(toGroupKey, granularity),
                  },
                },
              }),
    } as Prisma.DynRecordWhereInput;

    const neighborIds = [input.beforeRecordId, input.afterRecordId]
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
    const neighbors = neighborIds.length > 0
      ? await tx.dynRecord.findMany({
          where: {
            databaseId,
            archivedAt: null,
            id: { in: neighborIds },
          },
          select: { id: true, order: true },
        })
      : [];
    const neighborMap = new Map(neighbors.map((n) => [n.id, n.order]));
    const prevOrder = input.afterRecordId ? neighborMap.get(input.afterRecordId) : undefined;
    const nextOrder = input.beforeRecordId ? neighborMap.get(input.beforeRecordId) : undefined;

    let newOrder: number;
    if (prevOrder != null && nextOrder != null) {
      if (nextOrder - prevOrder < ORDER_MIN_GAP) {
        const recordsInGroup = await tx.dynRecord.findMany({
          where: whereById,
          orderBy: [{ order: 'asc' }, { id: 'asc' }],
          select: { id: true },
        });

        for (let idx = 0; idx < recordsInGroup.length; idx += 1) {
          const groupRecord = recordsInGroup[idx];
          if (!groupRecord) continue;
          await tx.dynRecord.update({
            where: { id: groupRecord.id },
            data: { order: idx * ORDER_STEP },
          });
        }

        const [afterRecord, beforeRecord] = await Promise.all([
          input.afterRecordId
            ? tx.dynRecord.findUnique({ where: { id: input.afterRecordId }, select: { order: true } })
            : Promise.resolve(null),
          input.beforeRecordId
            ? tx.dynRecord.findUnique({ where: { id: input.beforeRecordId }, select: { order: true } })
            : Promise.resolve(null),
        ]);

        const afterOrder = afterRecord?.order;
        const beforeOrder = beforeRecord?.order;
        if (afterOrder != null && beforeOrder != null) {
          newOrder = (afterOrder + beforeOrder) / 2;
        } else if (afterOrder != null) {
          newOrder = afterOrder + ORDER_STEP;
        } else if (beforeOrder != null) {
          newOrder = beforeOrder - ORDER_STEP;
        } else {
          newOrder = 0;
        }
      } else {
        newOrder = (prevOrder + nextOrder) / 2;
      }
    } else if (prevOrder != null) {
      newOrder = prevOrder + ORDER_STEP;
    } else if (nextOrder != null) {
      newOrder = nextOrder - ORDER_STEP;
    } else {
      const firstInGroup = await tx.dynRecord.findFirst({
        where: whereById,
        orderBy: { order: 'asc' },
        select: { order: true },
      });
      newOrder = firstInGroup ? firstInGroup.order - ORDER_STEP : 0;
    }

    const fieldPayload = groupField.type === 'select'
      ? { selectValue: toGroupKey === '__none__' ? null : toGroupKey }
      : groupField.type === 'multi_select'
        ? { multiSelectValue: toGroupKey === '__none__' ? [] : [toGroupKey] }
        : { dateValue: getDateValueForGroupKey(toGroupKey, granularity) };

    await tx.fieldValue.upsert({
      where: { recordId_fieldId: { recordId, fieldId: groupFieldId } },
      create: { recordId, fieldId: groupFieldId, ...fieldPayload },
      update: fieldPayload,
    });

    await tx.dynRecord.update({
      where: { id: recordId },
      data: { order: newOrder },
    });

    return await tx.dynRecord.findUnique({
      where: { id: recordId },
      include: {
        fieldValues: {
          include: { field: true },
        },
      },
    });
  });

  if (!moveResult) {
    throw new Error('Failed to move record');
  }

  return moveResult;
}