import 'dotenv/config'
import { z } from "zod"

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  PORT: z.coerce.number().positive(),
  DATABASE_URL: z.string().startsWith("postgresql://"),
  ALLOWED_ORIGINS: z.string().transform((val) => val.split(",").map((origin: string) => origin.trim())),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  // Seed credentials (optional, only needed for database seeding)
  SEED_ADMIN_PASSWORD: z.string().min(6).optional(),
  SEED_STAFF_PASSWORD: z.string().min(6).optional(),
  // Luma AI (optional, only needed for real video generation)
  LUMA_API_KEY: z.string().optional(),
});

// Parse and validate environment variables
const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error("❌ Invalid environment variables:")
  const flattened = z.flattenError(parsed.error)
  console.error("Form errors:", flattened.formErrors)
  console.error("Field errors:", flattened.fieldErrors)
  process.exit(1)
}

const env = parsed.data

// Type for the validated environment
export type Env = z.infer<typeof envSchema>

// Helper functions for environment checks
export const isProd = () => env.NODE_ENV === "production"
export const isDev = () => env.NODE_ENV === "development"
export const isTestEnv = () => env.NODE_ENV === "test"

// Export the validated environment object
export { env }

// Default export for convenience
export default env
