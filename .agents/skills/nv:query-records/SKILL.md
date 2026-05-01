---
name: nv:query-records
description: Query Namviek records with filters, sorting, and text search. Use when the user wants structured record filtering rather than a full list.
---

# nv:query-records

Use this skill to call `query_records` manually.

## Inputs

- Required `databaseId`
- Optional `filters[]`
- Optional `textSearch`
- Optional `dateRange`
- Optional `sort`
- Optional `limit`

## Workflow

1. Resolve field ids or names with `list_fields`.
2. Call `query_records` with the requested filters.
3. Prefer `humanReadableRecords` when explaining results to the user.

## Example

"Call query_records with databaseId='<DATABASE_ID>', filters=[{ field:'Status', operator:'eq', value:'Active' }], limit=20."