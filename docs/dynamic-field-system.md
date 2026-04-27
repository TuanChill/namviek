# Dynamic Field System — Code Reference

> **Stack:** Prisma + PostgreSQL · Hono API · React + shadcn/ui  
> **Entry point:** `http://localhost:2001/test`

---

## 1. Architecture Overview

```
Browser (/test)
  └── DynamicFieldPage.tsx        ← main page orchestrator
        ├── AddFieldDrawer.tsx    ← Sheet panel for creating fields
        ├── CellEditors.tsx       ← per-type inline cell editors
        ├── api.ts                ← typed fetch client
        ├── constants.tsx         ← field type metadata, formatters
        └── types.ts              ← shared TypeScript interfaces

Hono API (localhost:4001)
  └── apps/api/src/index.ts       ← all REST routes

Database package
  ├── prisma/schema.prisma        ← Prisma models
  ├── queries.ts                  ← all DB query functions
  └── client.ts                   ← Prisma client singleton
```

---

## 2. File-by-File Reference

### `packages/database/prisma/schema.prisma`

Defines all models. Key models added for dynamic fields:

| Model | Table | Purpose |
|---|---|---|
| `DynDatabase` | `dyn_databases` | A named container (like a Notion database) |
| `Field` | `dyn_fields` | Column definition with type + config |
| `FieldOption` | `dyn_field_options` | Choices for `select` / `multi_select` fields |
| `DynRecord` | `dyn_records` | A row of data |
| `FieldValue` | `dyn_field_values` | EAV value row — one per (record × field) |

**`FieldType` enum** — 15 types: `text`, `number`, `select`, `multi_select`, `date`, `person`, `checkbox`, `file`, `url`, `email`, `id`, `created_time`, `created_by`, `updated_time`, `updated_by`

**Key design — typed EAV:** `FieldValue` has one nullable column per value type. Only the column matching the field's type is non-null:

```prisma
model FieldValue {
  textValue        String?
  numberValue      Decimal?   @db.Decimal(20, 6)
  selectValue      String?    // FieldOption.id
  multiSelectValue String[]   // array of FieldOption.id
  dateValue        DateTime?  @db.Timestamptz(6)
  boolValue        Boolean?
  jsonValue        Json?
}
```

**`Field.config`** stores type-specific settings as JSON:

| Type | Config shape |
|---|---|
| `date` | `{ dateFormat, includeTime }` |
| `number` | `{ numberFormat, precision, currency }` |
| `text` | `{ richText }` |
| `select` / `multi_select` | `{ allowCreate }` |
| any | `{ customIcon }` — Lucide icon name override |

---

### `packages/database/queries.ts`

All database query functions. Import path: `@local/database`

#### Database queries
| Function | Description |
|---|---|
| `getDynDatabases()` | List all databases with `_count` of fields + records |
| `createDynDatabase(name)` | Create a new database |

#### Field queries
| Function | Description |
|---|---|
| `getFields(databaseId)` | List fields ordered by `position`, includes options |
| `createField(databaseId, name, type, opts?)` | Create a field, auto-assigns next position |
| `updateField(fieldId, { name?, config? })` | Rename or update config |
| `deleteField(fieldId)` | Delete field + cascades to all `FieldValue` rows |
| `reorderField(fieldId, direction)` | Swap position with left/right neighbour |
| `duplicateField(fieldId)` | Copy field + all its options, insert after original |

#### Field option queries
| Function | Description |
|---|---|
| `getFieldOptions(fieldId)` | List options ordered by position |
| `createFieldOption(fieldId, label, color?)` | Add an option, auto-assigns position |
| `deleteFieldOption(optionId)` | Delete a single option |

#### Record queries
| Function | Description |
|---|---|
| `getDynRecords(databaseId)` | List non-archived records with `fieldValues + field` |
| `createDynRecord(databaseId)` | Create empty record, auto-increments `rowNumber` |

#### Value queries
| Function | Description |
|---|---|
| `setFieldValue(recordId, fieldId, payload)` | Upsert a field value. **Coerces** `dateValue` string → `Date`, `numberValue` string → `number` |

---

### `apps/api/src/index.ts`

Hono server on port `4001`. All routes prefixed `/api`.

