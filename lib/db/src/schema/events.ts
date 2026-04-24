import { pgTable, text, uuid, timestamp, index } from "drizzle-orm/pg-core";
import { condominiumsTable } from "./condominiums";

export const eventsTable = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    condominiumId: uuid("condominium_id")
      .notNull()
      .references(() => condominiumsTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    location: text("location"),
    kind: text("kind").notNull().default("evento"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("events_cond_idx").on(t.condominiumId)],
);

export type EventRow = typeof eventsTable.$inferSelect;
