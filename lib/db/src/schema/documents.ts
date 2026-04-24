import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { condominiumsTable } from "./condominiums";

export const documentsTable = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    condominiumId: uuid("condominium_id")
      .notNull()
      .references(() => condominiumsTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    category: text("category").notNull().default("geral"),
    url: text("url"),
    sizeKb: integer("size_kb"),
    uploadedBy: text("uploaded_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("documents_cond_idx").on(t.condominiumId)],
);

export type Document = typeof documentsTable.$inferSelect;