#### Database routes
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/databases` | List all databases |
| `POST` | `/api/databases` | Create database (`{ name }`) |

#### Field routes
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/databases/:id/fields` | List fields for a database |
| `POST` | `/api/databases/:id/fields` | Create field (`{ name, type, config? }`) |
| `PATCH` | `/api/fields/:fieldId` | Update name/config (`{ name?, config? }`) |
| `DELETE` | `/api/fields/:fieldId` | Delete field and all its values |
| `POST` | `/api/fields/:fieldId/move` | Move left/right (`{ direction: 'left'|'right' }`) |
| `POST` | `/api/fields/:fieldId/duplicate` | Duplicate field with options |

#### Field option routes
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/fields/:fieldId/options` | List options |
| `POST` | `/api/fields/:fieldId/options` | Add option (`{ label, color }`) |
| `DELETE` | `/api/fields/:fieldId/options/:optionId` | Remove option |

#### Record + value routes
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/databases/:id/records` | List records with field values |
| `POST` | `/api/databases/:id/records` | Create empty record |
| `PUT` | `/api/records/:recordId/values/:fieldId` | Upsert a cell value |

---

### `apps/web/src/pages/DynamicField/types.ts`

All shared TypeScript interfaces used across the frontend module.

Key types:
- `FieldType` — union of all 15 type strings
- `FieldConfig` — per-type config + `customIcon?: string`
- `Field` — full field with `options: FieldOption[]` and `config`
- `FieldValue` — raw EAV value row
- `DynRecord` — record with `fieldValues: FieldValue[]`
- `FieldValuePayload` — what the frontend sends to the value PUT endpoint

---

### `apps/web/src/pages/DynamicField/constants.tsx`

Metadata and formatting utilities. No network calls.

| Export | Description |
|---|---|
| `FIELD_TYPES` | Array of `{ type, label, Icon }` — maps type to Lucide icon |
| `COMPUTED_TYPES` | `['id', 'created_time', 'updated_time', 'created_by', 'updated_by']` — never write values for these |
| `ICON_OPTIONS` | 24 Lucide icons selectable as a custom field icon |
| `DATE_FORMATS` | 4 date format options stored in `field.config.dateFormat` |
| `NUMBER_FORMATS` | 4 number formats stored in `field.config.numberFormat` |
| `getFieldMeta(type)` | Returns `{ type, label, Icon }` for a given `FieldType` |
| `getIconByName(name)` | Resolves a stored icon name string back to a Lucide component |
| `formatDateValue(raw, config)` | Formats a raw ISO date string per field config |
| `formatNumberValue(raw, config)` | Formats a raw number string per field config |

---

### `apps/web/src/pages/DynamicField/api.ts`

Typed fetch client. Centralises all `fetch()` calls so pages never hit raw URLs.

```ts
api.databases.list()
api.databases.create(name)

api.fields.list(dbId)
api.fields.create(dbId, name, type, config?)
api.fields.update(fieldId, { name?, config? })
api.fields.delete(fieldId)
api.fields.move(fieldId, 'left' | 'right')
api.fields.duplicate(fieldId)

api.records.list(dbId)
api.records.create(dbId)

api.values.set(recordId, fieldId, payload)

api.options.list(fieldId)
api.options.create(fieldId, label, color)
api.options.delete(fieldId, optionId)
```

---

### `apps/web/src/pages/DynamicField/CellEditors.tsx`

Inline cell editors — one component per field type. Dispatched by `CellEditor`.

| Component | Field types | Behaviour |
|---|---|---|
| `TextCell` | `text`, `url`, `email`, others | Click → input, Enter/blur commits |
| `NumberCell` | `number` | Same; formats display via `formatNumberValue` |
| `DateCell` | `date` | Click → date/datetime-local input; draft state prevents premature save |
| `CheckboxCell` | `checkbox` | shadcn `Checkbox`, instant save on toggle |
| `SelectCell` | `select` | Dropdown of `field.options`; shows "No options" if empty |
| `MultiSelectCell` | `multi_select` | Checkbox list of `field.options`; saves array on each toggle |
| `ComputedCell` | `id`, `created_time`, `updated_time`, `created_by`, `updated_by` | Read-only; derives value from `record.rowNumber` / `record.createdAt` etc. |
| `OptionChip` | — | Reusable coloured chip for option labels |
| `CellEditor` | all | Dispatcher — picks the right cell component |

