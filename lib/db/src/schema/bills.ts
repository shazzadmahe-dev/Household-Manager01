import { pgTable, serial, text, numeric, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const billTypeEnum = pgEnum("bill_type", ["electricity", "wifi", "other"]);

export const billsTable = pgTable("bills", {
  id: serial("id").primaryKey(),
  type: billTypeEnum("type").notNull(),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  month: text("month").notNull(),
  splitAmongAll: boolean("split_among_all").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBillSchema = createInsertSchema(billsTable).omit({ id: true, createdAt: true });
export type InsertBill = z.infer<typeof insertBillSchema>;
export type Bill = typeof billsTable.$inferSelect;
