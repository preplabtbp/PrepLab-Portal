const fs = require('fs');
const env = process.env;
const keys = ['GEMINI_API_KEY', 'GCP_PROJECT_ID', 'GCP_LOCATION', 'SQL_HOST', 'SQL_USER', 'SQL_PASSWORD', 'SQL_DB_NAME', 'DATABASE_URL', 'FONNTE_TOKEN', 'FONNTE_TARGET', 'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'];

let str = '';
for (const key of keys) {
  if (env[key]) {
    // Escape double quotes inside the value
    const val = env[key].replace(/"/g, '\\"');
    str += `${key}: "${val}"\n`;
  }
}

fs.writeFileSync('env.yaml', str);
console.log('env.yaml created');
