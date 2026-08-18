import { defineConfig } from "drizzle-kit";
import * as dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    host: process.env.SQL_HOST as string,
    user: process.env.SQL_ADMIN_USER as string,
    password: process.env.SQL_ADMIN_PASSWORD as string,
    database: "cloud_sql_production_database",
  },
});
