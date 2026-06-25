import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '/root/ThinkSync-Models/artifacts/api-server/.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function audit() {
  const client = await pool.connect();
  try {
    console.log("=== TABLES & COLUMNS ===");
    const tables = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    for (const row of tables.rows) {
      const table = row.tablename;
      console.log(`\n--- ${table} ---`);
      const cols = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      
      for (const c of cols.rows) {
        console.log(`  ${c.column_name}: ${c.data_type} ${c.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
      }
    }
    
    console.log("\n=== DONE ===");
  } finally {
    client.release();
    await pool.end();
  }
}

audit().catch(console.error);
