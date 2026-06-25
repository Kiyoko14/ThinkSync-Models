import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '/root/ThinkSync-Models/artifacts/api-server/.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("Running migrations...");
    
    // Add logo_url to models
    await client.query(`ALTER TABLE models ADD COLUMN IF NOT EXISTS logo_url TEXT`);
    console.log("✅ Added logo_url to models table");
    
    console.log("Migrations complete!");
  } catch (e) {
    console.error("Migration error:", e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
