import {
  pgTable,
  text,
  uuid,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { condominiumsTable } from "./condominiums";
import { rolesTable } from "./roles";

export const usersTable = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    condominiumId: uuid("condominium_id")
      .notNull()
      .references(() => condominiumsTable.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    roleId: uuid("role_id").references(() => rolesTable.id, {
      onDelete: "set null",
    }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_unique").on(t.email),
    index("users_cond_idx").on(t.condominiumId),
  ],
);

export type User = typeof usersTable.$inferSelect;
