import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../src/db/index.js";
import { employees } from "../../src/db/schema.js";
import { toPublicEmployee } from "../middleware/auth.js";

export const employeesRouter = Router();

employeesRouter.get("/", async (req, res) => {
  try {
    const { pt, all } = req.query;
    let data = await db.select().from(employees);

    // Strictly exclude demo, staging, admin and broken spreadsheet accounts
    data = data.filter(e => {
      const nik = (e.nik || '').toString().toUpperCase();
      const name = (e.name || '').toString().toLowerCase();
      const username = (e.username || '').toString().toLowerCase();
      if (
        nik === 'DEMO123' || nik === 'DEMO' || nik.includes('DEMO') ||
        name.includes('user demo') || name.includes('demo staging') || name.includes('staging') ||
        username.includes('demo') || username.includes('staging') ||
        nik === 'PREPLABADMIN' || nik.includes('#N/A') || name.includes('#N/A')
      ) {
        return false;
      }
      return true;
    });

    if (all !== 'true') {
      const isGtsReq = (pt || '').toString().trim().toUpperCase() === 'GTS';
      if (isGtsReq) {
        data = data.filter(e => {
          const ptStr = (e.pt || '').toString().trim().toUpperCase();
          const nikStr = (e.nik || '').toString().trim().toUpperCase();
          return ptStr === 'GTS' || nikStr.startsWith('03') || nikStr.startsWith('M03');
        });
      } else {
        // TBP & GPS -> Strictly exclude GTS employees (check pt AND NIK prefix 03/M03)
        data = data.filter(e => {
          const ptStr = (e.pt || '').toString().trim().toUpperCase();
          const nikStr = (e.nik || '').toString().trim().toUpperCase();
          const isGts = ptStr === 'GTS' || nikStr.startsWith('03') || nikStr.startsWith('M03');
          return !isGts;
        });
      }
    }

    res.json(data.map(e => toPublicEmployee(e)));
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});

employeesRouter.get("/hierarchy/:nik", async (req, res) => {
  try {
    const { nik } = req.params;
    const userResult = await db.select().from(employees).where(eq(employees.nik, nik)).limit(1);
    
    if (userResult.length === 0) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }
    
    const user = userResult[0];
    const sectionLower = (user.section || "").toLowerCase();
    const deptLower = (user.department || "").toLowerCase();
    const jabatanLower = (user.jabatan || "").toLowerCase();
    
    // Check if user is Admin, Administrasi or QA (Admin can see all)
    if (sectionLower.includes("administrasi") || deptLower.includes("administrasi") || 
        sectionLower.includes("qa") || deptLower.includes("qa") || sectionLower.includes("quality assurance") || deptLower.includes("quality assurance") ||
        jabatanLower.includes("admin")) {
      const allData = await db.select().from(employees);
      return res.json({ status: "success", data: allData.map(e => toPublicEmployee(e)) });
    }
    
    // Determine subordinates based on Jabatan
    let allowedJabatans: string[] = [];
    if (jabatanLower.includes("manager") || jabatanLower.includes("superintendent")) {
      allowedJabatans = ["supervisor", "foreman", "crew", "operator", "staff", "analyst", "technician", "admin"];
    } else if (jabatanLower.includes("supervisor")) {
      allowedJabatans = ["foreman", "crew", "operator", "staff", "analyst", "technician", "admin"];
    } else if (jabatanLower.includes("foreman")) {
      allowedJabatans = ["crew", "operator", "staff", "analyst", "technician", "admin"];
    }
    
    if (allowedJabatans.length === 0) {
      // Crew or someone with no subordinates
      return res.json({ status: "success", data: [toPublicEmployee(user)] });
    }
    
    // Fetch all employees
    const allEmployees = await db.select().from(employees);
    const subordinates = allEmployees.filter(e => {
      const eSection = (e.section || "").toLowerCase();
      const eDept = (e.department || "").toLowerCase();
      const isSameDept = (deptLower && eDept === deptLower) || (sectionLower && eSection === sectionLower);
      if (!isSameDept) return false;
      
      const eJabatan = (e.jabatan || "").toLowerCase();
      return allowedJabatans.some(allowed => eJabatan.includes(allowed));
    });
    
    // Always include themselves
    if (!subordinates.find(s => s.nik === user.nik)) {
      subordinates.unshift(user);
    }
    
    res.json({ status: "success", data: subordinates.map(e => toPublicEmployee(e)) });
  } catch (error) {
    console.error("Error fetching hierarchy:", error);
    res.status(500).json({ status: "error", message: "Failed to fetch hierarchy" });
  }
});

employeesRouter.get("/:nik", async (req, res) => {
  try {
    const { nik } = req.params;
    const data = await db.select().from(employees).where(eq(employees.nik, nik)).limit(1);
    if (data.length > 0) {
      res.json({ status: "success", employee: toPublicEmployee(data[0]) });
    } else {
      res.status(404).json({ status: "error", message: "Karyawan tidak ditemukan" });
    }
  } catch (error) {
    console.error("Error fetching employee:", error);
    res.status(500).json({ status: "error", message: "Failed to fetch employee" });
  }
});

employeesRouter.post("/", async (req, res) => {
  try {
    const result = await db.insert(employees).values(req.body).returning();
    res.status(201).json(toPublicEmployee(result[0]));
  } catch (error) {
    console.error("Error creating employee:", error);
    res.status(500).json({ error: "Failed to create employee" });
  }
});

employeesRouter.post("/avatar", async (req, res) => {
  try {
    const { nik, avatar } = req.body;
    if (!nik) {
      return res.status(400).json({ status: "error", message: "NIK required" });
    }
    const result = await db.update(employees)
      .set({ avatar: avatar || null })
      .where(eq(employees.nik, nik))
      .returning();
    return res.json({ status: "success", employee: toPublicEmployee(result[0]) || null });
  } catch (error) {
    console.error("Error updating avatar:", error);
    res.status(500).json({ status: "error", message: "Failed to update avatar" });
  }
});

employeesRouter.post("/cover", async (req, res) => {
  try {
    const { nik, cover } = req.body;
    if (!nik) {
      return res.status(400).json({ status: "error", message: "NIK required" });
    }
    const result = await db.update(employees)
      .set({ cover: cover || null })
      .where(eq(employees.nik, nik))
      .returning();
    return res.json({ status: "success", employee: toPublicEmployee(result[0]) || null });
  } catch (error) {
    console.error("Error updating cover:", error);
    res.status(500).json({ status: "error", message: "Failed to update cover" });
  }
});
