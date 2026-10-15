const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function run() {
  const { data, error } = await supabase
    .from('donhanghienhuu')
    .select('ma_mau_ngoai_that, mau_ngoai_that, ma_mau_noi_that, mau_noi_that, mo_ta_san_pham, ten_phien_ban')
    .limit(3000);

  if (error) {
    console.error('Error:', error);
    return;
  }

  const intMap = {};
  const extMap = {};

  for (const r of data) {
    const kInt = `${r.ma_mau_noi_that}`;
    if (!intMap[kInt]) intMap[kInt] = new Set();
    intMap[kInt].add(`${r.mau_noi_that} (Model: ${r.mo_ta_san_pham})`);

    const kExt = `${r.ma_mau_ngoai_that}`;
    if (!extMap[kExt]) extMap[kExt] = new Set();
    extMap[kExt].add(`${r.mau_ngoai_that} (Model: ${r.mo_ta_san_pham})`);
  }

  console.log('=== NỘI THẤT (INTERIOR) ===');
  for (const [code, names] of Object.entries(intMap)) {
    console.log(`Code [${code}]:`, Array.from(names).slice(0, 3));
  }

  console.log('\n=== NGOẠI THẤT (EXTERIOR) ===');
  for (const [code, names] of Object.entries(extMap)) {
    console.log(`Code [${code}]:`, Array.from(names).slice(0, 3));
  }
}

run();
