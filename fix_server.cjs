const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Remove injected ticketSchema
code = code.replace(/const ticketSchema = z\.object\(\{[\s\S]*?\}\)\.passthrough\(\);\n/g, '');

// Remove injected workOrderSchema
code = code.replace(/const workOrderSchema = z\.object\(\{[\s\S]*?\}\)\.passthrough\(\);\n/g, '');

// Replace newWO validation block back to normal
code = code.replace(
  /const validation = workOrderSchema\.safeParse\(req\.body\);\s*if \(\!validation\.success\) \{\s*return res\.status\(400\)\.json\(\{ error: validation\.error\.format\(\) \}\);\s*\}\s*const newWO = validation\.data;/g,
  'const newWO = req.body;'
);

// Replace newTicket validation block back to normal
code = code.replace(
  /const validation = ticketSchema\.safeParse\(req\.body\);\s*if \(\!validation\.success\) \{\s*return res\.status\(400\)\.json\(\{ error: validation\.error\.format\(\) \}\);\s*\}\s*const newTicket = validation\.data;/g,
  'const newTicket = req.body;'
);

fs.writeFileSync('server.ts', code);
