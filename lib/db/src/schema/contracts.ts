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

export const contractsTable = pgTable(
  "contracts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    condominiumId: uuid("condominium_id")
      .notNull()
      .references(() => condominiumsTable.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id").references(() => suppliersTable.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    category: text("category").notNull().default("geral"),
    startsOn: timestamp("starts_on", { withTimezone: true }).notNull(),
    endsOn: timestamp("ends_on", { withTimezone: true }).notNull(),
    monthlyValue: numeric("monthly_value", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    status: text("status").notNull().default("active"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("contracts_cond_idx").on(t.condominiumId)],
);

export type Contract = typeof contractsTable.$inferSelect;
