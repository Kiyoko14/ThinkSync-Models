import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '/root/ThinkSync-Models/artifacts/api-server/.env' });

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const r = await pool.query('SELECT slug, is_active, is_visible FROM models ORDER BY slug');
  for (const m of r.rows) {
    console.log(`${m.slug}: active=${m.is_active} visible=${m.is_visible}`);
  }
  await pool.end();
}

check().catch(console.error);
