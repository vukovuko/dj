/**
 * Background job: Update all product prices
 *
 * This job runs every 1 minute and:
 * 1. Counts sales for each product since lastPriceUpdate
 * 2. Calculates new price based on pricing algorithm
 * 3. Records price change in priceHistory
 * 4. Updates product currentPrice and trend
 *
 * Triggered by:
 * - Automatic scheduler (every 1 minute)
 * - Manual "Promeni cene sada" button click
 */

import { db } from "../db/index.ts"
import { products, tableOrders, priceHistory } from "../db/schema.ts"
import { eq, and, gte } from "drizzle-orm"
import { calculatePrice } from "../lib/pricing.ts"

interface UpdatePricesPayload {
  manual?: boolean // true if triggered by "Promeni cene sada" button
}

const task = async (payload: any, helpers: any) => {
  const { manual = false } = payload as UpdatePricesPayload

  const logPrefix = manual ? "🔄 [MANUAL]" : "⏰ [AUTO]"
  helpers.logger.info(`${logPrefix} Starting price update job`)

  try {
    // Get all active products
    const activeProducts = await db
      .select()
      .from(products)
      .where(eq(products.status, "active"))

    if (activeProducts.length === 0) {
      helpers.logger.info(`${logPrefix} No active products to update`)
      return
    }

    let updatedCount = 0
    let unchangedCount = 0
    const now = new Date()

    // Process each product
    for (const product of activeProducts) {
      // Count sales since lastPriceUpdate
      const salesSinceLastUpdate = await db
        .select()
        .from(tableOrders)
        .where(
          and(
            eq(tableOrders.productId, product.id),
            gte(tableOrders.createdAt, product.lastPriceUpdate),
          ),
        )

      // Sum quantities from all matching orders
      const salesThisWindow = salesSinceLastUpdate.reduce(
        (sum, order) => sum + order.quantity,
        0,
      )

      // Calculate new price
      const newPrice = calculatePrice(
        {
          currentPrice: Number(product.currentPrice),
          minPrice: Number(product.minPrice),
          maxPrice: Number(product.maxPrice),
          pricingMode: product.pricingMode,
          priceIncreasePercent: Number(product.priceIncreasePercent),
          priceIncreaseRandomPercent: Number(product.priceIncreaseRandomPercent),
          priceDecreasePercent: Number(product.priceDecreasePercent),
          priceDecreaseRandomPercent: Number(product.priceDecreaseRandomPercent),
        },
        salesThisWindow,
      )

      // Determine trend
      const currentPriceNum = Number(product.currentPrice)
      const trend =
        newPrice > currentPriceNum
          ? "up"
          : newPrice < currentPriceNum
            ? "down"
            : product.trend // Keep existing trend if price unchanged

      // Only update if price actually changed
      if (newPrice !== currentPriceNum) {
        // Update product
        await db
          .update(products)
          .set({
            currentPrice: newPrice.toString(),
            previousPrice: product.currentPrice,
            trend,
            lastPriceUpdate: now,
            updatedAt: now,
          })
          .where(eq(products.id, product.id))

        // Record in price history
        await db.insert(priceHistory).values({
          productId: product.id,
          price: newPrice.toString(),
          timestamp: now,
        })

        updatedCount++
      } else {
        unchangedCount++
      }
    }

    helpers.logger.info(
      `${logPrefix} Price update complete: ${updatedCount} updated, ${unchangedCount} unchanged`,
    )
  } catch (error) {
    helpers.logger.error(`${logPrefix} Price update failed`, { error })
    // Rethrow to mark job as failed (Graphile Worker will handle retries)
    throw error
  }
}

export default task
