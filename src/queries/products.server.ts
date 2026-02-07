// Server-only queries for products
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, gte, ilike, inArray, sql } from "drizzle-orm";
import { db, pool } from "~/db";
import {
  categories,
  priceHistory,
  products,
  settings,
  tableOrders,
} from "~/db/schema";
import {
  addClient,
  initializePriceListener,
  removeClient,
} from "~/lib/price-notifications";
import { calculatePrice } from "~/lib/pricing";

export const getProductsWithPagination = createServerFn({ method: "GET" })
  .inputValidator((data: { search?: string; page: number }) => data)
  .handler(async ({ data }) => {
    const { search, page } = data;
    const limit = 25;
    const offset = (page - 1) * limit;

    // Build where condition with unaccent for smart search (ä → a, ö → o, etc.)
    const whereCondition = search
      ? sql`unaccent(${products.name}) ILIKE unaccent('%' || ${search} || '%')`
      : undefined;

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(whereCondition);

    const total = countResult?.count || 0;

    // Get paginated products with category names
    const results = await db
      .select({
        id: products.id,
        name: products.name,
        currentPrice: products.currentPrice,
        status: products.status,
        categoryName: categories.name,
        categoryId: products.categoryId,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(whereCondition)
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      products: results,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  });

export const getProductById = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, data.id))
      .limit(1);

    if (!product) {
      throw new Error("Product not found");
    }

    return product;
  });

export const updateProduct = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      name: string;
      categoryId: string;
      basePrice: number;
      minPrice: number;
      maxPrice: number;
      status: "active" | "draft";
    }) => data,
  )
  .handler(async ({ data }) => {
    const { id, ...updateData } = data;

    const [updated] = await db
      .update(products)
      .set({
        name: updateData.name,
        categoryId: updateData.categoryId,
        basePrice: Math.round(updateData.basePrice).toString(),
        minPrice: Math.round(updateData.minPrice).toString(),
        maxPrice: Math.round(updateData.maxPrice).toString(),
        status: updateData.status,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    if (!updated) {
      throw new Error("Failed to update product");
    }

    return updated;
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const [deleted] = await db
      .delete(products)
      .where(eq(products.id, data.id))
      .returning();

    if (!deleted) {
      throw new Error("Failed to delete product");
    }

    return deleted;
  });

export const createProduct = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      name: string;
      categoryId: string;
      basePrice: number;
      minPrice: number;
      maxPrice: number;
      status: "active" | "draft";
    }) => data,
  )
  .handler(async ({ data }) => {
    const [created] = await db
      .insert(products)
      .values({
        name: data.name,
        categoryId: data.categoryId,
        basePrice: Math.round(data.basePrice).toString(),
        minPrice: Math.round(data.minPrice).toString(),
        maxPrice: Math.round(data.maxPrice).toString(),
        currentPrice: Math.round(data.basePrice).toString(),
        previousPrice: Math.round(data.basePrice).toString(),
        salesCount: 0,
        trend: "down",
        status: data.status,
      })
      .returning();

    if (!created) {
      throw new Error("Failed to create product");
    }

    return created;
  });

export const getCategories = createServerFn({ method: "GET" }).handler(
  async () => {
    const result = await db.select().from(categories).orderBy(categories.name);

    return result;
  },
);

export const toggleProductStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    // Get current product
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, data.id))
      .limit(1);

    if (!product) {
      throw new Error("Product not found");
    }

    // Toggle status
    const newStatus = product.status === "active" ? "draft" : "active";

    const [updated] = await db
      .update(products)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(products.id, data.id))
      .returning();

    if (!updated) {
      throw new Error("Failed to toggle product status");
    }

    return updated;
  });

export const bulkDeleteProducts = createServerFn({ method: "POST" })
  .inputValidator((data: { ids: string[] }) => data)
  .handler(async ({ data }) => {
    const deleted = await db
      .delete(products)
      .where(inArray(products.id, data.ids))
      .returning();

    return { count: deleted.length };
  });

export const bulkDraftProducts = createServerFn({ method: "POST" })
  .inputValidator((data: { ids: string[] }) => data)
  .handler(async ({ data }) => {
    const updated = await db
      .update(products)
      .set({
        status: "draft",
        updatedAt: new Date(),
      })
      .where(inArray(products.id, data.ids))
      .returning();

    return { count: updated.length };
  });

