const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
const lines = code.split('\n');
let open = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    if (line[j] === '{') open++;
    if (line[j] === '}') open--;
  }
  if (open < 0) {
    console.log(`Extra } at line ${i+1}`);
    break;
  }
  if (line.startsWith('app.post(') || line.startsWith('app.get(') || line.startsWith('app.put(') || line.startsWith('app.delete(')) {
    if (open !== 2) {
       console.log(`Weird state at line ${i+1} (open=${open}): ${line}`);
    }
  }
}
console.log("Final open:", open);
