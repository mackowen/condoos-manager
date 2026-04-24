import { pgTable, text, uuid, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { condominiumsTable } from "./condominiums";
import { usersTable } from "./users";

export const activityLogsTable = pgTable(
  "activity_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    condominiumId: uuid("condominium_id")
      .notNull()
      .references(() => condominiumsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    userName: text("user_name"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    message: text("message").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("logs_cond_idx").on(t.condominiumId),
    index("logs_created_idx").on(t.createdAt),
  ],
);

export type ActivityLogRow = typeof activityLogsTable.$inferSelect;