export const getProductsForPricing = createServerFn({ method: "GET" }).handler(
  async () => {
    const results = await db
      .select({
        id: products.id,
        name: products.name,
        categoryName: categories.name,
        currentPrice: products.currentPrice,
        basePrice: products.basePrice,
        minPrice: products.minPrice,
        maxPrice: products.maxPrice,
        salesCount: products.salesCount,
        trend: products.trend,
        status: products.status,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.status, "active"))
      .orderBy(products.name);

    return results;
  },
);

export const bulkUpdatePrices = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      updates: Array<{
        id: string;
        basePrice: number;
        minPrice: number;
        maxPrice: number;
        totalSalesCount: number; // Total = salesCount + manualSalesAdjustment
      }>;
    }) => data,
  )
  .handler(async ({ data }) => {
    // Validate each update
    for (const update of data.updates) {
      if (update.minPrice >= update.maxPrice) {
        throw new Error("Minimalna cena mora biti manja od maksimalne");
      }
      if (
        update.minPrice <= 0 ||
        update.maxPrice <= 0 ||
        update.basePrice <= 0
      ) {
        throw new Error("Sve cene moraju biti veće od 0");
      }
      if (update.totalSalesCount < 0) {
        throw new Error("Broj prodatih jedinica ne može biti negativan");
      }
    }

    // Update each product
    const updatePromises = data.updates.map(async (update) => {
      // Fetch current product to get real salesCount
      const [currentProduct] = await db
        .select({ salesCount: products.salesCount })
        .from(products)
        .where(eq(products.id, update.id))
        .limit(1);

      if (!currentProduct) {
        throw new Error("Product not found");
      }

      // Calculate manual adjustment: total - realSales
      const manualSalesAdjustment =
        update.totalSalesCount - currentProduct.salesCount;

      return db
        .update(products)
        .set({
          basePrice: Math.round(update.basePrice).toString(),
          minPrice: Math.round(update.minPrice).toString(),
          maxPrice: Math.round(update.maxPrice).toString(),
          manualSalesAdjustment, // Update adjustment, NOT salesCount
          updatedAt: new Date(),
        })
        .where(eq(products.id, update.id))
        .returning();
    });

    const results = await Promise.all(updatePromises);
    return { count: results.length };
  });

// ============================================================================
// DYNAMIC PRICING SYSTEM - Phase 2 Implementation
// ============================================================================

/**
 * Update all product prices based on sales since lastPriceUpdate
 * This is called every 10 minutes or manually via "Change prices now" button
 */
export const updateAllPrices = createServerFn({ method: "POST" }).handler(
  async () => {
    // Get all active products
    const allProducts = await db
      .select()
      .from(products)
      .where(eq(products.status, "active"));

    let updatedCount = 0;

    for (const product of allProducts) {
      // Calculate sales since last price update based on salesCount delta + manual adjustment
      // This works for:
      // - Table orders (increment salesCount when created)
      // - Manual adjustments (manualSalesAdjustment field controlled from pricing page)
      const salesThisWindow =
        product.salesCount +
        product.manualSalesAdjustment -
        product.salesCountAtLastUpdate;

      // Calculate new price
      const newPrice = calculatePrice(
        {
          currentPrice: parseFloat(product.currentPrice),
          minPrice: parseFloat(product.minPrice),
          maxPrice: parseFloat(product.maxPrice),
          pricingMode: product.pricingMode,
          priceIncreasePercent: parseFloat(product.priceIncreasePercent),
          priceIncreaseRandomPercent: parseFloat(
            product.priceIncreaseRandomPercent,
          ),
          priceDecreasePercent: parseFloat(product.priceDecreasePercent),
          priceDecreaseRandomPercent: parseFloat(
            product.priceDecreaseRandomPercent,
          ),
        },
        salesThisWindow,
      );

      // Only update if price changed
      if (newPrice !== parseFloat(product.currentPrice)) {
        // Record previous price before updating
        const previousPrice = parseFloat(product.currentPrice);

        // Update product with new price
        await db
          .update(products)
          .set({
            previousPrice: previousPrice.toString(),
            currentPrice: newPrice.toString(),
            lastPriceUpdate: new Date(),
            salesCountAtLastUpdate: product.salesCount, // Save current salesCount for next delta calculation
            // Update trend indicator
            trend: newPrice > previousPrice ? "up" : "down",
            updatedAt: new Date(),
          })
          .where(eq(products.id, product.id));

        // Record in price history
        await db.insert(priceHistory).values({
          productId: product.id,
          price: newPrice.toString(),
          timestamp: new Date(),
        });

        updatedCount++;
      }
    }

    // Notify all connected clients that prices have been updated
    if (updatedCount > 0) {
      const payload = JSON.stringify({
        count: updatedCount,
        timestamp: new Date().toISOString(),
      });
      // Use raw pg client for NOTIFY (doesn't support parameterization)
      const client = await pool.connect();
      try {
        // Use PostgreSQL's built-in literal escaping for safety
        const escapedPayload = client.escapeLiteral(payload);
        await client.query(`NOTIFY price_update, ${escapedPayload}`);
      } finally {
        client.release();
      }
    }

    return {
      success: true,
      updatedCount,
    };
  },
);

