const fs = require('fs');
let code = fs.readFileSync('src/components/preplab-cloud-screen.tsx', 'utf-8');

const lastDiv = code.lastIndexOf('</div>');
code = code.substring(0, lastDiv) + '      </div>\n    </div>\n  );\n}';

fs.writeFileSync('src/components/preplab-cloud-screen.tsx', code);
