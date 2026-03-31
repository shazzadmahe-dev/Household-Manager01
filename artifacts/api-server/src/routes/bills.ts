import { Router } from "express";
import { db, billsTable, paymentsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin, requireAdminOrRoommatePlus } from "../middlewares/auth";

const router = Router();

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatBill(b: typeof billsTable.$inferSelect) {
  return {
    id: b.id,
    type: b.type,
    name: b.name,
    amount: parseFloat(b.amount),
    month: b.month,
    splitAmongAll: b.splitAmongAll,
    createdAt: b.createdAt,
  };
}

router.get("/", requireAuth, async (_req, res) => {
  const month = getCurrentMonth();
  const bills = await db.select().from(billsTable).where(eq(billsTable.month, month));
  return res.json(bills.map(formatBill));
});

router.post("/", requireAdminOrRoommatePlus, async (req, res) => {
  const { type, name, amount, month, userIds } = req.body;
  const billMonth = month || getCurrentMonth();

  // Determine who to split with
  const allUsers = await db.select().from(usersTable);
  const targetUsers = Array.isArray(userIds) && userIds.length > 0
    ? allUsers.filter(u => userIds.includes(u.id))
    : allUsers;

  const splitAmongAll = targetUsers.length === allUsers.length;

  const [bill] = await db.insert(billsTable).values({
    type,
    name,
    amount: String(amount),
    month: billMonth,
    splitAmongAll,
  }).returning();

  const perPerson = amount / targetUsers.length;
  for (const user of targetUsers) {
    await db.insert(paymentsTable).values({
      userId: user.id,
      referenceType: "bill",
      referenceId: bill.id,
      amount: String(perPerson.toFixed(2)),
      status: "pending",
      month: bill.month,
      description: `${name || type} - ${bill.month}`,
    });
  }

  return res.status(201).json(formatBill(bill));
});

router.put("/:id", requireAdminOrRoommatePlus, async (req, res) => {
  const id = parseInt(req.params.id);
  const { amount, month, splitAmongAll } = req.body;
  const updates: Record<string, unknown> = {};
  if (amount !== undefined) updates.amount = String(amount);
  if (month !== undefined) updates.month = month;
  if (splitAmongAll !== undefined) updates.splitAmongAll = splitAmongAll;

  const [bill] = await db.update(billsTable).set(updates).where(eq(billsTable.id, id)).returning();
  if (!bill) return res.status(404).json({ error: "Bill not found" });

  if (amount !== undefined) {
    const payments = await db.select().from(paymentsTable)
      .where(eq(paymentsTable.referenceId, id))
      .then(ps => ps.filter(p => p.referenceType === "bill" && p.status === "pending"));

    const users = await db.select().from(usersTable);
    const perPerson = amount / users.length;
    for (const payment of payments) {
      await db.update(paymentsTable).set({ amount: String(perPerson.toFixed(2)) }).where(eq(paymentsTable.id, payment.id));
    }
  }

  return res.json(formatBill(bill));
});

router.delete("/:id", requireAdminOrRoommatePlus, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(paymentsTable).where(eq(paymentsTable.referenceId, id));
  await db.delete(billsTable).where(eq(billsTable.id, id));
  return res.json({ success: true });
});

export default router;
