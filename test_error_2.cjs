const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetEdit = `      const result = await db.update(t as any).set(payload).where(eq((t as any).id, idValue)).returning();
      res.json(result[0] || {});
    } catch (e) { res.status(500).json({ error: e.message }); }`;

const replaceEdit = `      const result = await db.update(t as any).set(payload).where(eq((t as any).id, idValue)).returning();
      res.json(result[0] || {});
    } catch (e: any) { res.status(500).json({ error: e.detail || e.message }); }`;

code = code.replace(targetEdit, replaceEdit);
fs.writeFileSync('server.ts', code);
console.log("Patched PUT error handling");
