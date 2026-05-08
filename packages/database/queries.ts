import { prisma } from "./client.js";
import type { Prisma } from "./generated/client/client.js";
import type { FieldType } from "./generated/client/client.js";


// ─── Legacy test queries ───────────────────────────────────────────────────────

/**
 * Get all tests from the database
 */
export async function getAllTests() {
    return await prisma.test.findMany({
        orderBy: {
            createdAt: "desc",
        },
    });
}

/**
 * Create a new test
 */
export async function createTest(name: string, description?: string) {
    return await prisma.test.create({
        data: {
            name,
            ...(description !== undefined && { description }),
        },
    });
}

/**
 * Get a test by ID
 */
export async function getTestById(id: number) {
    return await prisma.test.findUnique({
        where: {
            id,
        },
    });
}

// ─── Dynamic Fields System queries ────────────────────────────────────────────

/** List all databases */
export async function getDynDatabases() {
    return await prisma.dynDatabase.findMany({
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { fields: true, records: true } } },
    });
}

/** Create a new database */
export async function createDynDatabase(name: string, description?: string, icon?: string) {
    return await prisma.dynDatabase.create({
        data: {
            name,
            ...(description !== undefined && { description }),
            ...(icon !== undefined && { icon }),
        },
    });
}

/** Get a single database by ID */
export async function getDynDatabase(id: string) {
    return await prisma.dynDatabase.findUnique({
        where: { id },
    });
}

/** Delete a database */
export async function deleteDynDatabase(id: string) {
    return await prisma.dynDatabase.delete({
        where: { id },
    });
}

/** List fields for a database, ordered by position */
export async function getFields(databaseId: string) {
    return await prisma.field.findMany({
        where: { databaseId },
        orderBy: { position: "asc" },
        include: { options: { orderBy: { position: "asc" } } },
    });
}

/** Get one field by ID */
export async function getFieldById(fieldId: string) {
    return await prisma.field.findUnique({
        where: { id: fieldId },
        include: { options: { orderBy: { position: "asc" } } },
    });
}

/** Create a field in a database */
export async function createField(
    databaseId: string,
    name: string,
    type: FieldType,
    options?: { isPrimary?: boolean; required?: boolean; config?: object }
) {
    const maxPos = await prisma.field.aggregate({
        where: { databaseId },
        _max: { position: true },
    });
    const position = (maxPos._max.position ?? -1) + 1;

    return await prisma.field.create({
        data: {
            databaseId,
            name,
            type,
            position,
            isPrimary: options?.isPrimary ?? false,
            required: options?.required ?? false,
            config: options?.config ?? undefined,
        },
    });
}

/** List records for a database with their field values */
export async function getDynRecords(databaseId: string) {
    return await prisma.dynRecord.findMany({
        where: { databaseId, archivedAt: null },
        orderBy: { rowNumber: "asc" },
        include: {
            fieldValues: {
                include: { field: true },
            },
        },
    });
}

/** Create an empty record in a database */
export async function createDynRecord(databaseId: string) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
        const maxRow = await prisma.dynRecord.aggregate({
            where: { databaseId },
            _max: { rowNumber: true },
        });
        const rowNumber = (maxRow._max.rowNumber ?? 0) + 1;

        try {
            return await prisma.dynRecord.create({
                data: { databaseId, rowNumber },
                include: { fieldValues: true },
            });
        } catch (error) {
            const errorCode = typeof error === "object" && error !== null && "code" in error
                ? String(error.code)
                : undefined;

            if (errorCode !== "P2002" || attempt === 4) {
                throw error;
            }
        }
    }

    throw new Error(`Failed to create record for database ${databaseId}`);
}

/** Delete one or more records */
export async function deleteDynRecords(recordIds: string[]) {
    return await prisma.dynRecord.deleteMany({
        where: { id: { in: recordIds } },
    });
}

