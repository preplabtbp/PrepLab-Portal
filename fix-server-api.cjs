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
      todayDate.setHours(0,0,0,0);
      
      const result = allEmps.map(emp => {
        const sched = rosterByNik[emp.nik] || {};
        
        let lastTrvDate = null;
        const sortedDates = Object.keys(sched).sort((a,b) => new Date(b).getTime() - new Date(a).getTime());
        for (const date of sortedDates) {
          if (new Date(date) <= todayDate && (sched[date] === 'TRV' || sched[date] === 'C')) {
            lastTrvDate = date;
            break;
          }
        }
        
        // Generate next 7 days schedule
        const next7Days = [];
        const iterDate = new Date();
        for (let i = 0; i < 7; i++) {
          const dStr = iterDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }); // e.g. "18 Jul 26" format depends, but our csv has "1 Jan 26"
          
          // Let's use a function to format matching CSV date format: D MMM YY
          const parts = iterDate.toDateString().split(' '); // Thu Jul 18 2026 -> ["Thu", "Jul", "18", "2026"]
          const day = parseInt(parts[2], 10);
          const formattedDate = day + ' ' + parts[1] + ' ' + parts[3].substring(2); // "18 Jul 26"
          
          const shiftCode = sched[formattedDate] || '-';
          next7Days.push({
            day: parts[0],
            date: formattedDate,
            shiftCode: shiftCode
          });
          iterDate.setDate(iterDate.getDate() + 1);
        }
        
        return {
          nik: emp.nik,
          name: emp.name,
          jabatan: emp.jabatan,
          department: emp.department || emp.section,
          section: emp.section,
          gol: emp.gol,
          jobGrade: emp.jobGrade,
          shift: emp.shift,
          poh: emp.poh,
          pt: emp.pt,
          statusMess: emp.statusMess,
          rotation: emp.rotation,
          joinDate: emp.tanggalAwalBergabung,
          statusKontrak: emp.statusKontrak,
          lastTrvDate: lastTrvDate,
          schedule: next7Days,
          fullSchedule: sched
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
