import { createClient } from '@supabase/supabase-js';

const url = 'https://jwvgxqrkjlbewvpkvucj.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU';

const supabase = createClient(url, key);

async function run() {
    const { data, error } = await supabase.rpc('archive_old_orders');
    console.log("Data:", data);
    console.log("Error:", error);
}

run();
