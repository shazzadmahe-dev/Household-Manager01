import { Router } from "express";
import { db, rentSettingsTable, usersTable, paymentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

router.get("/", requireAuth, async (_req, res) => {
  const settings = await db
    .select()
    .from(rentSettingsTable)
    .leftJoin(usersTable, eq(rentSettingsTable.userId, usersTable.id));

  return res.json(
    settings.map((s) => ({
      id: s.rent_settings.id,
      userId: s.rent_settings.userId,
      amount: parseFloat(s.rent_settings.amount),
      dueDay: s.rent_settings.dueDay,
      user: s.users
        ? {
            id: s.users.id,
            username: s.users.username,
            displayName: s.users.displayName,
            role: s.users.role,
            createdAt: s.users.createdAt,
          }
        : null,
    }))
  );
});

router.put("/", requireAdmin, async (req, res) => {
  const updates: Array<{ userId: number; amount: number; dueDay: number }> = req.body;
  const month = getCurrentMonth();

  const results = [];
  for (const update of updates) {
    const [setting] = await db
      .insert(rentSettingsTable)
      .values({
        userId: update.userId,
        amount: String(update.amount),
        dueDay: update.dueDay,
      })
      .onConflictDoUpdate({
        target: rentSettingsTable.userId,
        set: { amount: String(update.amount), dueDay: update.dueDay, updatedAt: new Date() },
      })
      .returning();

    const user = await db.select().from(usersTable).where(eq(usersTable.id, update.userId)).limit(1);

    const existingPayment = await db
      .select()
      .from(paymentsTable)
      .where(
        eq(paymentsTable.userId, update.userId)
      )
      .then((payments) => payments.find((p) => p.referenceType === "rent" && p.month === month));

    if (!existingPayment && update.amount > 0) {
      await db.insert(paymentsTable).values({
        userId: update.userId,
        referenceType: "rent",
        referenceId: setting.id,
        amount: String(update.amount),
        status: "pending",
        month,
        description: `Rent - ${month}`,
      });
    } else if (existingPayment && existingPayment.status === "pending") {
      await db
        .update(paymentsTable)
        .set({ amount: String(update.amount) })
        .where(eq(paymentsTable.id, existingPayment.id));
    }

    results.push({
      id: setting.id,
      userId: setting.userId,
      amount: parseFloat(setting.amount),
      dueDay: setting.dueDay,
      user: user[0]
        ? {
            id: user[0].id,
            username: user[0].username,
            displayName: user[0].displayName,
            role: user[0].role,
            createdAt: user[0].createdAt,
          }
        : null,
    });
  }

  return res.json(results);
});

export default router;
