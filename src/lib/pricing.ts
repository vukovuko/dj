/**
 * Shared pricing algorithm utilities
 * Used by both server functions and background jobs
 */

export interface PricingProduct {
  currentPrice: number
  minPrice: number
  maxPrice: number
  pricingMode: string
  priceIncreasePercent: number
  priceIncreaseRandomPercent: number
  priceDecreasePercent: number
  priceDecreaseRandomPercent: number
}

/**
 * Calculate new product price based on sales volume and pricing mode
 * Pure function - no database modifications
 *
 * Algorithm:
 * 1. If mode is "off", return current price (disabled)
 * 2. If sales > 0: increase price (unless mode is "down-only")
 *    - Base increase: priceIncreasePercent
 *    - Random variance: random(0,1) × priceIncreaseRandomPercent
 * 3. If sales = 0: decrease price (unless mode is "up-only")
 *    - Base decrease: priceDecreasePercent
 *    - Random variance: random(0,1) × priceDecreaseRandomPercent
 * 4. Apply min/max bounds
 * 5. Round to integer (no decimals)
 */
export function calculatePrice(
  product: PricingProduct,
  salesThisWindow: number,
): number {
  // Step 0: Check if pricing is disabled
  if (product.pricingMode === "off") {
    return product.currentPrice
  }

  let newPrice: number

  // Step 1 & 2: Check sales and determine direction
  if (salesThisWindow > 0) {
    // Product sold in this window - consider increasing price
    if (product.pricingMode === "down") {
      return product.currentPrice // Down-only mode: don't increase
    }

    // Mode allows increase (up or full)
    const randomVariance = Math.random() // 0.0 to 1.0
    const totalIncreasePercent =
      product.priceIncreasePercent +
      randomVariance * product.priceIncreaseRandomPercent

    newPrice = product.currentPrice * (1 + totalIncreasePercent / 100)
  } else {
    // No sales in this window - consider decreasing price
    if (product.pricingMode === "up") {
      return product.currentPrice // Up-only mode: don't decrease
    }

    // Mode allows decrease (down or full)
    const randomVariance = Math.random() // 0.0 to 1.0
    const totalDecreasePercent =
      product.priceDecreasePercent +
      randomVariance * product.priceDecreaseRandomPercent

    newPrice = product.currentPrice * (1 - totalDecreasePercent / 100)
  }

  // Step 3: Apply bounds (min/max)
  newPrice = Math.max(
    product.minPrice,
    Math.min(product.maxPrice, newPrice),
  )

  // Round to integer (no decimals per requirements)
  return Math.round(newPrice)
}
