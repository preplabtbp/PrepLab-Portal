const fs = require('fs');
let code = fs.readFileSync('src/components/InspectorSignatures.tsx', 'utf8');

code = code.replace(
  /canvasProps=\{\{ className: 'w-full h-40 rounded-xl' \}\} /g,
  "clearOnResize={false}\n                canvasProps={{ className: 'w-full h-40 rounded-xl' }} "
);

fs.writeFileSync('src/components/InspectorSignatures.tsx', code);
