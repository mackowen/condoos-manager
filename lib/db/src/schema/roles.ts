import { pgTable, text, uuid, timestamp, index } from "drizzle-orm/pg-core";
import { condominiumsTable } from "./condominiums";

export const rolesTable = pgTable(
  "roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    condominiumId: uuid("condominium_id")
      .notNull()
      .references(() => condominiumsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    permissions: text("permissions").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("roles_cond_idx").on(t.condominiumId)],
);

export type Role = typeof rolesTable.$inferSelect;
