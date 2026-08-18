const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
let open = 0;
for (let i = 0; i < code.length; i++) {
  if (code[i] === '{') open++;
  if (code[i] === '}') open--;
}
console.log("Unbalanced braces:", open);
