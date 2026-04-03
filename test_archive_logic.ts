import { createClient } from '@supabase/supabase-js';

const url = 'https://jwvgxqrkjlbewvpkvucj.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU';

const supabaseAdmin = createClient(url, key);

async function run() {
    const { data: invoicedOrders, error: fetchErr } = await supabaseAdmin
        .from('yeucauxhd')
        .select('*')
        .not('ngay_xuat_hoa_don', 'is', null);

    if (fetchErr) {
        console.error("fetch err:", fetchErr);
        return;
    }

    console.log("Found rows with ngay_xuat_hoa_don != null:", invoicedOrders?.length);
    
    // First of month
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const ordersToArchive = invoicedOrders?.filter(o => {
        if (!o.ngay_xuat_hoa_don) return false;
        let date = new Date(o.ngay_xuat_hoa_don);
        if (isNaN(date.getTime())) {
            const parts = String(o.ngay_xuat_hoa_don).split('/');
            if (parts.length === 3) {
                date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            }
        }
        return date && !isNaN(date.getTime()) && date < firstOfMonth;
    }) || [];

    console.log("Orders to archive:", ordersToArchive.length);
    if (ordersToArchive.length > 0) {
        console.log("Sample order:", ordersToArchive[0]);
    }
}

run();
