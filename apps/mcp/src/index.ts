import 'dotenv/config'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createServer } from 'node:http'

import { registerDatabaseTools } from './tools/database.tools.js'
import { registerFieldTools } from './tools/field.tools.js'
import { registerQueryTools } from './tools/query.tools.js'
import { registerRecordTools } from './tools/record.tools.js'
import { registerStatsTools } from './tools/stats.tools.js'
import { registerUserTools } from './tools/user.tools.js'

const PORT = Number(process.env.PORT) || 4002
const TRANSPORT = process.env.MCP_TRANSPORT || 'stdio'

function log(message: string) {
  process.stderr.write(`${message}\n`)
}

// ─── Create MCP server ────────────────────────────────────────────────────────
const server = new McpServer({
  name: 'namviek-dynamic-field',
  version: '1.0.0',
})

// ─── Register all tools ───────────────────────────────────────────────────────
registerDatabaseTools(server)
registerFieldTools(server)
registerQueryTools(server)
registerRecordTools(server)
registerStatsTools(server)
registerUserTools(server)

async function start() {
  if (TRANSPORT === 'http') {
    const httpServer = createServer(async (req, res) => {
      if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          name: 'namviek-dynamic-field MCP server',
          version: '1.0.0',
          endpoint: '/mcp',
          tools: [
            'list_databases', 'get_database', 'create_database', 'delete_database', 'create_database_from_template',
            'list_fields', 'create_field', 'update_field', 'delete_field', 'reorder_field', 'duplicate_field',
            'list_records', 'create_record', 'delete_records', 'set_field_value', 'bulk_set_values', 'preview_table',
            'query_records', 'search_records',
            'get_database_stats', 'get_stats', 'get_distribution', 'get_timeline', 'get_person_activity',
            'list_users', 'search_users',
          ],
        }))
        return
      }

      if (req.url !== '/mcp') {
        res.writeHead(404)
        res.end('Not found')
        return
      }

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      })

      res.on('close', () => {
        transport.close()
      })

      await server.connect(transport)
      await transport.handleRequest(req, res)
    })

    httpServer.listen(PORT, () => {
      log(`Namviek MCP server running on http://localhost:${PORT}/mcp`)
      log(`Health check: http://localhost:${PORT}/`)
      log(`API proxy target: ${process.env.API_URL || 'http://localhost:4001'}`)
    })
    return
  }

  const transport = new StdioServerTransport()
  await server.connect(transport)
  log(`Namviek MCP server connected via stdio`)
}

start().catch((error) => {
  log(error instanceof Error ? error.stack || error.message : String(error))
  process.exit(1)
})
