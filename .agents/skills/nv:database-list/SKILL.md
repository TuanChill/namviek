---
name: nv:database-list
description: List Namviek databases through MCP. Use when the user wants to see available databases, resolve a databaseId, or inspect record and field counts.
---

# nv:database-list

Use this skill to call `list_databases` manually.

## Inputs

None.

## Workflow

1. Call `list_databases`.
2. Return each database with `id`, `name`, `fieldCount`, and `recordCount`.
3. Preserve exact database IDs for follow-up tools.

## Example

"Call list_databases and show ids, names, fieldCount, and recordCount."