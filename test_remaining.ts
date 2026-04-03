import { createClient } from '@supabase/supabase-js';

const url = 'https://jwvgxqrkjlbewvpkvucj.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU';

const supabaseAdmin = createClient(url, key);

async function run() {
    const { data: invoicedOrders, error: fetchErr } = await supabaseAdmin
        .from('yeucauxhd')
        .select('so_don_hang, ngay_xuat_hoa_don')
        .not('ngay_xuat_hoa_don', 'is', null);

    if (fetchErr) {
        console.error("fetch err:", fetchErr);
        return;
    }

    console.log("Remaining invoiced orders:", invoicedOrders);
}

run();
