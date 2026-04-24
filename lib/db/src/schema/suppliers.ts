import {
  pgTable,
  text,
  uuid,
  timestamp,
  numeric,
  index,
} from "drizzle-orm/pg-core";
import { condominiumsTable } from "./condominiums";

export const suppliersTable = pgTable(
  "suppliers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    condominiumId: uuid("condominium_id")
      .notNull()
      .references(() => condominiumsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").notNull().default("geral"),
    contactName: text("contact_name"),
    email: text("email"),
    phone: text("phone"),
    document: text("document"),
    rating: numeric("rating", { precision: 3, scale: 1 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("suppliers_cond_idx").on(t.condominiumId)],
);

export type Supplier = typeof suppliersTable.$inferSelect;
