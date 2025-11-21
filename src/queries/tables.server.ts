import { createServerFn } from '@tanstack/react-start'
import { db } from '~/db'
import { tables, tableOrders, products, categories } from '~/db/schema'
import { eq, desc, sql, and, inArray } from 'drizzle-orm'

// Get all tables with pagination and search
export const getTablesWithPagination = createServerFn({ method: 'GET' })
  .inputValidator((data: { search?: string; page: number }) => data)
  .handler(async ({ data }) => {
    const search = data.search || ''
    const page = data.page || 1
    const limit = 25
    const offset = (page - 1) * limit

    const whereCondition = search
      ? sql`CAST(${tables.number} AS TEXT) ILIKE ${'%' + search + '%'}`
      : undefined

    const [totalResult, tablesList] = await Promise.all([
      db.select({ count: sql`COUNT(*)` }).from(tables).where(whereCondition),
      db
        .select({
          id: tables.id,
          number: tables.number,
          status: tables.status,
          createdAt: tables.createdAt,
          kupljeno: sql<number>`COALESCE(SUM(${tableOrders.quantity}), 0)`,
        })
        .from(tables)
        .leftJoin(tableOrders, eq(tables.id, tableOrders.tableId))
        .where(whereCondition)
        .groupBy(tables.id, tables.number, tables.status, tables.createdAt)
        .orderBy(desc(tables.number))
        .limit(limit)
        .offset(offset),
    ])

    const total = Number(totalResult[0]?.count || 0)
    const totalPages = Math.ceil(total / limit)

    return {
      tables: tablesList,
      total,
      totalPages,
      currentPage: page,
    }
  })

// Get single table with orders
export const getTableById = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const [table] = await db
      .select()
      .from(tables)
      .where(eq(tables.id, data.id))
      .limit(1)

    if (!table) {
      throw new Error('Table not found')
    }

    const orders = await db
      .select({
        id: tableOrders.id,
        tableId: tableOrders.tableId,
        productId: tableOrders.productId,
        productName: products.name,
        categoryName: categories.name,
        quantity: tableOrders.quantity,
        paymentStatus: tableOrders.paymentStatus,
        orderedPrice: tableOrders.orderedPrice,
        createdAt: tableOrders.createdAt,
      })
      .from(tableOrders)
      .innerJoin(products, eq(tableOrders.productId, products.id))
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(tableOrders.tableId, data.id))
      .orderBy(desc(tableOrders.createdAt))

    // Calculate revenue
    const totalRevenue = orders.reduce((sum, order) => {
      const price = parseFloat(order.orderedPrice)
      return sum + price * order.quantity
    }, 0)

    const paidRevenue = orders
      .filter((o) => o.paymentStatus === 'paid')
      .reduce((sum, order) => {
        const price = parseFloat(order.orderedPrice)
        return sum + price * order.quantity
      }, 0)

    return {
      table,
      orders,
      totalRevenue,
      paidRevenue,
      unpaidRevenue: totalRevenue - paidRevenue,
    }
  })

// Create new table
export const createTable = createServerFn({ method: 'POST' })
  .inputValidator((data: { number: number }) => data)
  .handler(async ({ data }) => {
    // Check if table with this number already exists
    const [existing] = await db
      .select()
      .from(tables)
      .where(eq(tables.number, data.number))
      .limit(1)

    if (existing) {
      throw new Error(`Sto broj ${data.number} već postoji`)
    }

    const [created] = await db
      .insert(tables)
      .values({
        number: data.number,
        status: 'active',
      })
      .returning()

    return created
  })

// Update table
export const updateTable = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; number: number; status: 'active' | 'inactive' }) => data)
  .handler(async ({ data }) => {
    // Check if another table with this number already exists
    const [existing] = await db
      .select()
      .from(tables)
      .where(and(
        eq(tables.number, data.number),
        // Exclude the current table being updated
        sql`${tables.id} != ${data.id}`
      ))
      .limit(1)

    if (existing) {
      throw new Error(`Sto broj ${data.number} već postoji`)
    }

    const [updated] = await db
      .update(tables)
      .set({
        number: data.number,
        status: data.status,
        updatedAt: new Date(),
      })
      .where(eq(tables.id, data.id))
      .returning()

    return updated
  })

// Delete table
export const deleteTable = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const result = await db.delete(tables).where(eq(tables.id, data.id)).returning()
    return result[0]
  })

