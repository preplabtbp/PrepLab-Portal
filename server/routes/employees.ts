import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../src/db/index.js";
import { employees } from "../../src/db/schema.js";

export const employeesRouter = Router();

employeesRouter.get("/", async (req, res) => {
  try {
    const { pt, all } = req.query;
    let data = await db.select().from(employees);

    if (all !== 'true') {
      if (pt === 'GTS') {
        data = data.filter(e => e.pt === 'GTS');
      } else {
        // TBP & GPS -> Strictly exclude GTS employees
        data = data.filter(e => e.pt !== 'GTS');
      }
    }

    res.json(data);
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
      return res.json({ status: "success", data: allData });
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
      return res.json({ status: "success", data: [user] });
    }
    
    // Fetch all employees
    const allEmployees = await db.select().from(employees);
    const subordinates = allEmployees.filter(e => {
      // Must be same section or department (if section is broad enough)
      const eSection = (e.section || "").toLowerCase();
      const eDept = (e.department || "").toLowerCase();
      const isSameDept = (deptLower && eDept === deptLower) || (sectionLower && eSection === sectionLower);
      if (!isSameDept) return false;
      
      const eJabatan = (e.jabatan || "").toLowerCase();
      // Check if eJabatan matches any of the allowed
      return allowedJabatans.some(allowed => eJabatan.includes(allowed));
    });
    
    // Always include themselves
    if (!subordinates.find(s => s.nik === user.nik)) {
      subordinates.unshift(user);
    }
    
    res.json({ status: "success", data: subordinates });
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
      res.json({ status: "success", employee: data[0] });
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
    res.status(201).json(result[0]);
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
    return res.json({ status: "success", employee: result[0] || null });
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
    return res.json({ status: "success", employee: result[0] || null });
  } catch (error) {
    console.error("Error updating cover:", error);
    res.status(500).json({ status: "error", message: "Failed to update cover" });
  }
});
