import { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const user = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId)).limit(1);
  if (!user[0]) {
    return res.status(401).json({ error: "User not found" });
  }
  (req as any).user = user[0];
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, () => {
    if ((req as any).user?.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  });
}

export async function requireAdminOrRoommatePlus(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, () => {
    const role = (req as any).user?.role;
    if (role !== "admin" && role !== "roommate_plus") {
      return res.status(403).json({ error: "Permission denied" });
    }
    next();
  });
}
