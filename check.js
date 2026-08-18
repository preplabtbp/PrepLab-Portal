import { db, pool } from "./src/db/index.js";
async function run() {
  try {
    const res = await pool.query("SELECT * FROM chat_messages");
    console.log("Success");
  } catch(e) {
    console.log("Error:", e.message);
  }
  process.exit(0);
}
run();
