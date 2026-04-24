import { pgTable, text, uuid, timestamp, index } from "drizzle-orm/pg-core";
import { condominiumsTable } from "./condominiums";
import { unitsTable } from "./units";

export const deliveriesTable = pgTable(
  "deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    condominiumId: uuid("condominium_id")
      .notNull()
      .references(() => condominiumsTable.id, { onDelete: "cascade" }),
    unitId: uuid("unit_id").references(() => unitsTable.id, {
      onDelete: "set null",
    }),
    recipient: text("recipient").notNull(),
    carrier: text("carrier"),
    trackingCode: text("tracking_code"),
    status: text("status").notNull().default("received"),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    pickedUpAt: timestamp("picked_up_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("deliveries_cond_idx").on(t.condominiumId)],
);

export type Delivery = typeof deliveriesTable.$inferSelect;
