import { sql } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const aspectRatio = pgEnum("aspect_ratio", ["landscape", "portrait"]);
export const orderStatus = pgEnum("order_status", ["paid", "unpaid"]);
export const productStatus = pgEnum("product_status", ["active", "draft"]);
export const role = pgEnum("role", ["superadmin", "admin", "staff"]);
export const tableStatus = pgEnum("table_status", ["active", "inactive"]);
export const trend = pgEnum("trend", ["up", "down"]);
export const videoStatus = pgEnum("video_status", [
  "pending",
  "generating",
  "ready",
  "failed",
]);

export const verification = pgTable("verification", {
  id: text().primaryKey().notNull(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp({ mode: "string" }).notNull(),
  createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
});

export const account = pgTable(
  "account",
  {
    id: text().primaryKey().notNull(),
    userId: text().notNull(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    accessToken: text(),
    refreshToken: text(),
    accessTokenExpiresAt: timestamp({ mode: "string" }),
    refreshTokenExpiresAt: timestamp({ mode: "string" }),
    scope: text(),
    idToken: text(),
    password: text(),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "account_userId_user_id_fk",
    }).onDelete("cascade"),
  ],
);

export const session = pgTable(
  "session",
  {
    id: text().primaryKey().notNull(),
    userId: text().notNull(),
    token: text().notNull(),
    expiresAt: timestamp({ mode: "string" }).notNull(),
    ipAddress: text(),
    userAgent: text(),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "session_userId_user_id_fk",
    }).onDelete("cascade"),
    unique("session_token_unique").on(table.token),
  ],
);

export const user = pgTable(
  "user",
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    email: text().notNull(),
    emailVerified: boolean().default(false).notNull(),
    image: text(),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    role: role().default("staff").notNull(),
    username: text().notNull(),
    displayUsername: text(),
  },
  (table) => [
    unique("user_email_unique").on(table.email),
    unique("user_username_unique").on(table.username),
  ],
);

export const settings = pgTable(
  "settings",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    key: text().notNull(),
    value: jsonb().notNull(),
    updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  },
  (table) => [unique("settings_key_unique").on(table.key)],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    slug: text().notNull(),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  },
  (table) => [unique("categories_slug_unique").on(table.slug)],
);

export const products = pgTable(
  "products",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    categoryId: uuid().notNull(),
    basePrice: numeric({ precision: 10, scale: 2 }).notNull(),
    minPrice: numeric({ precision: 10, scale: 2 }).notNull(),
    maxPrice: numeric({ precision: 10, scale: 2 }).notNull(),
    currentPrice: numeric({ precision: 10, scale: 2 }).notNull(),
    previousPrice: numeric({ precision: 10, scale: 2 }).notNull(),
    salesCount: integer().default(0).notNull(),
    trend: trend().default("down").notNull(),
    status: productStatus().default("active").notNull(),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [categories.id],
      name: "products_categoryId_categories_id_fk",
    }).onDelete("cascade"),
  ],
);

export const videoGenerationChats = pgTable(
  "videoGenerationChats",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: text().notNull(),
    messages: jsonb().notNull(),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "videoGenerationChats_userId_user_id_fk",
    }).onDelete("cascade"),
    unique("videoGenerationChats_userId_unique").on(table.userId),
  ],
);

export const videos = pgTable(
  "videos",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    prompt: text().notNull(),
    url: text(),
    thumbnailUrl: text(),
    duration: integer().notNull(),
    aspectRatio: aspectRatio().notNull(),
    status: videoStatus().default("pending").notNull(),
    errorMessage: text(),
    createdBy: text().notNull(),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    externalId: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [user.id],
      name: "videos_createdBy_user_id_fk",
    }).onDelete("cascade"),
  ],
);

export const tables = pgTable(
  "tables",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    number: integer().notNull(),
    status: tableStatus().default("active").notNull(),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  },
  (table) => [unique("tables_number_unique").on(table.number)],
);

export const tableOrders = pgTable(
  "tableOrders",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    tableId: uuid().notNull(),
    productId: uuid().notNull(),
    quantity: integer().notNull(),
    paymentStatus: orderStatus().default("unpaid").notNull(),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.tableId],
      foreignColumns: [tables.id],
      name: "tableOrders_tableId_tables_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: "tableOrders_productId_products_id_fk",
    }).onDelete("cascade"),
  ],
);