/** Upsert a single field value */
export async function setFieldValue(
    recordId: string,
    fieldId: string,
    payload: {
        textValue?: string | null;
        numberValue?: number | string | null;
        selectValue?: string | null;
        multiSelectValue?: string[];
        dateValue?: Date | string | null;
        personValue?: string[];
        boolValue?: boolean | null;
        jsonValue?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
    }
) {
    const cleaned: {
        textValue?: string | null;
        numberValue?: number | null;
        selectValue?: string | null;
        multiSelectValue?: string[];
        dateValue?: Date | null;
        personValue?: string[];
        boolValue?: boolean | null;
        jsonValue?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
    } = {
        textValue: payload.textValue,
        numberValue:
            typeof payload.numberValue === "string"
                ? (() => {
                    const n = parseFloat(payload.numberValue);
                    return Number.isNaN(n) ? null : n;
                })()
                : payload.numberValue,
        selectValue: payload.selectValue,
        multiSelectValue: payload.multiSelectValue,
        dateValue:
            typeof payload.dateValue === "string"
                ? new Date(payload.dateValue)
                : payload.dateValue,
        personValue: payload.personValue,
        boolValue: payload.boolValue,
        jsonValue: payload.jsonValue,
    };

    return await prisma.fieldValue.upsert({
        where: { recordId_fieldId: { recordId, fieldId } },
        create: { recordId, fieldId, ...cleaned },
        update: cleaned,
    });
}


/** Get all options for a field */
export async function getFieldOptions(fieldId: string) {
    return await prisma.fieldOption.findMany({
        where: { fieldId },
        orderBy: { position: "asc" },
    });
}

/** Add an option to a select/multi_select field */
export async function createFieldOption(fieldId: string, label: string, color?: string, position?: number) {
    const agg = await prisma.fieldOption.aggregate({
        where: { fieldId },
        _max: { position: true },
    });
    const nextPosition = position ?? ((agg._max.position ?? -1) + 1);
    return await prisma.fieldOption.create({
        data: { fieldId, label, color: color ?? null, position: nextPosition },
    });
}

/** Update an existing field option */
export async function updateFieldOption(
    fieldId: string,
    optionId: string,
    data: { label?: string; color?: string | null; position?: number }
) {
    const option = await prisma.fieldOption.findUnique({ where: { id: optionId } });
    if (!option || option.fieldId !== fieldId) {
        throw new Error('Field option not found');
    }

    return await prisma.fieldOption.update({
        where: { id: optionId },
        data,
    });
}

/** Delete a field option */
export async function deleteFieldOption(optionId: string) {
    return await prisma.fieldOption.delete({ where: { id: optionId } });
}

/** Update a field's config JSON */
export async function updateFieldConfig(fieldId: string, config: Prisma.InputJsonValue) {
    return await prisma.field.update({
        where: { id: fieldId },
        data: { config },
    });
}

/** Delete a field and all its values — throws if the field is the primary field */
export async function deleteField(fieldId: string) {
    const field = await prisma.field.findUnique({ where: { id: fieldId } });
    if (!field) throw new Error('Field not found');
    if (field.isPrimary) throw new Error('Cannot delete the primary field');
    return await prisma.field.delete({ where: { id: fieldId } });
}

/** Update a field's name and/or config */
export async function updateField(
    fieldId: string,
    data: { name?: string; config?: Prisma.InputJsonValue }
) {
    return await prisma.field.update({
        where: { id: fieldId },
        data,
        include: { options: { orderBy: { position: "asc" } } },
    });
}

/** Swap a field's position with its left or right neighbour */
export async function reorderField(fieldId: string, direction: "left" | "right") {
    const field = await prisma.field.findUnique({ where: { id: fieldId } });
    if (!field) throw new Error("Field not found");

    const neighbour = await prisma.field.findFirst({
        where: {
            databaseId: field.databaseId,
            position: direction === "left" ? { lt: field.position } : { gt: field.position },
        },
        orderBy: { position: direction === "left" ? "desc" : "asc" },
    });
    if (!neighbour) return null; // already at edge

    await prisma.$transaction([
        prisma.field.update({ where: { id: field.id },     data: { position: neighbour.position } }),
        prisma.field.update({ where: { id: neighbour.id }, data: { position: field.position } }),
    ]);
    return true;
}

