import { Router } from "express";
import { eq, sql, and } from "drizzle-orm";
import { db } from "../../src/db/index.js";
import { employees, portalLogins } from "../../src/db/schema.js";

export const userPreferencesRouter = Router();

// GET /api/user/daily-greeting-status?nik=...
userPreferencesRouter.get("/daily-greeting-status", async (req, res) => {
  try {
    const nik = (req.query.nik as string || "").trim().toUpperCase();
    if (!nik) {
      return res.json({ status: "success", shouldShow: false, reason: "No NIK provided" });
    }

    // Determine current Jayapura/WIT date string 'YYYY-MM-DD'
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jayapura' });

    // Check portal_logins for today
    const loginRows = await db.select({
      id: portalLogins.id,
      greetingShown: portalLogins.greetingShown
    })
    .from(portalLogins)
    .where(and(
      sql`UPPER(${portalLogins.nik}) = ${nik}`,
      eq(portalLogins.loginDate, todayStr)
    ))
    .limit(1);

    const hour = parseInt(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', timeZone: 'Asia/Jayapura' }), 10);
    const greetingType = hour >= 4 && hour < 11 ? 'morning' : (hour >= 11 && hour < 15 ? 'noon' : (hour >= 15 && hour < 18 ? 'evening' : 'night'));

    if (loginRows.length === 0) {
      // User hasn't recorded greeting yet today -> should show
      return res.json({
        status: "success",
        shouldShow: true,
        greetingType,
        date: todayStr
      });
    }

    const row = loginRows[0];
    const shouldShow = !row.greetingShown;

    return res.json({
      status: "success",
      shouldShow,
      greetingType,
      date: todayStr
    });
  } catch (err: any) {
    console.error("Error checking daily greeting status:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

// POST /api/user/daily-greeting-mark { nik: '...' }
userPreferencesRouter.post("/daily-greeting-mark", async (req, res) => {
  try {
    const { nik } = req.body;
    if (!nik) {
      return res.status(400).json({ status: "error", message: "NIK is required" });
    }
    const cleanNik = String(nik).trim().toUpperCase();
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jayapura' });

    // Insert or update on conflict
    await db.insert(portalLogins)
      .values({
        nik: cleanNik,
        loginDate: todayStr,
        greetingShown: true,
        greetingShownAt: now
      })
      .onConflictDoUpdate({
        target: [portalLogins.nik, portalLogins.loginDate],
        set: {
          greetingShown: true,
          greetingShownAt: now
        }
      });

    return res.json({ status: "success", message: "Daily greeting marked as shown" });
  } catch (err: any) {
    console.error("Error marking daily greeting:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

// In-memory fallback for demo/virtual accounts not present in employees table
const demoTutorialCompleted = new Set<string>();

// GET /api/user/tutorial-status?nik=...
userPreferencesRouter.get("/tutorial-status", async (req, res) => {
  try {
    const nik = (req.query.nik as string || "").trim().toUpperCase();
    if (!nik) {
      return res.json({ status: "success", completed: false });
    }

    if (demoTutorialCompleted.has(nik)) {
      return res.json({ status: "success", completed: true });
    }

    const emp = await db.select({
      homeTutorialCompleted: employees.homeTutorialCompleted
    })
    .from(employees)
    .where(sql`UPPER(${employees.nik}) = ${nik}`)
    .limit(1);

    if (emp.length === 0) {
      return res.json({ status: "success", completed: demoTutorialCompleted.has(nik) });
    }

    return res.json({
      status: "success",
      completed: Boolean(emp[0].homeTutorialCompleted)
    });
  } catch (err: any) {
    console.error("Error checking tutorial status:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

// POST /api/user/tutorial-complete { nik: '...' }
userPreferencesRouter.post("/tutorial-complete", async (req, res) => {
  try {
    const { nik } = req.body;
    if (!nik) {
      return res.status(400).json({ status: "error", message: "NIK is required" });
    }
    const cleanNik = String(nik).trim().toUpperCase();
    demoTutorialCompleted.add(cleanNik);

    await db.update(employees)
      .set({ homeTutorialCompleted: true })
      .where(sql`UPPER(${employees.nik}) = ${cleanNik}`);

    return res.json({ status: "success", message: "Tutorial marked as completed" });
  } catch (err: any) {
    console.error("Error completing tutorial:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
});
