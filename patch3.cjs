const fs = require('fs');
let code = fs.readFileSync('src/components/quiz-admin-screen.tsx', 'utf-8');

code = code.replace(
  "{(!selectedCategory && (userSection?.toLowerCase().includes('qa') || userSection?.toLowerCase().includes('quality assurance'))) && (",
  "{!selectedCategory && ("
);

fs.writeFileSync('src/components/quiz-admin-screen.tsx', code);
