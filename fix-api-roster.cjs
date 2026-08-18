const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const newApi = `  app.get("/api/roster", async (req, res) => {
    try {
      const allEmps = await db.select().from(employees);
      const allRoster = await db.select().from(roster);
      
      const rosterByNik = {};
      for (const r of allRoster) {
        if (!rosterByNik[r.nik]) rosterByNik[r.nik] = {};
        rosterByNik[r.nik][r.date] = r.status;
      }
      
      const todayDate = new Date();
      
      const result = allEmps.map(emp => {
        const sched = rosterByNik[emp.nik] || {};
        
        // Find last TRV date
        let lastTrvDate = null;
        const sortedDates = Object.keys(sched).sort((a,b) => new Date(b).getTime() - new Date(a).getTime());
        for (const date of sortedDates) {
          if (new Date(date) < todayDate && sched[date] === 'TRV') {
            lastTrvDate = date;
            break;
          }
        }
        
        return {
          nik: emp.nik,
          nama: emp.name,
          jabatan: emp.jabatan,
          departemen: emp.department || emp.section, // fallback if section is stored
          section: emp.section,
          gol: emp.gol,
          jobGrade: emp.jobGrade,
          shift: emp.shift,
          poh: emp.poh,
          pt: emp.pt,
          statusMess: emp.statusMess,
          rotation: emp.rotation,
          tanggalAwalBergabung: emp.tanggalAwalBergabung,
          statusKontrak: emp.statusKontrak,
          lastTrvDate: lastTrvDate,
          schedule: sched, // provide schedule mapping
        };
      });
      
      res.json(result);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch roster" });
    }
  });`;

code = code.replace(
  /app\.get\("\/api\/roster", async \(req, res\) => \{[\s\S]*?\}\);/,
  newApi
);

fs.writeFileSync('server.ts', code);
