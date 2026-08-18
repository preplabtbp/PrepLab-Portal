const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /const ctx = new AudioContext\(\);/,
  "const ctx = new AudioContext();\n        if (ctx.state === 'suspended') await ctx.resume();"
);

code = code.replace(
  /const playNotificationSound = \(\) => \{/,
  "const playNotificationSound = async () => {"
);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched audio context");
