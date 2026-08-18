const fs = require('fs');
let code = fs.readFileSync('src/components/preplab-cloud-screen.tsx', 'utf-8');

code = code.replace(/    <\/div>\n  \);\n\}/g, '      </div>\n    </div>\n  );\n}');

fs.writeFileSync('src/components/preplab-cloud-screen.tsx', code);
