import { pgTable, text, uuid, timestamp, index } from "drizzle-orm/pg-core";
import { condominiumsTable } from "./condominiums";
import { unitsTable } from "./units";

export const reservationsTable = pgTable(
  "reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    condominiumId: uuid("condominium_id")
      .notNull()
      .references(() => condominiumsTable.id, { onDelete: "cascade" }),
    unitId: uuid("unit_id").references(() => unitsTable.id, {
      onDelete: "set null",
    }),
    area: text("area").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("confirmed"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("reservations_cond_idx").on(t.condominiumId),
    index("reservations_starts_idx").on(t.startsAt),
  ],
);

export type Reservation = typeof reservationsTable.$inferSelect;
