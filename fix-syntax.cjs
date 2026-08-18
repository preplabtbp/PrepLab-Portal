const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  `      res.status(500).json({ error: "Failed to save pemantauan" });
    }
  });    }
  });`,
  `      res.status(500).json({ error: "Failed to save pemantauan" });
    }
  });`
);

fs.writeFileSync('server.ts', code);
