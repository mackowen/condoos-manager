import { pgTable, text, uuid, timestamp, index } from "drizzle-orm/pg-core";
import { condominiumsTable } from "./condominiums";

export const noticesTable = pgTable(
  "notices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    condominiumId: uuid("condominium_id")
      .notNull()
      .references(() => condominiumsTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    category: text("category").notNull().default("geral"),
    priority: text("priority").notNull().default("normal"),
    publishedAt: timestamp("published_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("notices_cond_idx").on(t.condominiumId)],
);

export type Notice = typeof noticesTable.$inferSelect;