/** Duplicate a field (including its options) and insert it right after the original */
export async function duplicateField(fieldId: string) {
    const src = await prisma.field.findUnique({
        where: { id: fieldId },
        include: { options: { orderBy: { position: "asc" } } },
    });
    if (!src) throw new Error("Field not found");

    // Shift positions of all fields after the source
    await prisma.field.updateMany({
        where: { databaseId: src.databaseId, position: { gt: src.position } },
        data: { position: { increment: 1 } },
    });

    const copy = await prisma.field.create({
        data: {
            databaseId: src.databaseId,
            name: `${src.name} (copy)`,
            type: src.type,
            position: src.position + 1,
            required: src.required,
            isPrimary: false,
            config: src.config ?? undefined,
        },
    });

    if (src.options.length > 0) {
        await prisma.fieldOption.createMany({
            data: src.options.map(o => ({
                fieldId: copy.id,
                label: o.label,
                color: o.color,
                position: o.position,
            })),
        });
    }

    return await prisma.field.findUnique({
        where: { id: copy.id },
        include: { options: { orderBy: { position: "asc" } } },
    });
}

// ─── DynUser queries ───────────────────────────────────────────────────────────

/** List all users (for person field picker) */
export async function getUsers() {
    return await prisma.dynUser.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true, avatarUrl: true },
    });
}

/** Search users by name or email */
export async function searchUsers(q: string) {
    return await prisma.dynUser.findMany({
        where: {
            OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
            ],
        },
        orderBy: { name: "asc" },
        take: 20,
        select: { id: true, name: true, email: true, avatarUrl: true },
    });
}

/** Seed a demo user (idempotent — skips if email exists) */
export async function upsertDynUser(name: string, email: string, avatarUrl?: string) {
    return await prisma.dynUser.upsert({
        where: { email },
        create: { name, email, avatarUrl },
        update: { name, avatarUrl },
    });
}

/**
 * Backfill id-type field values for all existing records that don't yet have
 * a value for this field. Sets textValue = String(rowNumber).
 */
// ─── Statistics queries ────────────────────────────────────────────────────────

/** Simple stats for a database: total records + daily counts by created_at / updated_at */
export async function getDatabaseStats(databaseId: string) {
    const totalRecords = await prisma.dynRecord.count({
        where: { databaseId, archivedAt: null },
    });

    const byCreatedRaw = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT DATE("createdAt") AS date, COUNT(*) AS count
        FROM dyn_records
        WHERE "databaseId" = ${databaseId} AND "archivedAt" IS NULL
        GROUP BY DATE("createdAt")
        ORDER BY date DESC
        LIMIT 30
    `;

    const byUpdatedRaw = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT DATE("updatedAt") AS date, COUNT(*) AS count
        FROM dyn_records
        WHERE "databaseId" = ${databaseId} AND "archivedAt" IS NULL
        GROUP BY DATE("updatedAt")
        ORDER BY date DESC
        LIMIT 30
    `;

    return {
        totalRecords,
        byCreatedAt: byCreatedRaw.map(r => ({ date: String(r.date), count: Number(r.count) })),
        byUpdatedAt: byUpdatedRaw.map(r => ({ date: String(r.date), count: Number(r.count) })),
    };
}

export async function backfillIdField(fieldId: string, databaseId: string) {
    const records = await prisma.dynRecord.findMany({
        where: { databaseId },
        select: { id: true, rowNumber: true },
    });

    const existing = await prisma.fieldValue.findMany({
        where: { fieldId, recordId: { in: records.map(r => r.id) } },
        select: { recordId: true },
    });
    const existingSet = new Set(existing.map(e => e.recordId));

    const toCreate = records
        .filter(r => !existingSet.has(r.id))
        .map(r => ({
            id: crypto.randomUUID(),
            recordId: r.id,
            fieldId,
            textValue: String(r.rowNumber),
        }));

    if (toCreate.length > 0) {
        await prisma.fieldValue.createMany({ data: toCreate });
    }
    return toCreate.length;
}

// ─── DynView queries ───────────────────────────────────────────────────────────

import type { DynViewType, Prisma as PrismaTypes } from "./generated/client/client.js";

