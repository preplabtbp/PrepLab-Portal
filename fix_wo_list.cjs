const fs = require('fs');
let code = fs.readFileSync('src/components/wo-list-screen.tsx', 'utf8');

const replacement = `  });
  
  const sortedPermintaanData = [...ticketData].reverse().sort((a, b) => {
     const statusA = isCompleted(a.Status) ? 1 : 0;
     const statusB = isCompleted(b.Status) ? 1 : 0;
     return statusA - statusB;
  });

  return (`

code = code.replace("  });\n  return (", replacement);
fs.writeFileSync('src/components/wo-list-screen.tsx', code);
