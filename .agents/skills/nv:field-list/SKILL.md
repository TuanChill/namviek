---
name: nv:field-list
description: List fields in a Namviek database. Use when the user wants schema details, needs field ids, or must inspect column order before other field or record commands.
---

# nv:field-list

Use this skill to call `list_fields` manually.

## Inputs

- Required `databaseId`

## Workflow

1. Resolve `databaseId` with `list_databases` if needed.
2. Call `list_fields`.
3. Return ordered fields with `id`, `name`, `type`, and position data.

## Example

"Call list_fields with databaseId='<DATABASE_ID>'."