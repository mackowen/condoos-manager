import {
  pgTable,
  text,
  uuid,
  timestamp,
  numeric,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { condominiumsTable } from "./condominiums";

export const unitsTable = pgTable(
  "units",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    condominiumId: uuid("condominium_id")
      .notNull()
      .references(() => condominiumsTable.id, { onDelete: "cascade" }),
    block: text("block"),
    number: text("number").notNull(),
    floor: text("floor"),
    type: text("type"),
    sizeM2: numeric("size_m2", { precision: 10, scale: 2 }),
    parkingSpots: integer("parking_spots").notNull().default(0),
    ownerName: text("owner_name"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("units_cond_idx").on(t.condominiumId)],
);

export type Unit = typeof unitsTable.$inferSelect;
