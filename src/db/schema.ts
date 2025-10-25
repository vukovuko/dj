import { pgTable, text, timestamp, boolean, pgEnum, uuid, numeric, integer, jsonb } from "drizzle-orm/pg-core"

// Role enum for user roles
export const roleEnum = pgEnum("role", ["superadmin", "admin", "staff"])

// Product status enum
export const productStatusEnum = pgEnum("product_status", ["active", "draft"])

// Product trend enum (price direction)
export const trendEnum = pgEnum("trend", ["up", "down"])

// Video status enum
export const videoStatusEnum = pgEnum("video_status", ["pending", "generating", "ready", "failed"])

// Video aspect ratio enum
export const aspectRatioEnum = pgEnum("aspect_ratio", ["landscape", "portrait"])

// User table - Better Auth core schema + custom role field + username plugin fields
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  // Custom field for role-based access
  role: roleEnum("role").notNull().default("staff"),
  // Username plugin fields
  username: text("username").notNull().unique(),
  displayUsername: text("displayUsername"),
})

// Session table - Better Auth core schema
export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// Account table - Better Auth core schema
export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  idToken: text("idToken"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// Verification table - Better Auth core schema
export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// Categories table - max 2 categories (Cocktails, Shots)
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// Products table - drinks with dynamic pricing
export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  categoryId: uuid("categoryId")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),

  // Pricing fields (all in RSD)
  basePrice: numeric("basePrice", { precision: 10, scale: 2 }).notNull(),
  minPrice: numeric("minPrice", { precision: 10, scale: 2 }).notNull(),
  maxPrice: numeric("maxPrice", { precision: 10, scale: 2 }).notNull(),
  currentPrice: numeric("currentPrice", { precision: 10, scale: 2 }).notNull(),
  startingPrice: numeric("startingPrice", { precision: 10, scale: 2 }).notNull(),

  // Sales tracking
  salesCount: integer("salesCount").notNull().default(0),

  // UI indicators
  trend: trendEnum("trend").notNull().default("down"),

  // Status
  status: productStatusEnum("status").notNull().default("active"),

  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// Settings table - flexible key-value storage for app configuration
export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// Videos table - AI generated videos for TV display
export const videos = pgTable("videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  prompt: text("prompt").notNull(),
  url: text("url"), // null until generated
  thumbnailUrl: text("thumbnailUrl"), // null until generated
  duration: integer("duration").notNull(), // seconds (15, 30, 60)
  aspectRatio: aspectRatioEnum("aspectRatio").notNull(),
  status: videoStatusEnum("status").notNull().default("pending"),
  errorMessage: text("errorMessage"), // if failed
  externalId: text("externalId"), // Luma AI generation ID for tracking
  createdBy: text("createdBy")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// Video generation chats table - per-user chat history
export const videoGenerationChats = pgTable("videoGenerationChats", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  messages: jsonb("messages").$type<Array<{
    role: "user" | "assistant"
    content: string
    timestamp: string
    videoId?: string
  }>>().notNull().default("[]"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})
