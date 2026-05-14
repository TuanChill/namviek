import { PrismaClient } from "../generated/client/client.js"
import { withAccelerate } from "@prisma/extension-accelerate"

/**
 * Creates a Prisma client with Accelerate extension.
 * Following the Hono + Prisma on Cloudflare Workers pattern:
 * https://hono.dev/examples/prisma
 *
 * Call this per-request with c.env.DATABASE_URL (Workers bindings)
 * or process.env.DATABASE_URL (local Node.js dev).
 */
export const getPrisma = (datasourceUrl: string) => {
  return new PrismaClient({ accelerateUrl: datasourceUrl }).$extends(withAccelerate())
}

export type PrismaInstance = ReturnType<typeof getPrisma>
