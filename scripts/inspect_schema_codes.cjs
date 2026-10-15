const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function run() {
  const [khoxeRes, donhangRes, vehicleConfigsRes, carColorsRes] = await Promise.all([
    supabase.from('khoxe').select('*').limit(3),
    supabase.from('donhang').select('*').limit(3),
    supabase.from('vehicle_configs').select('*').limit(10),
    supabase.from('car_color_prices').select('*').limit(10)
  ]);

  if (khoxeRes.data && khoxeRes.data.length > 0) {
    console.log("=== KHOXE COLUMNS ===");
    console.log(Object.keys(khoxeRes.data[0]));
    console.log("Sample khoxe row:", khoxeRes.data[0]);
  }

  if (donhangRes.data && donhangRes.data.length > 0) {
    console.log("\n=== DONHANG COLUMNS ===");
    console.log(Object.keys(donhangRes.data[0]));
    console.log("Sample donhang row:", donhangRes.data[0]);
  }

  if (vehicleConfigsRes.data && vehicleConfigsRes.data.length > 0) {
    console.log("\n=== VEHICLE_CONFIGS ===");
    console.log(vehicleConfigsRes.data.slice(0, 5));
  }

  if (carColorsRes.data && carColorsRes.data.length > 0) {
    console.log("\n=== CAR_COLOR_PRICES ===");
    console.log(carColorsRes.data.slice(0, 5));
  }
}

run();
