// Server-only queries for products
import { createServerFn } from "@tanstack/react-start"
import { db } from "~/db"
import { products, categories, tableOrders, priceHistory } from "~/db/schema"
import { eq, ilike, sql, desc, inArray, gte } from "drizzle-orm"
import { calculatePrice } from "~/lib/pricing"

export const getProductsWithPagination = createServerFn({ method: "GET" })
  .inputValidator((data: { search?: string; page: number }) => data)
  .handler(async ({ data }) => {
    const { search, page } = data
    const limit = 50
    const offset = (page - 1) * limit

    // Build where condition with unaccent for smart search (ä → a, ö → o, etc.)
    const whereCondition = search
      ? sql`unaccent(${products.name}) ILIKE unaccent('%' || ${search} || '%')`
      : undefined

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(whereCondition)

    const total = countResult?.count || 0

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
      .offset(offset)

    return {
      products: results,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    }
  })

export const getProductById = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, data.id))
      .limit(1)

    if (!product) {
      throw new Error("Product not found")
    }

    return product
  })

export const updateProduct = createServerFn({ method: "POST" })
  .inputValidator((data: {
    id: string
    name: string
    categoryId: string
    basePrice: number
    minPrice: number
    maxPrice: number
    status: "active" | "draft"
  }) => data)
  .handler(async ({ data }) => {
    const { id, ...updateData } = data

    const [updated] = await db
      .update(products)
      .set({
        name: updateData.name,
        categoryId: updateData.categoryId,
        basePrice: updateData.basePrice.toString(),
        minPrice: updateData.minPrice.toString(),
        maxPrice: updateData.maxPrice.toString(),
        status: updateData.status,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning()

    if (!updated) {
      throw new Error("Failed to update product")
    }

    return updated
  })

export const deleteProduct = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const [deleted] = await db
      .delete(products)
      .where(eq(products.id, data.id))
      .returning()

    if (!deleted) {
      throw new Error("Failed to delete product")
    }

    return deleted
  })

export const createProduct = createServerFn({ method: "POST" })
  .inputValidator((data: {
    name: string
    categoryId: string
    basePrice: number
    minPrice: number
    maxPrice: number
    status: "active" | "draft"
  }) => data)
  .handler(async ({ data }) => {
    const [created] = await db
      .insert(products)
      .values({
        name: data.name,
        categoryId: data.categoryId,
        basePrice: data.basePrice.toString(),
        minPrice: data.minPrice.toString(),
        maxPrice: data.maxPrice.toString(),
        currentPrice: data.basePrice.toString(),
        previousPrice: data.basePrice.toString(),
        salesCount: 0,
        trend: "down",
        status: data.status,
      })
      .returning()

    if (!created) {
      throw new Error("Failed to create product")
    }

    return created
  })

export const getCategories = createServerFn({ method: "GET" })
  .handler(async () => {
    const result = await db
      .select()
      .from(categories)
      .orderBy(categories.name)

    return result
  })

export const toggleProductStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    // Get current product
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, data.id))
      .limit(1)

    if (!product) {
      throw new Error("Product not found")
    }

    // Toggle status
    const newStatus = product.status === "active" ? "draft" : "active"

    const [updated] = await db
      .update(products)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(products.id, data.id))
      .returning()

    if (!updated) {
      throw new Error("Failed to toggle product status")
    }

    return updated
  })

export const bulkDeleteProducts = createServerFn({ method: "POST" })
  .inputValidator((data: { ids: string[] }) => data)
  .handler(async ({ data }) => {
    const deleted = await db
      .delete(products)
      .where(inArray(products.id, data.ids))
      .returning()

    return { count: deleted.length }
  })

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
      .returning()

    return { count: updated.length }
  })

export const getProductsForPricing = createServerFn({ method: "GET" })
  .handler(async () => {
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
      .orderBy(products.name)

    return results
  })

export const bulkUpdatePrices = createServerFn({ method: "POST" })
  .inputValidator((data: {
    updates: Array<{
      id: string
      basePrice: number
      minPrice: number
      maxPrice: number
      salesCount: number
    }>
  }) => data)
  .handler(async ({ data }) => {
    // Validate each update
    for (const update of data.updates) {
      if (update.minPrice >= update.maxPrice) {
        throw new Error("Minimalna cena mora biti manja od maksimalne")
      }
      if (update.minPrice <= 0 || update.maxPrice <= 0 || update.basePrice <= 0) {
        throw new Error("Sve cene moraju biti veće od 0")
      }
      if (update.salesCount < 0) {
        throw new Error("Broj prodatih jedinica ne može biti negativan")
      }
    }

    // Update each product
    const updatePromises = data.updates.map(update =>
      db
        .update(products)
        .set({
          basePrice: update.basePrice.toString(),
          minPrice: update.minPrice.toString(),
          maxPrice: update.maxPrice.toString(),
          salesCount: update.salesCount,
          updatedAt: new Date(),
        })
        .where(eq(products.id, update.id))
        .returning()
    )

    const results = await Promise.all(updatePromises)
    return { count: results.length }
  })

// ============================================================================
// DYNAMIC PRICING SYSTEM - Phase 2 Implementation
// ============================================================================

/**
 * Update all product prices based on sales since lastPriceUpdate
 * This is called every 10 minutes or manually via "Change prices now" button
 */
