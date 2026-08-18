const { Pool } = require('pg');

async function migrateQuizData() {
  const devPool = new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: 'cloud_sql_development_database'
  });

  const prodPool = new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: 'cloud_sql_production_database'
  });

  try {
    console.log("Fetching quiz_questions from Dev...");
    const devQuestions = await devPool.query('SELECT * FROM quiz_questions');
    
    if (devQuestions.rows.length > 0) {
      await prodPool.query('DELETE FROM quiz_questions');
      
      for (const q of devQuestions.rows) {
        // q.options is already an array
        await prodPool.query(
          'INSERT INTO quiz_questions (id, category, text, options, correct_answer_index) VALUES ($1, $2, $3, $4, $5)',
          [q.id, q.category, q.text, q.options, q.correct_answer_index]
        );
      }
      await prodPool.query(`SELECT setval(pg_get_serial_sequence('quiz_questions', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM quiz_questions;`);
      console.log("Successfully copied quiz_questions.");
    }

    const devSettings = await devPool.query("SELECT * FROM app_settings WHERE setting_key = 'QUIZ_CONFIG'");
    if (devSettings.rows.length > 0) {
      const qConf = devSettings.rows[0];
      const prodSettings = await prodPool.query("SELECT * FROM app_settings WHERE setting_key = 'QUIZ_CONFIG'");
      if (prodSettings.rows.length > 0) {
         await prodPool.query(
           "UPDATE app_settings SET setting_value = $1, description = $2, updated_at = $3 WHERE setting_key = 'QUIZ_CONFIG'",
           [qConf.setting_value, qConf.description, qConf.updated_at]
         );
      } else {
         await prodPool.query(
           "INSERT INTO app_settings (setting_key, setting_value, description, updated_at) VALUES ($1, $2, $3, $4)",
           [qConf.setting_key, qConf.setting_value, qConf.description, qConf.updated_at]
         );
      }
      console.log("Successfully copied QUIZ_CONFIG setting.");
    }
    
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await devPool.end();
    await prodPool.end();
  }
}

migrateQuizData();
