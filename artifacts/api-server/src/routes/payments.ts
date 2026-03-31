import { Router } from "express";
import { db, paymentsTable, usersTable, expensesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

async function buildPayment(p: typeof paymentsTable.$inferSelect) {
  const [user] = await db.select({ id: usersTable.id, username: usersTable.username, displayName: usersTable.displayName, role: usersTable.role, createdAt: usersTable.createdAt })
    .from(usersTable).where(eq(usersTable.id, p.userId)).limit(1);
  return {
    id: p.id,
    userId: p.userId,
    user: user || null,
    referenceType: p.referenceType,
    referenceId: p.referenceId,
    amount: parseFloat(p.amount),
    status: p.status,
    month: p.month,
    description: p.description,
    paidAt: p.paidAt,
    verifiedAt: p.verifiedAt,
  };
}

// All authenticated users can see all payments (needed for transparency in shared house)
router.get("/", requireAuth, async (_req, res) => {
  const payments = await db.select().from(paymentsTable).orderBy(paymentsTable.createdAt);
  const result = await Promise.all(payments.map(buildPayment));
  return res.json(result);
});

router.post("/:id/mark-paid", requireAuth, async (req, res) => {
  const currentUser = (req as any).user;
  const id = parseInt(req.params.id);

  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, id)).limit(1);
  if (!payment) return res.status(404).json({ error: "Payment not found" });
  if (payment.userId !== currentUser.id && currentUser.role !== "admin") {
    return res.status(403).json({ error: "Not authorized" });
  }

  const [updated] = await db.update(paymentsTable).set({
    status: "paid_unverified",
    paidAt: new Date(),
  }).where(eq(paymentsTable.id, id)).returning();

  return res.json(await buildPayment(updated));
});

router.post("/:id/verify", requireAuth, async (req, res) => {
  const currentUser = (req as any).user;
  const id = parseInt(req.params.id);

  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, id)).limit(1);
  if (!payment) return res.status(404).json({ error: "Payment not found" });

  let canVerify = false;

  if (payment.referenceType === "rent") {
    // Only admin can verify rent
    canVerify = currentUser.role === "admin";
  } else if (payment.referenceType === "bill") {
    // Admin and roommate_plus can verify bills
    canVerify = currentUser.role === "admin" || currentUser.role === "roommate_plus";
  } else if (payment.referenceType === "expense") {
    // Admin or the person who added the expense can verify
    canVerify = currentUser.role === "admin";
    if (!canVerify) {
      const [expense] = await db.select().from(expensesTable).where(eq(expensesTable.id, payment.referenceId)).limit(1);
      if (expense && expense.addedBy === currentUser.id) {
        canVerify = true;
      }
    }
  }

  if (!canVerify) {
    return res.status(403).json({ error: "Not authorized to verify this payment" });
  }

  const [updated] = await db.update(paymentsTable).set({
    status: "verified",
    verifiedAt: new Date(),
  }).where(eq(paymentsTable.id, id)).returning();

  return res.json(await buildPayment(updated));
});

router.post("/:id/undo", requireAuth, async (req, res) => {
  const currentUser = (req as any).user;
  const id = parseInt(req.params.id);

  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, id)).limit(1);
  if (!payment) return res.status(404).json({ error: "Payment not found" });
  if (payment.userId !== currentUser.id && currentUser.role !== "admin") {
    return res.status(403).json({ error: "Not authorized" });
  }

  const [updated] = await db.update(paymentsTable).set({
    status: "pending",
    paidAt: null,
    verifiedAt: null,
  }).where(eq(paymentsTable.id, id)).returning();

  return res.json(await buildPayment(updated));
});

export default router;
