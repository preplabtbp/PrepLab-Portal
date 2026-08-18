const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace("</Suspense>{activeTab === 'home'", '<Suspense fallback={<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>\n        {activeTab === \'home\'');

code = code.replace("</main>", "</Suspense>\n      </main>");

fs.writeFileSync('src/App.tsx', code);
