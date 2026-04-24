import {
  pgTable,
  text,
  uuid,
  timestamp,
  numeric,
  index,
} from "drizzle-orm/pg-core";

export const condominiumsTable = pgTable("condominiums", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  address: text("address"),
  cnpj: text("cnpj"),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color"),
  finePercent: numeric("fine_percent", { precision: 6, scale: 2 })
    .notNull()
    .default("2.00"),
  interestPercent: numeric("interest_percent", { precision: 6, scale: 2 })
    .notNull()
    .default("1.00"),
  modules: text("modules")
    .array()
    .notNull()
    .default([
      "residents",
      "units",
      "charges",
      "notices",
      "issues",
      "deliveries",
      "vehicles",
      "reservations",
      "documents",
      "services",
      "suppliers",
      "contracts",
      "events",
    ]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Condominium = typeof condominiumsTable.$inferSelect;
