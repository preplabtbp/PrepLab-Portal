const fs = require('fs');
const unzip = require('child_process').execSync;

try {
  unzip('mkdir -p db_out && unzip -o db.xlsx -d db_out');
  const workbookXml = fs.readFileSync('db_out/xl/workbook.xml', 'utf8');
  console.log("Sheets:", workbookXml.match(/<sheet[^>]*>/g));
} catch (e) {
  console.error(e.message);
}
