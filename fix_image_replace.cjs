const fs = require('fs');
let code = fs.readFileSync('google-services.ts', 'utf8');

// We will add a pre-processing step: 
// For each image tag, we add a replaceAllText request to make sure it's a single textRun.
// Wait, the existing code does:
/*
    // 2. Siapkan Request untuk Replace Text
    const requests = Object.entries(replacements).map(([tag, value]) => ({
*/
