// Server-only queries for quick ads (instant TV overlays)
import { createServerFn } from "@tanstack/react-start";
import { desc, eq, or, sql } from "drizzle-orm";
import * as fs from "fs/promises";
import * as path from "path";
import { z } from "zod";
import { db, pool } from "~/db";
import { priceHistory, products, quickAds, videoCampaigns } from "~/db/schema";

// Save image from base64 data URI, returns public URL path
async function saveAdImage(adId: string, base64Data: string): Promise<string> {
  const adsDir = path.join(process.cwd(), "public", "ads");
  await fs.mkdir(adsDir, { recursive: true });

  // Extract extension from data URI (data:image/png;base64,... → png)
  const mimeMatch = base64Data.match(/^data:image\/(\w+);base64,/);
  const ext = mimeMatch?.[1] === "jpeg" ? "jpg" : mimeMatch?.[1] || "png";
  const raw = base64Data.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(raw, "base64");
  const filename = `${adId}.${ext}`;

  await fs.writeFile(path.join(adsDir, filename), buffer);
  return `/ads/${filename}`;
}

async function deleteAdImage(imageUrl: string) {
  try {
    const filePath = path.join(process.cwd(), "public", imageUrl);
    await fs.unlink(filePath);
  } catch {
    // File already gone, ignore
  }
}

// Get all quick ads with product info
export const getQuickAds = createServerFn({ method: "GET" }).handler(
  async () => {
    const results = await db
      .select({
        id: quickAds.id,
        name: quickAds.name,
        productId: quickAds.productId,
        promotionalPrice: quickAds.promotionalPrice,
        updatePrice: quickAds.updatePrice,
        displayText: quickAds.displayText,
        displayPrice: quickAds.displayPrice,
        imageUrl: quickAds.imageUrl,
        imageMode: quickAds.imageMode,
        durationSeconds: quickAds.durationSeconds,
        lastPlayedAt: quickAds.lastPlayedAt,
        createdAt: quickAds.createdAt,
        // Product info (null for free-text ads)
        productName: products.name,
        currentPrice: products.currentPrice,
        minPrice: products.minPrice,
        maxPrice: products.maxPrice,
      })
      .from(quickAds)
      .leftJoin(products, eq(quickAds.productId, products.id))
      .orderBy(desc(quickAds.updatedAt));

    return results;
  },
);

// Create a new quick ad
const createQuickAdSchema = z
  .object({
    name: z.string().min(1),
    productId: z.string().uuid().optional(),
    promotionalPrice: z.number().positive().optional(),
    updatePrice: z.boolean().optional(),
    displayText: z.string().optional(),
    displayPrice: z.string().optional(),
    imageBase64: z.string().optional(),
    imageMode: z.enum(["fullscreen", "background"]).optional(),
    durationSeconds: z.number().min(3).max(30),
    createdBy: z.string().min(1),
  })
  .refine(
    (data) => data.productId || data.displayText || data.imageBase64,
    "Izaberite proizvod, unesite tekst, ili dodajte sliku",
  )
  .refine(
    (data) => !data.productId || data.promotionalPrice,
    "Unesite cenu za izabrani proizvod",
  );

export const createQuickAd = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createQuickAdSchema.parse(data))
  .handler(async ({ data }) => {
    // Save image file first so we can include the URL in the DB insert
    let imageUrl: string | null = null;
    const hasImage = !!data.imageBase64;

    if (hasImage) {
      // Use a temp UUID for filename; will be the ad ID after insert
      const tempId = crypto.randomUUID();
      imageUrl = await saveAdImage(tempId, data.imageBase64!);
    }

    const [ad] = await db
      .insert(quickAds)
      .values({
        name: data.name,
        productId: data.productId,
        promotionalPrice: data.promotionalPrice?.toString(),
        updatePrice: data.updatePrice ?? false,
        displayText: data.displayText,
        displayPrice: data.displayPrice,
        imageUrl,
        imageMode: hasImage ? data.imageMode || "background" : null,
        durationSeconds: data.durationSeconds,
        createdBy: data.createdBy,
      })
      .returning();

    console.log(`✅ Quick ad created: ${ad.id}`);
    return ad;
  });

// Update an existing quick ad
const updateQuickAdSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1),
    productId: z.string().uuid().nullable(),
    promotionalPrice: z.number().positive().optional(),
    updatePrice: z.boolean().optional(),
    displayText: z.string().nullable(),
    displayPrice: z.string().nullable(),
    imageBase64: z.string().nullable().optional(),
    imageMode: z.enum(["fullscreen", "background"]).nullable().optional(),
    removeImage: z.boolean().optional(),
    durationSeconds: z.number().min(3).max(30),
  })
  .refine(
    (data) =>
      data.productId || data.displayText || data.imageBase64 || data.imageMode,
    "Izaberite proizvod, unesite tekst, ili dodajte sliku",
  );

export const updateQuickAd = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => updateQuickAdSchema.parse(data))
  .handler(async ({ data }) => {
    // Handle image removal
    if (data.removeImage) {
      const [existing] = await db
        .select({ imageUrl: quickAds.imageUrl })
        .from(quickAds)
        .where(eq(quickAds.id, data.id));
      if (existing?.imageUrl) {
        await deleteAdImage(existing.imageUrl);
      }
    }

    // Save new image if provided
    let imageUrl: string | null | undefined;
    if (data.removeImage) {
      imageUrl = null;
    } else if (data.imageBase64) {
      imageUrl = await saveAdImage(data.id, data.imageBase64);
    }

    const [updated] = await db
      .update(quickAds)
      .set({
        name: data.name,
        productId: data.productId,
        promotionalPrice: data.promotionalPrice?.toString() ?? null,
        updatePrice: data.updatePrice ?? false,
        displayText: data.displayText,
        displayPrice: data.displayPrice,
        ...(imageUrl !== undefined && { imageUrl }),
        ...(data.imageMode !== undefined && { imageMode: data.imageMode }),
        durationSeconds: data.durationSeconds,
        updatedAt: new Date(),
      })
      .where(eq(quickAds.id, data.id))
      .returning();

    if (!updated) throw new Error("Quick ad not found");
    return updated;
  });

