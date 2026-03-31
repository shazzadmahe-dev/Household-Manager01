import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, rentSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();

router.get("/", requireAuth, async (_req, res) => {
  const users = await db.select({
    id: usersTable.id,
    username: usersTable.username,
    displayName: usersTable.displayName,
    role: usersTable.role,
    createdAt: usersTable.createdAt,
  }).from(usersTable).orderBy(usersTable.createdAt);
  return res.json(users);
});

router.post("/", requireAdmin, async (req, res) => {
  const { username, displayName, password, role } = req.body;
  if (!username || !displayName || !password) {
    return res.status(400).json({ error: "Username, display name and password required" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({
    username,
    displayName,
    passwordHash,
    role: role || "roommate",
  }).returning({
    id: usersTable.id,
    username: usersTable.username,
    displayName: usersTable.displayName,
    role: usersTable.role,
    createdAt: usersTable.createdAt,
  });

  await db.insert(rentSettingsTable).values({
    userId: user.id,
    amount: "0",
    dueDay: 1,
  }).onConflictDoNothing();

  return res.status(201).json(user);
});

router.put("/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { displayName, password, role } = req.body;
  const updates: Record<string, unknown> = {};
  if (displayName) updates.displayName = displayName;
  if (role) updates.role = role;
  if (password) updates.passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning({
    id: usersTable.id,
    username: usersTable.username,
    displayName: usersTable.displayName,
    role: usersTable.role,
    createdAt: usersTable.createdAt,
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json(user);
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(usersTable).where(eq(usersTable.id, id));
  return res.json({ success: true });
});

export default router;
