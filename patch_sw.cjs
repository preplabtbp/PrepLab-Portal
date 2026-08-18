const fs = require('fs');
let code = fs.readFileSync('public/sw.js', 'utf8');

code = code.replace(
  /self\.registration\.showNotification\(data\.title, options\)/,
  `self.registration.showNotification(data.title, options).then(() => {
        return self.clients.matchAll();
      }).then(clients => {
        clients.forEach(client => client.postMessage({ type: 'PUSH_RECEIVED', data: data }));
      })`
);

fs.writeFileSync('public/sw.js', code);
console.log("Patched SW");
