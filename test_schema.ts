import { createClient } from '@supabase/supabase-js';

const url = 'https://jwvgxqrkjlbewvpkvucj.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU';

const supabase = createClient(url, key);

async function run() {
    const { data, error } = await supabase.rpc('run_sql', { query: `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'yeucauxhd';
    `});
    
    if (error) {
      console.log("RPC Error (trying standard query):", error);
      // Wait, there's no run_sql rpc probably
    } else {
      console.log("Schema:", data);
    }
}

run();
