import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

type ToolDoc = {
  name: string
  category: 'database' | 'field' | 'record' | 'query' | 'stats' | 'user' | 'meta'
  summary: string
}

const TOOL_DOCS: ToolDoc[] = [
  { name: 'mcp_help', category: 'meta', summary: 'Show available MCP tools and how to use them.' },

  { name: 'list_databases', category: 'database', summary: 'List all databases.' },
  { name: 'list_templates', category: 'database', summary: 'List available database templates.' },
  { name: 'get_database', category: 'database', summary: 'Get one database by ID.' },
  { name: 'create_database', category: 'database', summary: 'Create a database.' },
  { name: 'delete_database', category: 'database', summary: 'Delete a database.' },
  { name: 'create_database_from_template', category: 'database', summary: 'Create a database from template.' },
  { name: 'create_database_from_template_by_id', category: 'database', summary: 'Create a database from template by templateId.' },

  { name: 'list_fields', category: 'field', summary: 'List fields in a database.' },
  { name: 'list_field_options', category: 'field', summary: 'List live options for a select or multi-select field.' },
  { name: 'create_field_option', category: 'field', summary: 'Create one live option for a select or multi-select field.' },
  { name: 'delete_field_option', category: 'field', summary: 'Delete one live option from a select or multi-select field.' },
  { name: 'get_field_config_contract', category: 'field', summary: 'Show allowed config keys and option tools by field type.' },
  { name: 'create_field', category: 'field', summary: 'Create a field.' },
  { name: 'update_field', category: 'field', summary: 'Update field name/config.' },
  { name: 'delete_field', category: 'field', summary: 'Delete a field.' },
  { name: 'reorder_field', category: 'field', summary: 'Move field left/right.' },
  { name: 'duplicate_field', category: 'field', summary: 'Duplicate a field.' },

  { name: 'list_records', category: 'record', summary: 'List records.' },
  { name: 'create_record', category: 'record', summary: 'Create a record.' },
  { name: 'delete_records', category: 'record', summary: 'Delete records by IDs.' },
  { name: 'set_field_value', category: 'record', summary: 'Set one cell value.' },
  { name: 'bulk_set_values', category: 'record', summary: 'Set many cell values.' },
  { name: 'preview_table', category: 'record', summary: 'Preview records as a markdown table.' },

  { name: 'query_records', category: 'query', summary: 'Filter/sort/search records with structured criteria.' },
  { name: 'search_records', category: 'query', summary: 'Full-text style search across records.' },

  { name: 'get_database_stats', category: 'stats', summary: 'Summary stats for a database.' },
  { name: 'get_stats', category: 'stats', summary: 'Numeric stats for a number field.' },
  { name: 'get_distribution', category: 'stats', summary: 'Distribution for select/multi-select.' },
  { name: 'get_timeline', category: 'stats', summary: 'Timeline buckets by created/updated date.' },
  { name: 'get_person_activity', category: 'stats', summary: 'Activity counts for person fields.' },

  { name: 'list_users', category: 'user', summary: 'List users.' },
  { name: 'search_users', category: 'user', summary: 'Search users by name/email.' },
]

const CATEGORIES = ['database', 'field', 'record', 'query', 'stats', 'user', 'meta'] as const

export function registerMetaTools(server: McpServer) {
  server.registerTool(
    'mcp_help',
    {
      description:
        'Discover available MCP tools. Optionally filter by category or tool name. ' +
        'Use this like a --help command.',
      inputSchema: {
        category: z.enum(CATEGORIES).optional().describe('Optional category filter'),
        toolName: z.string().optional().describe('Optional exact tool name filter'),
      },
    },
    async ({ category, toolName }) => {
      let docs = TOOL_DOCS
      if (category) {
        docs = docs.filter((d) => d.category === category)
      }
      if (toolName) {
        docs = docs.filter((d) => d.name === toolName)
      }

      const grouped = CATEGORIES.reduce<Record<string, ToolDoc[]>>((acc, cat) => {
        acc[cat] = docs.filter((d) => d.category === cat)
        return acc
      }, {})

      const promptTips = [
        'For human-readable table data, ask to use query_records and read humanReadableRecords.',
        'For quick overview, use list_* tools.',
        'For analytics, use get_stats/get_distribution/get_timeline tools.',
      ]

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                totalTools: docs.length,
                filters: { category: category ?? null, toolName: toolName ?? null },
                grouped,
                promptTips,
              },
              null,
              2
            ),
          },
        ],
      }
    }
  )
}