/**
 * Reset session by updating lastPriceUpdate to NOW
 * This resets the counting window for next price update
 * Note: Does NOT change settings, does NOT change salesCount
 */
export const resetSessionQuantities = createServerFn({
  method: "POST",
}).handler(async () => {
  const result = await db
    .update(products)
    .set({
      lastPriceUpdate: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(products.status, "active"));

  return {
    success: true,
    resetCount: result.rowCount || 0,
  };
});

/**
 * Sync salesCount with actual tableOrders data
 * This is needed to populate salesCount from existing orders
 */
export const syncSalesCount = createServerFn({ method: "POST" }).handler(
  async () => {
    // Get all products
    const allProducts = await db.select({ id: products.id }).from(products);

    let syncedCount = 0;

    for (const product of allProducts) {
      // Calculate total quantity from tableOrders
      const [result] = await db
        .select({
          total: sql<number>`coalesce(sum(${tableOrders.quantity}), 0)::int`,
        })
        .from(tableOrders)
        .where(eq(tableOrders.productId, product.id));

      const totalSales = result?.total || 0;

      // Update salesCount and salesCountAtLastUpdate
      await db
        .update(products)
        .set({
          salesCount: totalSales,
          salesCountAtLastUpdate: totalSales,
          updatedAt: new Date(),
        })
        .where(eq(products.id, product.id));

      syncedCount++;
    }

    return {
      success: true,
      syncedCount,
    };
  },
);

/**
 * Update global pricing configuration for all products
 * Changes mode and percentage settings
 */
export const updatePricingConfig = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      pricingMode: string;
      priceIncreasePercent: number;
      priceIncreaseRandomPercent: number;
      priceDecreasePercent: number;
      priceDecreaseRandomPercent: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    // Validate inputs
    if (!["off", "up", "down", "full"].includes(data.pricingMode)) {
      throw new Error("Invalid pricingMode");
    }
    if (data.priceIncreasePercent < 0.1 || data.priceIncreasePercent > 10) {
      throw new Error("priceIncreasePercent must be between 0.1 and 10");
    }
    if (
      data.priceIncreaseRandomPercent < 0 ||
      data.priceIncreaseRandomPercent > 5
    ) {
      throw new Error("priceIncreaseRandomPercent must be between 0 and 5");
    }
    if (data.priceDecreasePercent < 0.1 || data.priceDecreasePercent > 10) {
      throw new Error("priceDecreasePercent must be between 0.1 and 10");
    }
    if (
      data.priceDecreaseRandomPercent < 0 ||
      data.priceDecreaseRandomPercent > 5
    ) {
      throw new Error("priceDecreaseRandomPercent must be between 0 and 5");
    }

    // Update all active products
    const result = await db
      .update(products)
      .set({
        pricingMode: data.pricingMode,
        priceIncreasePercent: data.priceIncreasePercent.toString(),
        priceIncreaseRandomPercent: data.priceIncreaseRandomPercent.toString(),
        priceDecreasePercent: data.priceDecreasePercent.toString(),
        priceDecreaseRandomPercent: data.priceDecreaseRandomPercent.toString(),
        updatedAt: new Date(),
      })
      .where(eq(products.status, "active"));

    return {
      success: true,
      updatedCount: result.rowCount || 0,
    };
  });

/**
 * Get pricing status for all products - used by pricing page
 * Includes: current price, trend, min/max, mode, percentages
 */
