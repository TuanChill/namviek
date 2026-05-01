---
name: nv:record-create-with-data
description: Create one or more Namviek records with initial field values in the same MCP call. Use when the user wants to import or insert rows without separate create_record and set_field_value calls.
---

# nv:record-create-with-data

Use this skill to call `create_records_with_data` manually.

## Inputs

- Required `databaseId`
- Required `records[]`

## Workflow

1. Resolve `databaseId`, field ids, option ids, and user ids before the call.
2. Build each `records[]` entry with a `values[]` array of field-value objects.
3. Call `create_records_with_data`.
4. Return created record ids and counts of values set.

## Example

"Call create_records_with_data with databaseId='<DATABASE_ID>' and records=[{ values:[{ fieldId:'<FIELD_ID>', textValue:'Hello' }] }]."