// Bulk delete tables
export const bulkDeleteTables = createServerFn({ method: 'POST' })
  .inputValidator((data: { ids: string[] }) => data)
  .handler(async ({ data }) => {
    const result = await db
      .delete(tables)
      .where(inArray(tables.id, data.ids))
      .returning()
    return result
  })

// Add product to table order
export const addProductToTable = createServerFn({ method: 'POST' })
  .inputValidator((data: { tableId: string; productId: string; quantity: number }) => data)
  .handler(async ({ data }) => {
    // Fetch the product to get current price
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, data.productId))
      .limit(1)

    if (!product) {
      throw new Error('Product not found')
    }

    // Check if product with same price already exists for this table
    const [existing] = await db
      .select()
      .from(tableOrders)
      .where(and(
        eq(tableOrders.tableId, data.tableId),
        eq(tableOrders.productId, data.productId),
        eq(tableOrders.orderedPrice, product.currentPrice)
      ))
      .limit(1)

    if (existing) {
      // Update quantity (keep original price)
      const [updated] = await db
        .update(tableOrders)
        .set({
          quantity: existing.quantity + data.quantity,
          updatedAt: new Date(),
        })
        .where(eq(tableOrders.id, existing.id))
        .returning()
      return updated
    } else {
      // Create new order with current product price
      const [created] = await db
        .insert(tableOrders)
        .values({
          tableId: data.tableId,
          productId: data.productId,
          quantity: data.quantity,
          orderedPrice: product.currentPrice,
          paymentStatus: 'unpaid',
        })
        .returning()
      return created
    }
  })

// Update order quantity
export const updateOrderQuantity = createServerFn({ method: 'POST' })
  .inputValidator((data: { orderId: string; quantity: number }) => data)
  .handler(async ({ data }) => {
    if (data.quantity <= 0) {
      // Delete if quantity is 0 or less
      const result = await db.delete(tableOrders).where(eq(tableOrders.id, data.orderId)).returning()
      return result[0]
    }

    const [updated] = await db
      .update(tableOrders)
      .set({
        quantity: data.quantity,
        updatedAt: new Date(),
      })
      .where(eq(tableOrders.id, data.orderId))
      .returning()

    return updated
  })

// Toggle payment status for single order
export const toggleOrderPaymentStatus = createServerFn({ method: 'POST' })
  .inputValidator((data: { orderId: string; status: 'paid' | 'unpaid' }) => data)
  .handler(async ({ data }) => {
    const [updated] = await db
      .update(tableOrders)
      .set({
        paymentStatus: data.status,
        updatedAt: new Date(),
      })
      .where(eq(tableOrders.id, data.orderId))
      .returning()

    return updated
  })

// Bulk toggle payment status
export const bulkToggleOrderPaymentStatus = createServerFn({ method: 'POST' })
  .inputValidator((data: { orderIds: string[]; status: 'paid' | 'unpaid' }) => data)
  .handler(async ({ data }) => {
    const result = await db
      .update(tableOrders)
      .set({
        paymentStatus: data.status,
        updatedAt: new Date(),
      })
      .where(inArray(tableOrders.id, data.orderIds))
      .returning()

    return result
  })

// Delete order
export const deleteTableOrder = createServerFn({ method: 'POST' })
  .inputValidator((data: { orderId: string }) => data)
  .handler(async ({ data }) => {
    const result = await db.delete(tableOrders).where(eq(tableOrders.id, data.orderId)).returning()
    return result[0]
  })

// Clear all orders for table
export const clearTableOrders = createServerFn({ method: 'POST' })
  .inputValidator((data: { tableId: string }) => data)
  .handler(async ({ data }) => {
    const result = await db
      .delete(tableOrders)
      .where(eq(tableOrders.tableId, data.tableId))
      .returning()
    return result
  })

// Get all active products for adding to table
export const getActiveProducts = createServerFn({ method: 'GET' })
  .inputValidator((data: { search?: string }) => data)
  .handler(async ({ data }) => {
    const search = data.search || ''

    // Build where condition with unaccent for smart search (ä → a, ö → o, etc.)
    let whereCondition = eq(products.status, 'active')
    if (search) {
      whereCondition = and(
        whereCondition,
        sql`unaccent(${products.name}) ILIKE unaccent('%' || ${search} || '%')`
      )!
    }

    const result = await db
      .select({
        id: products.id,
        name: products.name,
        categoryName: categories.name,
        currentPrice: products.currentPrice,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(whereCondition)
      .orderBy(products.name)

    return result
  })
