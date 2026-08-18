const fs = require('fs');
const files = [
  'gas-scripts/ModuleAPD.gs',
  'gas-scripts/ModulePemantauan.gs',
  'gas-scripts/ModuleRoster.gs',
  'gas-scripts/ModuleWO.gs'
];
let code = '';
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  // remove doPost from ModuleRoster
  if (f === 'gas-scripts/ModuleRoster.gs') {
    content = content.replace(/function doPost\(e\) \{[\s\S]*?\}\n\nfunction getColumnIndex/, 'function getColumnIndex');
  }
  code += content + '\n\n';
});

let router = fs.readFileSync('gas-scripts/Router.gs', 'utf8');
// add loginEmployee and getRosterData to switch
router = router.replace('case "createWO":', 'case "loginEmployee": result = handleLogin(payload.data); break;\n      case "getRosterData": result = handleGetRoster(payload.data); break;\n      case "createWO":');

fs.writeFileSync('gas-scripts/Code.gs', router + '\n\n' + code);
