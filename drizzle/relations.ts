import { relations } from "drizzle-orm/relations";
import {
  account,
  categories,
  products,
  session,
  tableOrders,
  tables,
  user,
  videoGenerationChats,
  videos,
} from "./schema";

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const userRelations = relations(user, ({ many }) => ({
  accounts: many(account),
  sessions: many(session),
  videoGenerationChats: many(videoGenerationChats),
  videos: many(videos),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  tableOrders: many(tableOrders),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const videoGenerationChatsRelations = relations(
  videoGenerationChats,
  ({ one }) => ({
    user: one(user, {
      fields: [videoGenerationChats.userId],
      references: [user.id],
    }),
  }),
);

export const videosRelations = relations(videos, ({ one }) => ({
  user: one(user, {
    fields: [videos.createdBy],
    references: [user.id],
  }),
}));

export const tableOrdersRelations = relations(tableOrders, ({ one }) => ({
  table: one(tables, {
    fields: [tableOrders.tableId],
    references: [tables.id],
  }),
  product: one(products, {
    fields: [tableOrders.productId],
    references: [products.id],
  }),
}));

export const tablesRelations = relations(tables, ({ many }) => ({
  tableOrders: many(tableOrders),
}));
