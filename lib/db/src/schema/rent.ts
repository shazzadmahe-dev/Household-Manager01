import { pgTable, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const rentSettingsTable = pgTable("rent_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }).unique(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull().default("0"),
  dueDay: integer("due_day").notNull().default(1),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRentSettingSchema = createInsertSchema(rentSettingsTable).omit({ id: true, updatedAt: true });
export type InsertRentSetting = z.infer<typeof insertRentSettingSchema>;
export type RentSetting = typeof rentSettingsTable.$inferSelect;
