/**
 * Custom build script for Cloudflare Workers deployment.
 *
 * Problem:
 *   Wrangler injects a CJS interop banner for @prisma/client/runtime/client.mjs
 *   because that file uses createRequire(import.meta.url). The banner code is:
 *
 *     var __filename = __banner_node_url.fileURLToPath(import.meta.url);
 *     globalThis["__dirname"] = __banner_node_path.dirname(__filename);
 *     var require2 = __banner_node_module.createRequire(import.meta.url);
 *
 *   In Cloudflare Workers, import.meta.url is undefined → crash at startup.
 *   With Prisma Accelerate, all DB queries go via HTTP so the engine runtime
 *   (client.mjs) is never actually invoked; __filename/__dirname don't matter.
 *
 * Solution:
 *   1. Build the bundle using Wrangler's dry-run (exact same options as real deploy)
 *   2. Patch the banner to wrap fileURLToPath in try/catch with a safe fallback
 *   3. CI deploys the patched bundle using `wrangler deploy --no-bundle`
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')

// ── Step 1: Build bundle ──────────────────────────────────────────────────────
console.log('🔨 Building Worker bundle (wrangler dry-run)...')
execSync('npx wrangler deploy --dry-run --outdir=dist-worker', {
  cwd: rootDir,
  stdio: 'inherit',
})

// ── Step 2: Patch the bundle ──────────────────────────────────────────────────
const bundlePath = resolve(rootDir, 'dist-worker/index.js')
let bundle = readFileSync(bundlePath, 'utf8')
let totalPatches = 0

// Patch 1: Wrangler CJS interop banner (injected for @prisma/client/runtime/client.mjs).
// The banner runs at module load time; in Workers import.meta.url is undefined → crash.
const BANNER_CRASH =
  'var __filename = __banner_node_url.fileURLToPath(import.meta.url);\n' +
  'globalThis["__dirname"] = __banner_node_path.dirname(__filename);\n' +
  'var require2 = __banner_node_module.createRequire(import.meta.url);'

const BANNER_SAFE =
  'var __filename = (() => { try { return __banner_node_url.fileURLToPath(import.meta.url); } catch { return "/worker.js"; } })();\n' +
  'globalThis["__dirname"] = __banner_node_path.dirname(__filename);\n' +
  'var require2 = __banner_node_module.createRequire(typeof import.meta.url !== "undefined" ? import.meta.url : "file:///worker.js");'

let count = 0
while (bundle.includes(BANNER_CRASH)) {
  bundle = bundle.replace(BANNER_CRASH, BANNER_SAFE)
  count++
}
if (count > 0) {
  console.log(`✅ Patched ${count} CJS banner(s)`)
  totalPatches += count
} else {
  console.log('ℹ️  No CJS banners found (format may have changed — verify bundle)')
}

// Patch 2: Prisma generated client sets globalThis.__dirname using fileURLToPath.
// This is not the banner — it's inside the generated code itself.
const DIRNAME_CRASH = 'globalThis["__dirname"] = path.dirname(fileURLToPath2(import.meta.url));'
const DIRNAME_SAFE  = '(() => { try { globalThis["__dirname"] = path.dirname(fileURLToPath2(import.meta.url)); } catch { globalThis["__dirname"] = "/"; } })()'

let count2 = 0
while (bundle.includes(DIRNAME_CRASH)) {
  bundle = bundle.replace(DIRNAME_CRASH, DIRNAME_SAFE)
  count2++
}
if (count2 > 0) {
  console.log(`✅ Patched ${count2} generated-client __dirname call(s)`)
  totalPatches += count2
} else {
  console.log('ℹ️  No generated-client __dirname call found (may already be patched or format changed)')
}

if (totalPatches > 0) {
  writeFileSync(bundlePath, bundle, 'utf8')
}

console.log('✅ Worker bundle ready at dist-worker/index.js')
