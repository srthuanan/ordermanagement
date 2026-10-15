const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function run() {
  const { data: configs } = await supabase
    .from('vehicle_configs')
    .select('type, value, parent_value')
    .in('type', ['exterior', 'interior']);

  console.log("=== VEHICLE_CONFIGS (EXTERIOR & INTERIOR) ===");
  const ext = new Set();
  const int = new Set();
  for (const c of configs || []) {
    if (c.type === 'exterior') ext.add(c.value);
    if (c.type === 'interior') int.add(c.value);
  }
  console.log("Exteriors in vehicle_configs:", Array.from(ext));
  console.log("\nInteriors in vehicle_configs:", Array.from(int));
}

run();
