import { Router } from "express";
import { db, paymentsTable, expensesTable, usersTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

router.get("/", requireAuth, async (req, res) => {
  const currentUser = (req as any).user;
  const month = getCurrentMonth();

  const allPayments = await db.select().from(paymentsTable).where(eq(paymentsTable.month, month));
  const myPayments = allPayments.filter(p => p.userId === currentUser.id);
  const myPendingBalance = myPayments
    .filter(p => p.status !== "verified")
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const totalMonthlyExpenses = allPayments
    .filter(p => p.referenceType === "expense")
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  // Fetch all users for name lookups
  const allUsers = await db.select({ id: usersTable.id, displayName: usersTable.displayName }).from(usersTable);
  const userMap = Object.fromEntries(allUsers.map(u => [u.id, u.displayName]));

  const recentExpenses = await db.select().from(expensesTable).orderBy(expensesTable.createdAt);

  const recentActivity = [
    ...recentExpenses.slice(-5).map(e => ({
      id: `expense-${e.id}`,
      type: "expense",
      description: `added "${e.description}" — ${formatCurrency(parseFloat(e.amount))} split among roommates`,
      user: userMap[e.addedBy] || "Someone",
      timestamp: e.createdAt,
    })),
    ...allPayments.filter(p => p.status === "verified" && p.verifiedAt).map(p => ({
      id: `payment-${p.id}`,
      type: "payment_verified",
      description: `verified ${userMap[p.userId] || "someone"}'s payment for ${p.description} (${formatCurrency(parseFloat(p.amount))})`,
      user: "Verified",
      timestamp: p.verifiedAt!,
    })),
    ...allPayments.filter(p => p.status === "paid_unverified" && p.paidAt).map(p => ({
      id: `paid-${p.id}`,
      type: "payment_submitted",
      description: `marked ${formatCurrency(parseFloat(p.amount))} as paid for ${p.description}`,
      user: userMap[p.userId] || "Someone",
      timestamp: p.paidAt!,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

  let actionsNeeded: any[] = [];

  const isAdmin = currentUser.role === "admin";
  const isRoommatePlus = currentUser.role === "roommate_plus";

  if (isAdmin) {
    // Admin sees all pending verifications across rent, bills, and expenses
    const pendingVerification = allPayments.filter(p => p.status === "paid_unverified");
    actionsNeeded = pendingVerification.map(p => ({
      id: `verify-${p.id}`,
      type: "verify_payment",
      description: `${userMap[p.userId] || "Someone"} paid ${p.description} — needs verification`,
      amount: parseFloat(p.amount),
      paymentId: p.id,
    }));
  } else if (isRoommatePlus) {
    // Roommate+ only verifies bill payments (not rent, not expenses unless they added them)
    const pendingBills = allPayments.filter(p => p.status === "paid_unverified" && p.referenceType === "bill");
    actionsNeeded = pendingBills.map(p => ({
      id: `verify-${p.id}`,
      type: "verify_payment",
      description: `${userMap[p.userId] || "Someone"} paid ${p.description} — needs verification`,
      amount: parseFloat(p.amount),
      paymentId: p.id,
    }));
    // Also show their own unpaid items
    const myPending = myPayments.filter(p => p.status === "pending");
    actionsNeeded.push(...myPending.map(p => ({
      id: `pay-${p.id}`,
      type: "make_payment",
      description: `You owe ${formatCurrency(parseFloat(p.amount))} for ${p.description}`,
      amount: parseFloat(p.amount),
      paymentId: p.id,
    })));
  } else {
    // Regular roommate: show their own pending payments
    const myPending = myPayments.filter(p => p.status === "pending");
    actionsNeeded = myPending.map(p => ({
      id: `pay-${p.id}`,
      type: "make_payment",
      description: `You owe ${formatCurrency(parseFloat(p.amount))} for ${p.description}`,
      amount: parseFloat(p.amount),
      paymentId: p.id,
    }));
  }

  return res.json({
    myPendingBalance: Math.round(myPendingBalance * 100) / 100,
    totalMonthlyExpenses: Math.round(totalMonthlyExpenses * 100) / 100,
    recentActivity,
    actionsNeeded,
    currentMonth: month,
  });
});

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export default router;
