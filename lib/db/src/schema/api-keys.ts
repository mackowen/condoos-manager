import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { condominiumsTable } from "./condominiums";
import { usersTable } from "./users";

export const apiKeysTable = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  condominiumId: uuid("condominium_id")
    .notNull()
    .references(() => condominiumsTable.id, { onDelete: "cascade" }),
  createdById: uuid("created_by_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  keyPrefix: varchar("key_prefix", { length: 8 }).notNull(),
  keyHash: text("key_hash").notNull(),
  permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
