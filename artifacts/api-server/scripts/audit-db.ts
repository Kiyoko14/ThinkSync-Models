import db from '../db/index.ts';

async function audit() {
  const client = await db.getClient();
  try {
    const tables = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    console.log("=== TABLES ===");
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
  } finally {
    client.release();
    db.end();
  }
}

audit().catch(console.error);
