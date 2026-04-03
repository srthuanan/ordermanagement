import { createClient } from '@supabase/supabase-js';

const url = 'https://jwvgxqrkjlbewvpkvucj.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU';

const supabaseAdmin = createClient(url, key);

async function run() {
    const { error: yErr } = await supabaseAdmin.from('yeucauxhd').delete().in('so_don_hang', ['N31913-VSO-26-03-0003', 'N31913-VSO-26-02-0052']);
    console.log("yeucauxhd Error:", yErr);
    
    const { error: dErr } = await supabaseAdmin.from('donhang').delete().in('so_don_hang', ['N31913-VSO-26-03-0003', 'N31913-VSO-26-02-0052']);
    console.log("donhang Error:", dErr);
}

run();
