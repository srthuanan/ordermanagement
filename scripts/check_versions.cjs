const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function run() {
  const { data, error } = await supabase
    .from('donhanghienhuu')
    .select('mo_ta_san_pham, ten_phien_ban, ma_phien_ban')
    .limit(1000);

  if (error) {
    console.error(error);
    return;
  }

  const versions = new Set();
  for (const r of data) {
    if (r.ten_phien_ban) versions.add(`${r.mo_ta_san_pham} -> [${r.ten_phien_ban}]`);
  }

  console.log("=== VERSIONS IN DONHANGHIENHUU ===");
  Array.from(versions).slice(0, 30).forEach(v => console.log(v));
}

run();
