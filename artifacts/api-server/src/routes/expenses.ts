import { Router } from "express";
import { db, expensesTable, paymentsTable, usersTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function buildExpense(expense: typeof expensesTable.$inferSelect) {
  const includedIds: number[] = JSON.parse(expense.includedUserIds);
  const [addedByUser, includedUsers, payments] = await Promise.all([
    db.select({ id: usersTable.id, username: usersTable.username, displayName: usersTable.displayName, role: usersTable.role, createdAt: usersTable.createdAt })
      .from(usersTable).where(eq(usersTable.id, expense.addedBy)).limit(1),
    includedIds.length > 0
      ? db.select({ id: usersTable.id, username: usersTable.username, displayName: usersTable.displayName, role: usersTable.role, createdAt: usersTable.createdAt })
          .from(usersTable).where(inArray(usersTable.id, includedIds))
      : Promise.resolve([]),
    db.select().from(paymentsTable)
      .where(eq(paymentsTable.referenceId, expense.id))
      .then(ps => ps.filter(p => p.referenceType === "expense")),
  ]);

  const paymentUsers = payments.length > 0
    ? await db.select({ id: usersTable.id, username: usersTable.username, displayName: usersTable.displayName, role: usersTable.role, createdAt: usersTable.createdAt })
        .from(usersTable).where(inArray(usersTable.id, payments.map(p => p.userId)))
    : [];

  return {
    id: expense.id,
    description: expense.description,
    amount: parseFloat(expense.amount),
    addedBy: expense.addedBy,
    addedByUser: addedByUser[0] || null,
    includedUserIds: includedIds,
    createdAt: expense.createdAt,
    payments: payments.map(p => ({
      id: p.id,
      userId: p.userId,
      user: paymentUsers.find(u => u.id === p.userId) || null,
      referenceType: p.referenceType,
      referenceId: p.referenceId,
      amount: parseFloat(p.amount),
      status: p.status,
      month: p.month,
      description: p.description,
      paidAt: p.paidAt,
      verifiedAt: p.verifiedAt,
    })),
  };
}

router.get("/", requireAuth, async (_req, res) => {
  const expenses = await db.select().from(expensesTable).orderBy(expensesTable.createdAt);
  const result = await Promise.all(expenses.map(buildExpense));
  return res.json(result.reverse());
});

router.post("/", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { description, amount, includedUserIds } = req.body;

  if (!description || !amount || !includedUserIds?.length) {
    return res.status(400).json({ error: "Description, amount and included users required" });
  }

  const month = getCurrentMonth();
  const perPerson = (amount / includedUserIds.length).toFixed(2);

  const [expense] = await db.insert(expensesTable).values({
    description,
    amount: String(amount),
    addedBy: user.id,
    includedUserIds: JSON.stringify(includedUserIds),
  }).returning();

  for (const userId of includedUserIds) {
    await db.insert(paymentsTable).values({
      userId,
      referenceType: "expense",
      referenceId: expense.id,
      amount: perPerson,
      status: "pending",
      month,
      description: `${description} - expense share`,
    });
  }

  return res.status(201).json(await buildExpense(expense));
});

router.delete("/:id", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const id = parseInt(req.params.id);

  const [expense] = await db.select().from(expensesTable).where(eq(expensesTable.id, id)).limit(1);
  if (!expense) return res.status(404).json({ error: "Expense not found" });
  if (expense.addedBy !== user.id && user.role !== "admin") {
    return res.status(403).json({ error: "Not authorized" });
  }

  await db.delete(paymentsTable).where(eq(paymentsTable.referenceId, id));
  await db.delete(expensesTable).where(eq(expensesTable.id, id));
  return res.json({ success: true });
});

export default router;
