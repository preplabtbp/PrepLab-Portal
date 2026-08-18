const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Replace the require with import at the top
code = code.replace(/import \{ eq, desc, or, inArray \} from "drizzle-orm";/, 'import { eq, desc, or, inArray, isNull } from "drizzle-orm";');
code = code.replace(/const \{ isNull \} = require\('drizzle-orm'\);/, '');

fs.writeFileSync('server.ts', code);
console.log("Patched isNull import");
