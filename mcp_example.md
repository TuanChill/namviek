# MCP Prompt Examples

This document contains copy-paste prompts for testing all MCP tools exposed by the Namviek MCP server.

## Prerequisites

- Start API server: `pnpm --filter api dev`
- Start MCP server: `pnpm --filter mcp dev`
- Ensure `API_URL` and `API_KEY` are configured for MCP.

## Suggested Test Flow

Run these first to collect IDs you will need in later prompts:

1. list_templates
2. create_database_from_template_by_id
3. list_fields
4. create_record
5. list_users

Use values from responses to replace placeholders:

- `<DATABASE_ID>`
- `<TEMPLATE_ID>`
- `<FIELD_ID>`
- `<RECORD_ID>`
- `<USER_ID>`

## Meta Tools

### mcp_help

Prompt:
"Call mcp_help and show all tools grouped by category."

Prompt:
"Call mcp_help with category='database'."

## Database Tools

### list_templates

Prompt:
"Call list_templates and return the template ids and names in a short table."

### create_database_from_template

Prompt:
"Call create_database_from_template with templateId='<TEMPLATE_ID>' and name='MCP Demo DB'."

### create_database_from_template_by_id

Prompt:
"Call create_database_from_template_by_id with templateId='<TEMPLATE_ID>' and name='MCP Demo DB Alias'."

### list_databases

Prompt:
"Call list_databases and summarize total databases, fieldCount, and recordCount."

### get_database

Prompt:
"Call get_database with id='<DATABASE_ID>'."

### create_database

Prompt:
"Call create_database with name='Manual MCP Database' and description='Created from MCP test prompts'."

### delete_database

Prompt:
"Call delete_database with id='<DATABASE_ID>'."

## Field Tools

### list_fields

Prompt:
"Call list_fields with databaseId='<DATABASE_ID>'."

### create_field

Prompt:
"Call create_field with databaseId='<DATABASE_ID>', name='Priority', type='select', required=false."

### update_field

Prompt:
"Call update_field with fieldId='<FIELD_ID>', name='Priority Level'."

### reorder_field

Prompt:
"Call reorder_field with fieldId='<FIELD_ID>', direction='right', databaseId='<DATABASE_ID>'."

### duplicate_field

Prompt:
"Call duplicate_field with fieldId='<FIELD_ID>'."

### delete_field

Prompt:
"Call delete_field with fieldId='<FIELD_ID>' and databaseId='<DATABASE_ID>'."

## Record Tools

### list_records

Prompt:
"Call list_records with databaseId='<DATABASE_ID>'."

### create_record

Prompt:
"Call create_record with databaseId='<DATABASE_ID>'."

### set_field_value

Prompt:
"Call set_field_value with recordId='<RECORD_ID>', fieldId='<FIELD_ID>', databaseId='<DATABASE_ID>', textValue='Hello MCP'."

### bulk_set_values

Prompt:
"Call bulk_set_values with updates=[{ recordId:'<RECORD_ID>', fieldId:'<FIELD_ID>', databaseId:'<DATABASE_ID>', textValue:'Bulk update value' }]."

### preview_table

Prompt:
"Call preview_table with databaseId='<DATABASE_ID>' and limit=10."

### delete_records

Prompt:
"Call delete_records with ids=['<RECORD_ID>'] and databaseId='<DATABASE_ID>'."

## Query Tools

### query_records

Prompt:
"Call query_records with databaseId='<DATABASE_ID>', filters=[{ field:'<FIELD_ID>', operator:'contains', value:'MCP' }], sort={ field:'<FIELD_ID>', direction:'asc' }, limit=20."

### search_records

Prompt:
"Call search_records with databaseId='<DATABASE_ID>', query='MCP', limit=20."

## Stats Tools

### get_database_stats

Prompt:
"Call get_database_stats with databaseId='<DATABASE_ID>'."

### get_stats

Prompt:
"Call get_stats with databaseId='<DATABASE_ID>' and field='<FIELD_ID>'."

### get_distribution

Prompt:
"Call get_distribution with databaseId='<DATABASE_ID>' and field='<FIELD_ID>'."

### get_timeline

Prompt:
"Call get_timeline with databaseId='<DATABASE_ID>', dateSource='createdAt', bucket='day'."

### get_person_activity

Prompt:
"Call get_person_activity with databaseId='<DATABASE_ID>' and field='<FIELD_ID>'."

## User Tools

### list_users

Prompt:
"Call list_users and show ids, names, emails."

### search_users

Prompt:
"Call search_users with query='john'."

## End-to-End Smoke Prompt

"Run this sequence:
1) list_templates,
2) create_database_from_template_by_id using one template,
3) list_fields,
4) create_record,
5) set_field_value on one field,
6) preview_table,
7) get_database_stats.
Return created IDs and a short summary."