export const updateAllPrices = createServerFn({ method: "POST" })
  .handler(async () => {
    // Get all active products
    const allProducts = await db
      .select()
      .from(products)
      .where(eq(products.status, "active"))

    let updatedCount = 0

    for (const product of allProducts) {
      // Get sales count since last price update
      const [salesResult] = await db
        .select({
          totalQuantity: sql<number>`coalesce(sum(${tableOrders.quantity}), 0)::int`,
        })
        .from(tableOrders)
        .where(gte(tableOrders.createdAt, product.lastPriceUpdate))

      const salesThisWindow = salesResult?.totalQuantity || 0

      // Calculate new price
      const newPrice = calculatePrice(
        {
          currentPrice: parseFloat(product.currentPrice),
          minPrice: parseFloat(product.minPrice),
          maxPrice: parseFloat(product.maxPrice),
          pricingMode: product.pricingMode,
          priceIncreasePercent: parseFloat(
            product.priceIncreasePercent
          ),
          priceIncreaseRandomPercent: parseFloat(
            product.priceIncreaseRandomPercent
          ),
          priceDecreasePercent: parseFloat(
            product.priceDecreasePercent
          ),
          priceDecreaseRandomPercent: parseFloat(
            product.priceDecreaseRandomPercent
          ),
        },
        salesThisWindow
      )

      // Only update if price changed
      if (newPrice !== parseFloat(product.currentPrice)) {
        // Record previous price before updating
        const previousPrice = parseFloat(product.currentPrice)

        // Update product with new price
        await db
          .update(products)
          .set({
            previousPrice: previousPrice.toString(),
            currentPrice: newPrice.toString(),
            lastPriceUpdate: new Date(),
            // Update trend indicator
            trend: newPrice > previousPrice ? "up" : "down",
            updatedAt: new Date(),
          })
          .where(eq(products.id, product.id))

        // Record in price history
        await db.insert(priceHistory).values({
          productId: product.id,
          price: newPrice.toString(),
          timestamp: new Date(),
        })

        updatedCount++
      }
    }

    return {
      success: true,
      updatedCount,
    }
  })

/**
 * Reset session by updating lastPriceUpdate to NOW
 * This resets the counting window for next price update
 * Note: Does NOT change settings, does NOT change salesCount
 */
export const resetSessionQuantities = createServerFn({ method: "POST" })
  .handler(async () => {
    const result = await db
      .update(products)
      .set({
        lastPriceUpdate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(products.status, "active"))

    return {
      success: true,
      resetCount: result.rowCount || 0,
    }
  })

/**
 * Update global pricing configuration for all products
 * Changes mode and percentage settings
 */
export const updatePricingConfig = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      pricingMode: string
      priceIncreasePercent: number
      priceIncreaseRandomPercent: number
      priceDecreasePercent: number
      priceDecreaseRandomPercent: number
    }) => data
  )
  .handler(async ({ data }) => {
    // Validate inputs
    if (
      !["off", "up", "down", "full"].includes(data.pricingMode)
    ) {
      throw new Error("Invalid pricingMode")
    }
    if (data.priceIncreasePercent < 0.1 || data.priceIncreasePercent > 10) {
      throw new Error("priceIncreasePercent must be between 0.1 and 10")
    }
    if (
      data.priceIncreaseRandomPercent < 0 ||
      data.priceIncreaseRandomPercent > 5
    ) {
      throw new Error(
        "priceIncreaseRandomPercent must be between 0 and 5"
      )
    }
    if (data.priceDecreasePercent < 0.1 || data.priceDecreasePercent > 10) {
      throw new Error("priceDecreasePercent must be between 0.1 and 10")
    }
    if (
      data.priceDecreaseRandomPercent < 0 ||
      data.priceDecreaseRandomPercent > 5
    ) {
      throw new Error(
        "priceDecreaseRandomPercent must be between 0 and 5"
      )
    }

    // Update all active products
    const result = await db
      .update(products)
      .set({
        pricingMode: data.pricingMode,
        priceIncreasePercent: data.priceIncreasePercent.toString(),
        priceIncreaseRandomPercent:
          data.priceIncreaseRandomPercent.toString(),
        priceDecreasePercent: data.priceDecreasePercent.toString(),
        priceDecreaseRandomPercent:
          data.priceDecreaseRandomPercent.toString(),
        updatedAt: new Date(),
      })
      .where(eq(products.status, "active"))

    return {
      success: true,
      updatedCount: result.rowCount || 0,
    }
  })

/**
 * Get pricing status for all products - used by pricing page
 * Includes: current price, trend, min/max, mode, percentages
 */
export const getPricingStatus = createServerFn({ method: "GET" })
  .handler(async () => {
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
      .orderBy(products.name)

    return results
  })

/**
 * Get price history for a specific product - for charts/ticker
 * Returns last N price changes with timestamps
 */
export const getPriceHistoryForProduct = createServerFn({
  method: "GET",
})
  .inputValidator((data: { productId: string; limit?: number }) => data)
  .handler(async ({ data }) => {
    const limit = data.limit || 10

    const results = await db
      .select({
        price: priceHistory.price,
        timestamp: priceHistory.timestamp,
      })
      .from(priceHistory)
      .where(eq(priceHistory.productId, data.productId))
      .orderBy(desc(priceHistory.timestamp))
      .limit(limit)

    // Return in chronological order (oldest first)
    return results.reverse()
  })
