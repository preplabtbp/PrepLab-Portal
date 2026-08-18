const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const helper = `
// --- Multi-Tenancy (Universe) Helper ---
function getUniverse(pt) {
  if (!pt) return 'TBP_GPS';
  const ptUpper = pt.toUpperCase();
  if (ptUpper.includes('GTS')) return 'GTS';
  return 'TBP_GPS';
}
`;

if (!code.includes("function getUniverse")) {
    code = code.replace("async function startServer() {", helper + "\nasync function startServer() {");
}

// 1. Roster filter
const rosterTarget = `      const allEmps = await db.select().from(employees);
      const allRoster = await db.select().from(roster);`;

const rosterReplace = `      const reqUniverse = getUniverse(req.query.pt || req.headers['x-user-pt']);
      let allEmps = await db.select().from(employees);
      allEmps = allEmps.filter(e => getUniverse(e.pt) === reqUniverse);
      const allRoster = await db.select().from(roster);`;
code = code.replace(rosterTarget, rosterReplace);

// 2. Bulletin API (GET)
const bulletinGetTarget = `    app.get("/api/bulletin", async (req, res) => {
    try {
      const { category, search } = req.query;`;

const bulletinGetReplace = `    app.get("/api/bulletin", async (req, res) => {
    try {
      const { category, search, pt } = req.query;
      const reqUniverse = getUniverse(pt || req.headers['x-user-pt']);`;
code = code.replace(bulletinGetTarget, bulletinGetReplace);

const bulletinQueryTarget = `let query = db.select({
        id: bulletinPosts.id,
        department: bulletinPosts.department,
        category: bulletinPosts.category,
        content: bulletinPosts.content,
        authorNik: bulletinPosts.authorNik,
        authorName: bulletinPosts.authorName,
        createdAt: bulletinPosts.createdAt,
        authorAvatar: employees.avatar
      }).from(bulletinPosts)
      .leftJoin(employees, eq(bulletinPosts.authorNik, employees.nik));`;
      
const bulletinQueryReplace = `let query = db.select({
        id: bulletinPosts.id,
        department: bulletinPosts.department,
        category: bulletinPosts.category,
        content: bulletinPosts.content,
        authorNik: bulletinPosts.authorNik,
        authorName: bulletinPosts.authorName,
        createdAt: bulletinPosts.createdAt,
        authorAvatar: employees.avatar,
        universe: bulletinPosts.universe
      }).from(bulletinPosts)
      .leftJoin(employees, eq(bulletinPosts.authorNik, employees.nik))
      .where(eq(bulletinPosts.universe, reqUniverse));`;
// Note: using .where() here might conflict with existing where clauses. Let's look closer at the bulletin GET in server.ts.
