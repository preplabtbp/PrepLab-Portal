import { Router } from "express";
import { db } from "../../src/db/index.js";
import { employees } from "../../src/db/schema.js";
import { sql } from "drizzle-orm";

export const debugRouter = Router();
debugRouter.get("/db-info", async (req, res) => {
  try {
    const dbName = await db.execute(sql`SELECT current_database();`);
    const dbUser = await db.execute(sql`SELECT current_user;`);
    const empCount = await db.select({ count: sql<number>`count(*)` }).from(employees);
    res.json({
      env: {
        host: process.env.SQL_HOST,
        db: process.env.SQL_DB_NAME,
        user: process.env.SQL_USER,
      },
      dbName: dbName.rows?.[0] || dbName,
      dbUser: dbUser.rows?.[0] || dbUser,
      empCount: empCount,
    });
  } catch(e: any) {
    res.status(500).json({ error: e.message });
  }
});
