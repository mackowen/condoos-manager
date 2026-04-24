import { pgTable, text, uuid, timestamp, index } from "drizzle-orm/pg-core";
import { condominiumsTable } from "./condominiums";
import { unitsTable } from "./units";

export const vehiclesTable = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    condominiumId: uuid("condominium_id")
      .notNull()
      .references(() => condominiumsTable.id, { onDelete: "cascade" }),
    unitId: uuid("unit_id").references(() => unitsTable.id, {
      onDelete: "set null",
    }),
    plate: text("plate").notNull(),
    model: text("model"),
    color: text("color"),
    kind: text("kind").notNull().default("car"),
    ownerName: text("owner_name"),
    parkingSpot: text("parking_spot"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("vehicles_cond_idx").on(t.condominiumId)],
);

export type Vehicle = typeof vehiclesTable.$inferSelect;
