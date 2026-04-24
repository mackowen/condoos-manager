import { pgTable, text, uuid, timestamp, index } from "drizzle-orm/pg-core";
import { condominiumsTable } from "./condominiums";
import { unitsTable } from "./units";

export const issuesTable = pgTable(
  "issues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    condominiumId: uuid("condominium_id")
      .notNull()
      .references(() => condominiumsTable.id, { onDelete: "cascade" }),
    unitId: uuid("unit_id").references(() => unitsTable.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull().default("geral"),
    priority: text("priority").notNull().default("medium"),
    status: text("status").notNull().default("open"),
    reportedBy: text("reported_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("issues_cond_idx").on(t.condominiumId)],
);

export type Issue = typeof issuesTable.$inferSelect;
