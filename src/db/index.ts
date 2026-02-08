import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import env from "../../env.ts";
import * as schema from "./schema.ts";

// Create PostgreSQL connection pool
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

// Prevent idle client errors from crashing the process
pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err);
});

// Create Drizzle instance
export const db = drizzle(pool, { schema });
