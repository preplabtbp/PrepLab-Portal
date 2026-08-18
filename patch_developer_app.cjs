const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Change DB Admin label to Developer
code = code.replace(/label="DB Admin"/g, 'label="Developer"');
fs.writeFileSync('src/App.tsx', code);

let homeCode = fs.readFileSync('src/components/home-screen.tsx', 'utf8');
homeCode = homeCode.replace(/title: "DB Admin"/g, 'title: "Developer"');
homeCode = homeCode.replace(/const isAdmin = inspectorNik/g, 'const isDeveloper = inspectorNik');
// replace ...(isAdmin ? [ to ...(isDeveloper ? [
homeCode = homeCode.replace(/\.\.\.\(isAdmin \? \[/g, '...(isDeveloper ? [');
fs.writeFileSync('src/components/home-screen.tsx', homeCode);

console.log("Patched Developer labels");
