const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetAdd = `      const result = await db.insert(t as any).values(payload).returning();
      res.json(result[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }`;

const replaceAdd = `      const result = await db.insert(t as any).values(payload).returning();
      res.json(result[0]);
    } catch (e: any) { 
       console.error("DB Error:", e);
       res.status(500).json({ error: e.detail || e.message }); 
    }`;

code = code.replace(targetAdd, replaceAdd);
fs.writeFileSync('server.ts', code);
console.log("Patched server.ts error handling");
