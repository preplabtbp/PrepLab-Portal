const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/**/*.tsx');
files.forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  if (code.includes('getTrimmedCanvas()')) {
    code = code.replace(/getTrimmedCanvas\(\)/g, 'getCanvas()');
    fs.writeFileSync(file, code);
    console.log('Fixed', file);
  }
});
