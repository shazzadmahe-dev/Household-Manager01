import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

const router = Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  const user = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (!user[0]) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user[0].passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  req.session.userId = user[0].id;
  return res.json({
    user: {
      id: user[0].id,
      username: user[0].username,
      displayName: user[0].displayName,
      role: user[0].role,
      createdAt: user[0].createdAt,
    },
  });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

router.get("/me", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const user = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId)).limit(1);
  if (!user[0]) {
    return res.status(401).json({ error: "User not found" });
  }
  return res.json({
    id: user[0].id,
    username: user[0].username,
    displayName: user[0].displayName,
    role: user[0].role,
    createdAt: user[0].createdAt,
  });
});

export default router;
