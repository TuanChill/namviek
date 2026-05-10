import 'dotenv/config'
import { serve } from '@hono/node-server'
import app from './index.js'

const devMode = process.env.DEV_MODE !== 'false'

if (!devMode) {
  throw new Error(
    'DEV_MODE=false is not supported by the local Node server. Set DEV_MODE=true to run the API backend locally.'
  )
}

const port = Number(process.env.PORT) || 4001

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`)
  }
)