> **Date fix note:** `DateCell` uses controlled `value={draft}` + `onChange` so the draft is captured in React state before `onBlur` commits. Plain `defaultValue` caused the value to be empty on blur.

---

### `apps/web/src/pages/DynamicField/AddFieldDrawer.tsx`

shadcn `Sheet` (right side panel) for creating a new field.

**Sections:**
1. **Name** — text input
2. **Type grid** — 2-column button grid for all 15 types; no scroll
3. **Type-specific config** (appears based on selected type):
   - `select` / `multi_select` → Options manager: add label + color picker, see chips, remove
   - `date` → Date format dropdown + "Include time" toggle
   - `number` → Format dropdown + precision input + currency symbol
   - `text` → Rich text toggle

**Submit flow:**
1. `createField` via API → gets `fieldId`
2. `createFieldOption` for each pending option (parallel)
3. Updates local `fields` state — no page reload needed

---

### `apps/web/src/pages/DynamicFieldPage.tsx`

Main page component at route `/test`. Orchestrates everything.

**State:**
- `databases`, `selectedDb`, `fields`, `records` — core data
- `showNewDb`, `newDbName` — sidebar DB creation
- `showAddField` — drawer visibility
- `renamingFieldId`, `renameValue` — inline rename in column header
- `deletingFieldId` — confirm dialog target
- `iconPickerFieldId` — icon picker dialog target

**Column header — right-click `ContextMenu`:**
| Action | Implementation |
|---|---|
| Rename | Sets `renamingFieldId` → header renders `<Input>` inline; blur/Enter calls `api.fields.update` |
| Change icon | Opens icon picker `Dialog`; saves `customIcon` to `field.config` via PATCH |
| Move left / right | Calls `api.fields.move`, then re-fetches field list |
| Duplicate | Calls `api.fields.duplicate`, then re-fetches |
| Delete | Sets `deletingFieldId` → `AlertDialog` confirmation → `api.fields.delete` |

**Table layout:**
- `<colgroup>` with fixed widths: `48px` for `#`, `180px` per field column
- Sticky `<thead>` with `backdrop-blur`
- Each cell renders `<CellEditor field record onSave />`

---

## 3. Data Flow — Create a Record with Values

```
User clicks "+ Add record"
  → api.records.create(dbId)             POST /api/databases/:id/records
  → createDynRecord(databaseId)          auto-increments rowNumber
  → append to records state (empty fieldValues)

User clicks a cell
  → CellEditor renders editable input

User commits (blur / Enter)
  → onSave(payload)
  → api.values.set(recordId, fieldId, payload)   PUT /api/records/:id/values/:fieldId
  → setFieldValue(...)                            upsert in dyn_field_values
  → update record in local state (no re-fetch)
```

---

## 4. Data Flow — Create a Select Field

```
User clicks "+ Add field"
  → AddFieldDrawer opens

User selects type = "select", adds options, clicks "Add field"
  → api.fields.create(dbId, name, 'select', config)   POST /api/databases/:id/fields
  → createField(...)                                    position = max + 1
  → for each pending option:
       api.options.create(fieldId, label, color)        POST /api/fields/:id/options
  → setFields(prev => [...prev, newField + options])

Table re-renders with new column.
SelectCell shows option dropdown on click.
```

---

## 5. Computed Fields

Types `id`, `created_time`, `updated_time`, `created_by`, `updated_by` are **never written** to `dyn_field_values`. They are derived at render time:

| Field type | Source |
|---|---|
| `id` | `record.rowNumber` |
| `created_time` | `record.createdAt` |
| `updated_time` | `record.updatedAt` |
| `created_by` | `"System"` (no auth in this demo) |
| `updated_by` | `"System"` |

`ComputedCell` renders them as read-only `<span>` elements.

---

## 6. Known Limitations / Next Steps

- **No auth** — `created_by` / `updated_by` always show "System". Wire to Better Auth session when ready.
- **Select options post-creation** — options can only be added during field creation. Add an "Edit options" panel in the context menu to support adding/removing options on existing fields.
- **No column resizing** — widths are fixed at 180px via `<colgroup>`.
- **No pagination** — all records loaded at once. Add cursor-based pagination for large datasets.
- **Filter / Sort / Group** — PRD sections 4.2–4.3 are not yet implemented.
