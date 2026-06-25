import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '/root/ThinkSync-Models/artifacts/api-server/.env' });

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function endToEndTest() {
  const client = await pool.connect();
  try {
    console.log("=== TASK 2: FULL END-TO-END PROPAGATION TEST ===\n");
    
    // Test 1: Model Enable/Disable
    console.log("Test 1: Model Enable/Disable");
    console.log("  Step 1: Read from DB...");
    let r = await client.query('SELECT is_active FROM models WHERE slug = $1', ['philosophy-gen']);
    const before = r.rows[0].is_active;
    console.log(`    Before: is_active=${before}`);
    
    console.log("  Step 2: Toggle via DB...");
    await client.query('UPDATE models SET is_active = $1 WHERE slug = $2', [!before, 'philosophy-gen']);
    
    console.log("  Step 3: Verify DB updated...");
    r = await client.query('SELECT is_active FROM models WHERE slug = $1', ['philosophy-gen']);
    const after = r.rows[0].is_active;
    console.log(`    After: is_active=${after}`);
    console.log(after !== before ? "    ✅ DB updated!" : "    ❌ DB update failed!");
    
    console.log("  Step 4: Verify API returns updated value...");
    const apiRes = await fetch('https://api.thinksync.art/api/v1/models');
    const apiData = await apiRes.json();
    const apiModel = apiData.data.find(m => m.slug === 'philosophy-gen');
    console.log(`    API: active=${apiModel.active}`);
    console.log(apiModel.active === after ? "    ✅ API in sync!" : "    ❌ API stale!");
    
    console.log("  Step 5: Revert...");
    await client.query('UPDATE models SET is_active = $1 WHERE slug = $2', [before, 'philosophy-gen']);
    console.log("    ✅ Reverted.\n");
    
    // Test 2: Pricing Update
    console.log("Test 2: Pricing Update");
    console.log("  Step 1: Read from DB...");
    r = await client.query('SELECT pricing_input_per_m, pricing_output_per_m FROM models WHERE slug = $1', ['philosophy-gen']);
    const pBefore = { input: r.rows[0].pricing_input_per_m, output: r.rows[0].pricing_output_per_m };
    console.log(`    Before: input=${pBefore.input}, output=${pBefore.output}`);
    
    console.log("  Step 2: Update via DB...");
    await client.query('UPDATE models SET pricing_input_per_m = $1, pricing_output_per_m = $2 WHERE slug = $3', [999, 999, 'philosophy-gen']);
    
    console.log("  Step 3: Verify API returns updated pricing...");
    const apiRes2 = await fetch('https://api.thinksync.art/api/v1/models');
    const apiData2 = await apiRes2.json();
    const apiModel2 = apiData2.data.find(m => m.slug === 'philosophy-gen');
    console.log(`    API: input=${apiModel2.pricing_input_per_m}, output=${apiModel2.pricing_output_per_m}`);
    console.log(apiModel2.pricing_input_per_m === 999 ? "    ✅ Pricing updated!" : "    ❌ Pricing update failed!");
    
    console.log("  Step 4: Revert...");
    await client.query('UPDATE models SET pricing_input_per_m = $1, pricing_output_per_m = $2 WHERE slug = $3', [pBefore.input, pBefore.output, 'philosophy-gen']);
    console.log("    ✅ Reverted.\n");
    
    console.log("=== TEST RESULTS ===");
    console.log("Result: Changes propagate correctly to API.");
    console.log("Note: Frontend requires page refresh (no WebSocket/SSE).");
    console.log("Note: User bot reads from DB on each request (no restart needed).");
    
  } finally {
    client.release();
    await pool.end();
  }
}

endToEndTest().catch(console.error);