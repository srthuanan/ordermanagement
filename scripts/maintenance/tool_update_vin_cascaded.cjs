const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function performSwap() {
  const oldVin = 'RLNV5JSE7TH739648';
  const newVin = 'RLNV5JSE6TH739589';

  console.log('Step 1: Fetching old record...');
  const { data: oldRecords, error: err1 } = await supabase
    .from('khoxe')
    .select('*')
    .eq('vin', oldVin);

  if (err1 || !oldRecords || oldRecords.length === 0) {
    console.error('Record not found:', err1);
    return;
  }

  const oldRecord = oldRecords[0];
  const newRecord = { ...oldRecord, vin: newVin };
  delete newRecord.id; // Let it generate a new ID or use a temp one

  console.log('Step 2: Inserting new record...');
  const { data: inserted, error: err2 } = await supabase
    .from('khoxe')
    .insert(newRecord)
    .select();

  if (err2) {
    console.error('Insert failed:', err2);
    return;
  }

  console.log('Step 3: Updating car_hold_activities...');
  const { error: err3 } = await supabase
    .from('car_hold_activities')
    .update({ vin: newVin })
    .eq('vin', oldVin);

  if (err3) {
    console.error('Update activities failed:', err3);
    // Cleanup? Maybe later.
  }

  console.log('Step 4: Deleting old record...');
  const { error: err4 } = await supabase
    .from('khoxe')
    .delete()
    .eq('vin', oldVin);

  if (err4) {
    console.error('Delete failed:', err4);
  } else {
    console.log('🎉 Update completed successfully via swap!');
  }
}

performSwap();
