import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { apiGet } from '../client.js'

export function registerUserTools(server: McpServer) {
  server.registerTool(
    'list_users',
    {
      description: 'List all available users.',
      inputSchema: {},
    },
    async () => {
      const users = await apiGet('/api/users')
      return {
        content: [{ type: 'text', text: JSON.stringify(users, null, 2) }],
      }
    }
  )

  server.registerTool(
    'search_users',
    {
      description: 'Search users by name or email.',
      inputSchema: {
        query: z.string().min(1).describe('Search text'),
      },
    },
    async ({ query }) => {
      const users = await apiGet(`/api/users?q=${encodeURIComponent(query)}`)
      return {
        content: [{ type: 'text', text: JSON.stringify(users, null, 2) }],
      }
    }
  )
}
