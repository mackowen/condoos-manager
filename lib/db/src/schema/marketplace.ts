import {
  pgTable,
  text,
  uuid,
  timestamp,
  numeric,
  integer,
  boolean,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { condominiumsTable } from "./condominiums";
import { usersTable } from "./users";

export const marketplaceCategoriesTable = pgTable(
  "marketplace_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    condominiumId: uuid("condominium_id")
      .notNull()
      .references(() => condominiumsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    icon: text("icon"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("mktcat_cond_idx").on(t.condominiumId)],
);

export const marketplaceListingsTable = pgTable(
  "marketplace_listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    condominiumId: uuid("condominium_id")
      .notNull()
      .references(() => condominiumsTable.id, { onDelete: "cascade" }),
    residentId: uuid("resident_id"),
    residentName: text("resident_name"),
    categoryId: uuid("category_id").references(() => marketplaceCategoriesTable.id, {
      onDelete: "set null",
    }),
    categoryName: text("category_name"),
    title: text("title").notNull(),
    description: text("description").notNull(),
    price: numeric("price", { precision: 14, scale: 2 }),
    type: text("type").notNull().default("product"),
    status: text("status").notNull().default("pending"),
    isHighlighted: boolean("is_highlighted").notNull().default(false),
    views: integer("views").notNull().default(0),
    contactInfo: text("contact_info"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("mktlisting_cond_idx").on(t.condominiumId),
    index("mktlisting_status_idx").on(t.status),
  ],
);

export const marketplaceImagesTable = pgTable(
  "marketplace_listing_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => marketplaceListingsTable.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("mktimg_listing_idx").on(t.listingId)],
);

export const marketplaceFavoritesTable = pgTable(
  "marketplace_favorites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => marketplaceListingsTable.id, { onDelete: "cascade" }),
    condominiumId: uuid("condominium_id")
      .notNull()
      .references(() => condominiumsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("mktfav_user_listing_uniq").on(t.userId, t.listingId),
    index("mktfav_listing_idx").on(t.listingId),
  ],
);

export const marketplaceReportsTable = pgTable(
  "marketplace_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => marketplaceListingsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    condominiumId: uuid("condominium_id")
      .notNull()
      .references(() => condominiumsTable.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("mktreport_listing_idx").on(t.listingId)],
);

export const marketplaceSettingsTable = pgTable(
  "marketplace_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    condominiumId: uuid("condominium_id")
      .notNull()
      .unique()
      .references(() => condominiumsTable.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull().default(true),
    requireApproval: boolean("require_approval").notNull().default(true),
    maxListingsPerUser: integer("max_listings_per_user").notNull().default(5),
    allowProducts: boolean("allow_products").notNull().default(true),
    allowServices: boolean("allow_services").notNull().default(true),
    allowImages: boolean("allow_images").notNull().default(true),
    maxImagesPerListing: integer("max_images_per_listing").notNull().default(5),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export type MarketplaceCategory = typeof marketplaceCategoriesTable.$inferSelect;
export type MarketplaceListing = typeof marketplaceListingsTable.$inferSelect;
export type MarketplaceImage = typeof marketplaceImagesTable.$inferSelect;
export type MarketplaceFavorite = typeof marketplaceFavoritesTable.$inferSelect;
export type MarketplaceReport = typeof marketplaceReportsTable.$inferSelect;
export type MarketplaceSettings = typeof marketplaceSettingsTable.$inferSelect;
