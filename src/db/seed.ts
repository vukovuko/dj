import { auth } from "../lib/auth.ts"
import { db } from "./index.ts"
import { user } from "./schema.ts"
import { eq } from "drizzle-orm"
import env from "../../env.ts"

async function seed() {
  console.log("🌱 Seeding database...")

  // Validate seed passwords are provided
  if (!env.SEED_ADMIN_PASSWORD || !env.SEED_STAFF_PASSWORD) {
    console.error("❌ Missing seed passwords in environment variables")
    console.error("Please set SEED_ADMIN_PASSWORD and SEED_STAFF_PASSWORD in .env")
    process.exit(1)
  }

  try {
    // Create superadmin user using Better Auth API
    console.log("Creating superadmin user...")
    await auth.api.signUpEmail({
      body: {
        email: "admin@djcafe.local",
        name: "admin",
        password: env.SEED_ADMIN_PASSWORD,
        username: "admin",
      },
    })

    // Update user to set role to superadmin
    await db
      .update(user)
      .set({ role: "superadmin" })
      .where(eq(user.name, "admin"))

    console.log("✓ Created superadmin user: admin")

    // Create staff user using Better Auth API
    console.log("Creating staff user...")
    await auth.api.signUpEmail({
      body: {
        email: "staff@djcafe.local",
        name: "staff",
        password: env.SEED_STAFF_PASSWORD,
        username: "staff",
      },
    })

    // Role defaults to "staff" so no need to update
    console.log("✓ Created staff user: staff")

    console.log("\n🎉 Seeding completed successfully!")
    console.log("\nInitial users:")
    console.log("  Username: admin | Role: superadmin")
    console.log("  Username: staff | Role: staff")
  } catch (error) {
    console.error("❌ Seeding failed:", error)
    process.exit(1)
  }

  process.exit(0)
}

seed()
