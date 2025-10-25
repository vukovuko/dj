// Server-only queries for products
import { createServerFn } from "@tanstack/react-start"
import { db } from "~/db"
import { products, categories } from "~/db/schema"
import { eq, ilike, sql, desc, inArray } from "drizzle-orm"

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
        startingPrice: data.basePrice.toString(),
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
