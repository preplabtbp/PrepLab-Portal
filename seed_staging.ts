import { Client } from 'pg';

async function run() {
    const prod = new Client({ connectionString: "postgresql://postgres:password123@35.232.132.249:5432/appdb" });
    const staging = new Client({ connectionString: "postgresql://postgres:password123@35.232.132.249:5432/appdb_staging" });

    await prod.connect();
    await staging.connect();

    console.log("Connected to both DBs");

    // Copy Employees
    const employees = await prod.query("SELECT * FROM employees LIMIT 100");
    const specificEmployee = await prod.query("SELECT * FROM employees WHERE nik = '82D25888855'");
    
    const allEmployees = [...specificEmployee.rows, ...employees.rows];
    // Deduplicate by NIK
    const deduped = Array.from(new Map(allEmployees.map(e => [e.nik, e])).values());

    for (let row of deduped) {
        const keys = Object.keys(row).filter(k => k !== 'id'); // skip ID to avoid sequence issues
        const vals = keys.map(k => row[k]);
        const placeholders = keys.map((_, i) => `$${i + 1}`);
        try {
            await staging.query(`INSERT INTO employees ("${keys.join('", "')}") VALUES (${placeholders.join(', ')}) ON CONFLICT (nik) DO NOTHING`, vals);
        } catch(e) {
            console.error("Error inserting", row.nik, e.message);
        }
    }
    console.log("Employees seeded");

    // Copy Equipments
    const equipments = await prod.query("SELECT * FROM equipments LIMIT 100");
    for (let row of equipments.rows) {
        const keys = Object.keys(row).filter(k => k !== 'id');
        const vals = keys.map(k => row[k]);
        const placeholders = keys.map((_, i) => `$${i + 1}`);
        try {
            await staging.query(`INSERT INTO equipments ("${keys.join('", "')}") VALUES (${placeholders.join(', ')})`, vals);
        } catch(e) {
            console.error("Error inserting eq", e.message);
        }
    }
    console.log("Equipments seeded");
    
    // Copy Quiz Questions
    const questions = await prod.query("SELECT * FROM quiz_questions LIMIT 50");
    for (let row of questions.rows) {
        const keys = Object.keys(row).filter(k => k !== 'id');
        const vals = keys.map(k => row[k]);
        const placeholders = keys.map((_, i) => `$${i + 1}`);
        try {
            await staging.query(`INSERT INTO quiz_questions ("${keys.join('", "')}") VALUES (${placeholders.join(', ')})`, vals);
        } catch(e) {
            console.error("Error inserting qq", e.message);
        }
    }
    console.log("Questions seeded");

    await prod.end();
    await staging.end();
}
run().catch(console.error);
