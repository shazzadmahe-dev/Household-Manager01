import { Router } from "express";
import { db, chatMessagesTable, usersTable } from "@workspace/db";
import { eq, gte } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

async function buildMessage(m: typeof chatMessagesTable.$inferSelect) {
  const [user] = await db.select({ id: usersTable.id, username: usersTable.username, displayName: usersTable.displayName, role: usersTable.role, createdAt: usersTable.createdAt })
    .from(usersTable).where(eq(usersTable.id, m.userId)).limit(1);
  return {
    id: m.id,
    userId: m.userId,
    user: user || null,
    message: m.message,
    createdAt: m.createdAt,
  };
}

router.get("/", requireAuth, async (_req, res) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const messages = await db.select().from(chatMessagesTable)
    .where(gte(chatMessagesTable.createdAt, sevenDaysAgo))
    .orderBy(chatMessagesTable.createdAt);
  const result = await Promise.all(messages.map(buildMessage));
  return res.json(result);
});

router.post("/", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { message } = req.body;
  if (!message?.trim()) {
    return res.status(400).json({ error: "Message cannot be empty" });
  }

  const [msg] = await db.insert(chatMessagesTable).values({
    userId: user.id,
    message: message.trim(),
  }).returning();

  return res.status(201).json(await buildMessage(msg));
});

router.delete("/:id", requireAuth, async (req, res) => {
  const currentUser = (req as any).user;
  const id = parseInt(req.params.id);

  const [msg] = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.id, id)).limit(1);
  if (!msg) return res.status(404).json({ error: "Message not found" });
  if (msg.userId !== currentUser.id && currentUser.role !== "admin") {
    return res.status(403).json({ error: "Not authorized" });
  }

  await db.delete(chatMessagesTable).where(eq(chatMessagesTable.id, id));
  return res.json({ success: true });
});

export default router;