export const getPricingStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    const results = await db
      .select({
        id: products.id,
        name: products.name,
        categoryName: categories.name,
        currentPrice: products.currentPrice,
        previousPrice: products.previousPrice,
        basePrice: products.basePrice,
        minPrice: products.minPrice,
        maxPrice: products.maxPrice,
        salesCount: products.salesCount,
        manualSalesAdjustment: products.manualSalesAdjustment,
        trend: products.trend,
        pricingMode: products.pricingMode,
        priceIncreasePercent: products.priceIncreasePercent,
        priceIncreaseRandomPercent: products.priceIncreaseRandomPercent,
        priceDecreasePercent: products.priceDecreasePercent,
        priceDecreaseRandomPercent: products.priceDecreaseRandomPercent,
        lastPriceUpdate: products.lastPriceUpdate,
        status: products.status,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.status, "active"))
      .orderBy(products.name);

    return results;
  },
);

/**
 * Get price history for a specific product - for charts/ticker
 * Returns last N price changes with timestamps
 */
export const getPriceHistoryForProduct = createServerFn({
  method: "GET",
})
  .inputValidator((data: { productId: string; limit?: number }) => data)
  .handler(async ({ data }) => {
    const limit = data.limit || 10;

    const results = await db
      .select({
        price: priceHistory.price,
        timestamp: priceHistory.timestamp,
      })
      .from(priceHistory)
      .where(eq(priceHistory.productId, data.productId))
      .orderBy(desc(priceHistory.timestamp))
      .limit(limit);

    // Return in chronological order (oldest first)
    return results.reverse();
  });

/**
 * Get products for TV display
 * Returns all active products grouped by category
 */
export const getTVDisplayProducts = createServerFn({ method: "GET" }).handler(
  async () => {
    const results = await db
      .select({
        id: products.id,
        name: products.name,
        categoryName: categories.name,
        currentPrice: products.currentPrice,
        trend: products.trend,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.status, "active"))
      .orderBy(products.name);

    return results;
  },
);

// ============================================================================
// PRICE UPDATE INTERVAL SETTINGS
// ============================================================================

/**
 * Get the current price update interval in minutes
 */
export const getPriceUpdateInterval = createServerFn({ method: "GET" }).handler(
  async () => {
    const result = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, "priceUpdateIntervalMinutes"))
      .limit(1);

    // Default to 1 minute if not set
    const minutes = (result[0]?.value as Record<string, any>)?.minutes ?? 1;
    return { minutes };
  },
);

/**
 * Update the price update interval in minutes
 */
export const setPriceUpdateInterval = createServerFn({ method: "POST" })
  .inputValidator((data: { minutes: number }) => data)
  .handler(async ({ data }) => {
    const { minutes } = data;

    // Validate: minimum 1 minute, maximum 60 minutes
    if (minutes < 1 || minutes > 60) {
      throw new Error("Interval must be between 1 and 60 minutes");
    }

    // Upsert the setting
    const existing = await db
      .select({ id: settings.id })
      .from(settings)
      .where(eq(settings.key, "priceUpdateIntervalMinutes"))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(settings)
        .set({
          value: { minutes },
          updatedAt: new Date(),
        })
        .where(eq(settings.key, "priceUpdateIntervalMinutes"));
    } else {
      await db.insert(settings).values({
        key: "priceUpdateIntervalMinutes",
        value: { minutes },
      });
    }

    return { minutes };
  });

// ============================================================================
// REAL-TIME PRICE UPDATE NOTIFICATIONS (SSE)
// ============================================================================

/**
 * Server-Sent Events stream for real-time price update notifications
 * Clients connect to this endpoint and receive instant updates when prices change
 */
export const subscribeToPriceUpdates = createServerFn({
  method: "GET",
}).handler(async () => {
  // Initialize PostgreSQL LISTEN if not already done
  await initializePriceListener();

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Add this client to the broadcast list
      addClient(controller);

      // Send initial connection message
      const welcome = `data: ${JSON.stringify({ type: "connected", timestamp: new Date().toISOString() })}\n\n`;
      controller.enqueue(new TextEncoder().encode(welcome));

      // Send keepalive ping every 30 seconds to prevent connection timeout
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": ping\n\n"));
        } catch (error) {
          // Client disconnected, clean up
          clearInterval(pingInterval);
          removeClient(controller);
        }
      }, 30000);

      // Store interval ID so we can clear it on cancel
      (controller as any).pingInterval = pingInterval;
    },
    cancel(controller) {
      // Client disconnected, clean up
      const pingInterval = (controller as any).pingInterval;
      if (pingInterval) {
        clearInterval(pingInterval);
      }
      removeClient(controller);
    },
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
});
