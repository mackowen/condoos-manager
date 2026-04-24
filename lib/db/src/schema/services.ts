import {
  pgTable,
  text,
  uuid,
  timestamp,
  numeric,
  index,
} from "drizzle-orm/pg-core";
import { condominiumsTable } from "./condominiums";
import { suppliersTable } from "./suppliers";

export const serviceOrdersTable = pgTable(
  "service_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    condominiumId: uuid("condominium_id")
      .notNull()
      .references(() => condominiumsTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    supplierId: uuid("supplier_id").references(() => suppliersTable.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("open"),
    priority: text("priority").notNull().default("medium"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    cost: numeric("cost", { precision: 14, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("service_orders_cond_idx").on(t.condominiumId)],
);

export type ServiceOrder = typeof serviceOrdersTable.$inferSelect;