/** List all views for a database ordered by position */
export async function getDatabaseViews(databaseId: string) {
    return await prisma.dynView.findMany({
        where: { databaseId },
        orderBy: { position: "asc" },
    });
}

/** Create a view in a database */
export async function createDatabaseView(input: {
    databaseId: string;
    name: string;
    type: DynViewType;
    icon?: string;
    isDefault?: boolean;
    config?: PrismaTypes.InputJsonValue;
}) {
    const maxPos = await prisma.dynView.aggregate({
        where: { databaseId: input.databaseId },
        _max: { position: true },
    });
    const position = (maxPos._max.position ?? -1) + 1;

    return await prisma.dynView.create({
        data: {
            databaseId: input.databaseId,
            name: input.name,
            type: input.type,
            icon: input.icon ?? null,
            position,
            isDefault: input.isDefault ?? false,
            ...(input.config !== undefined && { config: input.config }),
        },
    });
}

/** Update a view's metadata */
export async function updateDatabaseView(
    viewId: string,
    patch: {
        name?: string;
        icon?: string | null;
        isDefault?: boolean;
        config?: PrismaTypes.InputJsonValue | PrismaTypes.NullableJsonNullValueInput;
    }
) {
    return await prisma.dynView.update({
        where: { id: viewId },
        data: patch,
    });
}

/** Delete a view — throws if it is the last view or the default view */
export async function deleteDatabaseView(viewId: string) {
    const view = await prisma.dynView.findUnique({ where: { id: viewId } });
    if (!view) throw new Error("View not found");
    if (view.isDefault) throw new Error("Cannot delete the default view");

    const count = await prisma.dynView.count({ where: { databaseId: view.databaseId } });
    if (count <= 1) throw new Error("Cannot delete the last remaining view");

    return await prisma.dynView.delete({ where: { id: viewId } });
}

/** Set a view as the default for its database (single transaction) */
export async function setDefaultDatabaseView(databaseId: string, viewId: string) {
    return await prisma.$transaction([
        prisma.dynView.updateMany({
            where: { databaseId, isDefault: true },
            data: { isDefault: false },
        }),
        prisma.dynView.update({
            where: { id: viewId },
            data: { isDefault: true },
        }),
    ]);
}

/** Reorder views by providing the full ordered list of view IDs */
export async function reorderDatabaseViews(databaseId: string, orderedViewIds: string[]) {
    const updates = orderedViewIds.map((id, idx) =>
        prisma.dynView.update({ where: { id }, data: { position: idx } })
    );
    return await prisma.$transaction(updates);
}

/** Ensure at least one default view exists for a database; creates a Spreadsheet view if not */
export async function ensureDefaultView(databaseId: string) {
    const existing = await prisma.dynView.findFirst({
        where: { databaseId, isDefault: true },
    });
    if (existing) return existing;

    const anyView = await prisma.dynView.findFirst({ where: { databaseId } });
    if (anyView) {
        return await prisma.dynView.update({
            where: { id: anyView.id },
            data: { isDefault: true },
        });
    }

    return await createDatabaseView({
        databaseId,
        name: "Spreadsheet",
        type: "spreadsheet",
        isDefault: true,
    });
}

/**
 * Ensure at least one primary (title) field exists for a database.
 * If a text field already exists, marks the first one as primary.
 * Otherwise creates a "Name" text field at position -1 (sorts before all others).
 */
export async function ensurePrimaryField(databaseId: string) {
    const existing = await prisma.field.findFirst({
        where: { databaseId, isPrimary: true },
    });
    if (existing) return existing;

    // Try to promote the first text field
    const firstText = await prisma.field.findFirst({
        where: { databaseId, type: 'text' },
        orderBy: { position: 'asc' },
    });
    if (firstText) {
        return await prisma.field.update({
            where: { id: firstText.id },
            data: { isPrimary: true },
            include: { options: { orderBy: { position: 'asc' } } },
        });
    }

    // No text field — create a Name field at position -1 so it sorts first
    return await prisma.field.create({
        data: {
            databaseId,
            name: 'Name',
            type: 'text',
            position: -1,
            isPrimary: true,
        },
        include: { options: { orderBy: { position: 'asc' } } },
    });
}
