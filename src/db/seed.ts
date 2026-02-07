import { eq } from "drizzle-orm";
import env from "../../env.ts";
import { auth } from "../lib/auth.ts";
import { db } from "./index.ts";
import { categories, products, settings, user } from "./schema.ts";

async function seed() {
  console.log("🌱 Seeding database...");

  // Validate seed passwords are provided
  if (!env.SEED_ADMIN_PASSWORD || !env.SEED_STAFF_PASSWORD) {
    console.error("❌ Missing seed passwords in environment variables");
    console.error(
      "Please set SEED_ADMIN_PASSWORD and SEED_STAFF_PASSWORD in .env",
    );
    process.exit(1);
  }

  try {
    // ========== SEED USERS ==========
    const existingUsers = await db.select().from(user);

    if (existingUsers.length === 0) {
      console.log("Creating superadmin user...");
      await auth.api.signUpEmail({
        body: {
          email: "admin@djcafe.local",
          name: "admin",
          password: env.SEED_ADMIN_PASSWORD,
          username: "admin",
        },
      });

      await db
        .update(user)
        .set({ role: "superadmin" })
        .where(eq(user.name, "admin"));

      console.log("✓ Created superadmin user: admin");

      console.log("Creating staff user...");
      await auth.api.signUpEmail({
        body: {
          email: "staff@djcafe.local",
          name: "staff",
          password: env.SEED_STAFF_PASSWORD,
          username: "staff",
        },
      });

      console.log("✓ Created staff user: staff");
    } else {
      console.log("✓ Users already seeded, skipping...");
    }

    // ========== SEED CATEGORIES ==========
    const existingCategories = await db.select().from(categories);

    let cocktailsCategoryId: string;
    let shotsCategoryId: string;

    if (existingCategories.length === 0) {
      console.log("Creating categories...");

      const [cocktailsCategory] = await db
        .insert(categories)
        .values({
          name: "Cocktails",
          slug: "cocktails",
        })
        .returning();

      const [shotsCategory] = await db
        .insert(categories)
        .values({
          name: "Shots",
          slug: "shots",
        })
        .returning();

      cocktailsCategoryId = cocktailsCategory.id;
      shotsCategoryId = shotsCategory.id;

      console.log("✓ Created categories: Cocktails, Shots");
    } else {
      console.log("✓ Categories already seeded, skipping...");
      const cocktailsCat = existingCategories.find(
        (c) => c.slug === "cocktails",
      );
      const shotsCat = existingCategories.find((c) => c.slug === "shots");
      cocktailsCategoryId = cocktailsCat!.id;
      shotsCategoryId = shotsCat!.id;
    }

    // ========== SEED PRODUCTS ==========
    const existingProducts = await db.select().from(products);

    if (existingProducts.length === 0) {
      console.log("Creating products...");

      // Cocktails
      const cocktailsData = [
        { name: "Mojito", price: "428", min: "320", max: "640" },
        { name: "Cuba Libre", price: "349", min: "260", max: "520" },
        { name: "Aperol Spritz", price: "420", min: "315", max: "630" },
        { name: "Pina Colada", price: "450", min: "340", max: "680" },
        { name: "Sex on the Beach", price: "400", min: "300", max: "600" },
        { name: "Tequila Sunrise", price: "400", min: "300", max: "600" },
      ];

      for (const cocktail of cocktailsData) {
        await db.insert(products).values({
          name: cocktail.name,
          categoryId: cocktailsCategoryId,
          basePrice: cocktail.price,
          minPrice: cocktail.min,
          maxPrice: cocktail.max,
          currentPrice: cocktail.price,
          previousPrice: cocktail.price,
          salesCount: 0,
          trend: "down",
          status: "active",
        });
      }

      // Shots
      const shotsData = [
        { name: "Jameson", price: "300", min: "220", max: "450" },
        { name: "Johnnie Walker", price: "300", min: "220", max: "450" },
        { name: "Jim Beam", price: "380", min: "285", max: "570" },
        { name: "Jack Daniel's", price: "380", min: "285", max: "570" },
        { name: "Absolut Vodka", price: "370", min: "280", max: "555" },
        { name: "Ballantine's", price: "400", min: "300", max: "600" },
        { name: "Jägermeister", price: "320", min: "240", max: "480" },
      ];

      for (const shot of shotsData) {
        await db.insert(products).values({
          name: shot.name,
          categoryId: shotsCategoryId,
          basePrice: shot.price,
          minPrice: shot.min,
          maxPrice: shot.max,
          currentPrice: shot.price,
          previousPrice: shot.price,
          salesCount: 0,
          trend: "down",
          status: "active",
        });
      }

      console.log("✓ Created 13 products (6 cocktails, 7 shots)");
    } else {
      console.log("✓ Products already seeded, skipping...");
    }

    // ========== SEED SETTINGS ==========
    const existingSettings = await db.select().from(settings);

    if (existingSettings.length === 0) {
      console.log("Creating settings...");

      await db.insert(settings).values([
        {
          key: "pricing_config",
          value: {
            mode: "manual",
            upPercentage: 5,
            downPercentage: 3,
            updateInterval: 300,
          },
        },
        {
          key: "priceUpdateIntervalMinutes",
          value: { minutes: 1 },
        },
      ]);

      console.log("✓ Created pricing config settings");
    } else {
      console.log("✓ Settings already seeded, skipping...");
    }

    console.log("\n🎉 Seeding completed successfully!");
    console.log("\nInitial data:");
    console.log("  Users: 2 (admin, staff)");
    console.log("  Categories: 2 (Cocktails, Shots)");
    console.log("  Products: 13 (6 cocktails, 7 shots)");
    console.log("  Settings: pricing_config");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

seed();