// Delete a quick ad
export const deleteQuickAd = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    // Clean up image file if exists
    const [existing] = await db
      .select({ imageUrl: quickAds.imageUrl })
      .from(quickAds)
      .where(eq(quickAds.id, data.id));
    if (existing?.imageUrl) {
      await deleteAdImage(existing.imageUrl);
    }
    await db.delete(quickAds).where(eq(quickAds.id, data.id));
    console.log(`🗑️ Quick ad deleted: ${data.id}`);
  });

// Play a quick ad on TV
export const playQuickAd = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    // Check no active campaign running
    const [activeCampaign] = await db
      .select({ id: videoCampaigns.id })
      .from(videoCampaigns)
      .where(
        or(
          eq(videoCampaigns.status, "countdown"),
          eq(videoCampaigns.status, "playing"),
        ),
      )
      .limit(1);

    if (activeCampaign) {
      throw new Error("Kampanja je trenutno aktivna. Sačekajte da se završi.");
    }

    // Fetch the quick ad with product data
    const [ad] = await db
      .select({
        id: quickAds.id,
        name: quickAds.name,
        productId: quickAds.productId,
        promotionalPrice: quickAds.promotionalPrice,
        updatePrice: quickAds.updatePrice,
        displayText: quickAds.displayText,
        displayPrice: quickAds.displayPrice,
        imageUrl: quickAds.imageUrl,
        imageMode: quickAds.imageMode,
        durationSeconds: quickAds.durationSeconds,
        productName: products.name,
        currentPrice: products.currentPrice,
        minPrice: products.minPrice,
        maxPrice: products.maxPrice,
      })
      .from(quickAds)
      .leftJoin(products, eq(quickAds.productId, products.id))
      .where(eq(quickAds.id, data.id));

    if (!ad) throw new Error("Quick ad not found");

    const now = new Date();
    let displayText: string;
    let price: string | null = null;
    let oldPrice: string | null = null;

    if (ad.productId && ad.productName && ad.promotionalPrice) {
      // Product-based ad
      displayText = ad.productName;
      const currentPrice = ad.currentPrice!;

      // Clamp promotional price to min/max
      let clampedPrice = parseFloat(ad.promotionalPrice);
      if (ad.minPrice) {
        clampedPrice = Math.max(clampedPrice, parseFloat(ad.minPrice));
      }
      if (ad.maxPrice) {
        clampedPrice = Math.min(clampedPrice, parseFloat(ad.maxPrice));
      }
      const newPrice = clampedPrice.toFixed(2);
      price = newPrice;
      oldPrice = currentPrice;

      // Update product price if enabled
      if (ad.updatePrice) {
        const newPriceNum = clampedPrice;
        const oldPriceNum = parseFloat(currentPrice);

        await db
          .update(products)
          .set({
            previousPrice: currentPrice,
            currentPrice: newPrice,
            trend: newPriceNum > oldPriceNum ? "up" : "down",
            lastPriceUpdate: now,
            updatedAt: now,
          })
          .where(eq(products.id, ad.productId));

        // Record in price history
        await db.insert(priceHistory).values({
          productId: ad.productId,
          price: newPrice,
          timestamp: now,
        });

        console.log(
          `📺 Quick ad updated product ${ad.productName} price: ${currentPrice} → ${newPrice}`,
        );

        // Send price_update NOTIFY
        try {
          const client = await pool.connect();
          try {
            const pricePayload = JSON.stringify({
              count: 1,
              timestamp: now.toISOString(),
            });
            const escapedPricePayload = pricePayload.replace(/'/g, "''");
            await client.query(`NOTIFY price_update, '${escapedPricePayload}'`);
          } finally {
            client.release();
          }
        } catch (error) {
          console.error("❌ Failed to send price_update notification", error);
        }
      }
    } else {
      // Free-text ad
      displayText = ad.displayText || ad.name;
      price = ad.displayPrice;
    }

    // Send campaign_update NOTIFY with QUICK_AD_PLAY type
    const payload = JSON.stringify({
      type: "QUICK_AD_PLAY",
      quickAd: {
        id: ad.id,
        displayText,
        price,
        oldPrice,
        imageUrl: ad.imageUrl,
        imageMode: ad.imageMode,
        durationSeconds: ad.durationSeconds,
      },
      timestamp: now.toISOString(),
    });
    const escapedPayload = payload.replace(/'/g, "''");

    try {
      const client = await pool.connect();
      try {
        await client.query(`NOTIFY campaign_update, '${escapedPayload}'`);
        console.log(`📺 Quick ad played: ${ad.name}`);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("❌ Failed to send quick ad notification", error);
      throw new Error("Greška pri slanju reklame na TV");
    }

    // Update lastPlayedAt
    await db
      .update(quickAds)
      .set({ lastPlayedAt: now, updatedAt: now })
      .where(eq(quickAds.id, data.id));

    return { success: true };
  });
