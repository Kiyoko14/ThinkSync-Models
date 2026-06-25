import db from '../db/index.ts';
import { updateModel } from '../services/model.ts';

async function fixPricing() {
  const models = [
    { slug: 'philosophy-gen', pricing_input_per_m: 7, pricing_output_per_m: 7 },
    { slug: 'philosophy-gen-2', pricing_input_per_m: 14, pricing_output_per_m: 14 },
    { slug: 'philosophy-gen-2.5', pricing_input_per_m: 57, pricing_output_per_m: 57 },
  ];
  
  for (const m of models) {
    const model = await getModelBySlug(m.slug);
    if (model) {
      await updateModel(model.id, {
        pricing_input_per_m: m.pricing_input_per_m,
        pricing_output_per_m: m.pricing_output_per_m,
      });
      console.log(`✅ Updated ${m.slug}`);
    }
  }
  
  await db.end();
}

fixPricing().catch(console.error);
