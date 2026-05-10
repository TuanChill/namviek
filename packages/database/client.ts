import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { PrismaClient } from "./generated/client/client.js";
import { withAccelerate } from "@prisma/extension-accelerate";

// Load .env from the database package directory (Node.js only).
// In Cloudflare Workers, import.meta.url is undefined so we skip this.
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  dotenv.config({ path: resolve(__dirname, ".env") });
} catch {
  // Workers environment — env vars are provided by Worker bindings, not .env files
}

// Use globalThis for broader environment compatibility
const globalForPrisma = globalThis as typeof globalThis & {
    prisma?: ReturnType<typeof createPrismaClient>;
};

// Create Prisma client with Accelerate extension
function createPrismaClient() {
    return new PrismaClient({
        accelerateUrl: process.env.DATABASE_URL!,
    }).$extends(withAccelerate());
}

// Named export with global memoization
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}