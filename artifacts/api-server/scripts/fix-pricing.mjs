import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '/root/ThinkSync-Models/artifacts/api-server/.env' });

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixPricing() {
  const client = await pool.connect();
  try {
    console.log("Fixing pricing...");
    
    const updates = [
      { slug: 'philosophy-gen', input: 7, output: 7 },
      { slug: 'philosophy-gen-2', input: 14, output: 14 },
      { slug: 'philosophy-gen-2.5', input: 57, output: 57 },
    ];
    
    for (const u of updates) {
      await client.query(
        'UPDATE models SET pricing_input_per_m = $1, pricing_output_per_m = $2 WHERE slug = $3',
        [u.input, u.output, u.slug]
      );
      console.log(`✅ ${u.slug}: ${u.input}/${u.output} cents/M tokens`);
    }
    
    console.log("\nPricing fixed!");
  } finally {
    client.release();
    await pool.end();
  }
}

fixPricing().catch(console.error);
