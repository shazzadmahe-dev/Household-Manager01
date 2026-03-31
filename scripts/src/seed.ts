import bcrypt from "bcryptjs";
import { db, usersTable, rentSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  const adminExists = await db.select().from(usersTable).where(eq(usersTable.username, "admin")).limit(1);
  if (!adminExists[0]) {
    const adminHash = await bcrypt.hash("admin123", 10);
    const [admin] = await db.insert(usersTable).values({
      username: "admin",
      displayName: "Admin",
      passwordHash: adminHash,
      role: "admin",
    }).returning();
    await db.insert(rentSettingsTable).values({ userId: admin.id, amount: "0", dueDay: 1 }).onConflictDoNothing();
    console.log("Created admin user");
  }

  const alexExists = await db.select().from(usersTable).where(eq(usersTable.username, "alex")).limit(1);
  if (!alexExists[0]) {
    const alexHash = await bcrypt.hash("alex123", 10);
    const [alex] = await db.insert(usersTable).values({
      username: "alex",
      displayName: "Alex",
      passwordHash: alexHash,
      role: "roommate",
    }).returning();
    await db.insert(rentSettingsTable).values({ userId: alex.id, amount: "800", dueDay: 1 }).onConflictDoNothing();
    console.log("Created alex user");
  }

  const janeExists = await db.select().from(usersTable).where(eq(usersTable.username, "jane")).limit(1);
  if (!janeExists[0]) {
    const janeHash = await bcrypt.hash("jane123", 10);
    const [jane] = await db.insert(usersTable).values({
      username: "jane",
      displayName: "Jane",
      passwordHash: janeHash,
      role: "roommate",
    }).returning();
    await db.insert(rentSettingsTable).values({ userId: jane.id, amount: "750", dueDay: 1 }).onConflictDoNothing();
    console.log("Created jane user");
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
