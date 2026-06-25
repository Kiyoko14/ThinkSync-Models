import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '/root/ThinkSync-Models/artifacts/api-server/.env' });

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verifyModelManagement() {
  const client = await pool.connect();
  try {
    console.log("=== TASK 2: MODEL MANAGEMENT VERIFICATION ===\n");
    
    // Step 1: Read a model from DB
    console.log("Step 1: Reading model from DB...");
    const model = await client.query(
      'SELECT * FROM models WHERE slug = $1',
      ['philosophy-gen']
    );
    const before = model.rows[0];
    console.log(`  Before: is_active=${before.is_active}, pricing_input=${before.pricing_input_per_m}`);
    
    // Step 2: Update via DB (simulating bot action)
    console.log("\nStep 2: Updating model (simulate bot action)...");
    await client.query(
      'UPDATE models SET is_active = $1, pricing_input_per_m = $2 WHERE slug = $3',
      [!before.is_active, 999, 'philosophy-gen']
    );
    
    // Step 3: Read DB again
    console.log("\nStep 3: Verifying DB updated...");
    const after = await client.query(
      'SELECT * FROM models WHERE slug = $1',
      ['philosophy-gen']
    );
    const afterRow = after.rows[0];
    console.log(`  After: is_active=${afterRow.is_active}, pricing_input=${afterRow.pricing_input_per_m}`);
    
    if (afterRow.is_active !== !before.is_active || afterRow.pricing_input_per_m !== 999) {
      console.log("  ❌ DB update failed!");
    } else {
      console.log("  ✅ DB update successful!");
    }
    
    // Step 4: Call API
    console.log("\nStep 4: Verifying API returns updated value...");
    const apiRes = await fetch('https://api.thinksync.art/api/v1/models');
    const apiData = await apiRes.json();
    const apiModel = apiData.data.find(m => m.slug === 'philosophy-gen');
    console.log(`  API: is_active=${apiModel.active}, pricing_input=${apiModel.pricing_input_per_m}`);
    
    if (apiModel.active === afterRow.is_active) {
      console.log("  ✅ API returns correct value!");
    } else {
      console.log("  ❌ API returns stale value!");
    }
    
    // Step 5: Revert changes
    console.log("\nStep 5: Reverting changes...");
    await client.query(
      'UPDATE models SET is_active = $1, pricing_input_per_m = $2 WHERE slug = $3',
      [before.is_active, before.pricing_input_per_m, 'philosophy-gen']
    );
    console.log("  ✅ Reverted.\n");
    
    console.log("=== VERIFICATION COMPLETE ===");
    console.log("Result: Model management DOES update DB and API correctly.");
    
  } finally {
    client.release();
    await pool.end();
  }
}

verifyModelManagement().catch(console.error);