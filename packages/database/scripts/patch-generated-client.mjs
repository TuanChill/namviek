/**
 * Patches the Prisma-generated client to be compatible with Cloudflare Workers.
 *
 * Prisma generates `globalThis['__dirname'] = path.dirname(fileURLToPath(import.meta.url))`
 * at module load time. In Workers, import.meta.url is undefined which causes a crash.
 * With Prisma Accelerate all queries go via HTTP, so __dirname is never used.
 *
 * Run automatically via `pnpm db:generate` after `prisma generate`.
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const clientPath = resolve(__dirname, '../generated/client/client.ts')

const MARKER = `// CF_WORKERS_PATCH:`
const original = `globalThis['__dirname'] = path.dirname(fileURLToPath(import.meta.url))`
const patched = `// CF_WORKERS_PATCH: import.meta.url is undefined in Workers; Prisma Accelerate doesn't need __dirname.\ntry { globalThis['__dirname'] = path.dirname(fileURLToPath(import.meta.url)) } catch { globalThis['__dirname'] = '/' }`

let src = readFileSync(clientPath, 'utf8')

if (src.includes(MARKER)) {
  console.log('ℹ️  Patch already applied.')
} else if (src.includes(original)) {
  src = src.replace(original, patched)
  writeFileSync(clientPath, src, 'utf8')
  console.log('✅ Patched generated/client/client.ts for Cloudflare Workers compatibility.')
} else {
  console.warn('⚠️  Could not find the target line to patch. Manual check required.')
}
