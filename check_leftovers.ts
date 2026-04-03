import { createClient } from '@supabase/supabase-js';

const url = 'https://jwvgxqrkjlbewvpkvucj.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU';

const supabaseAdmin = createClient(url, key);

async function run() {
    const orders = ['N31920-VSO-26-03-0463', 'N31920-VSO-26-03-0508'];
    for (const no of orders) {
        console.log(`Checking ${no}...`);
        
        const { data: yData } = await supabaseAdmin.from('yeucauxhd').select('*').eq('so_don_hang', no);
        console.log(`- In yeucauxhd: ${yData?.length || 0}`);
        
        const { data: dData } = await supabaseAdmin.from('donhang').select('ket_qua, ngay_xuat_hoa_don').eq('so_don_hang', no);
        console.log(`- In donhang: ${dData?.length || 0} (${JSON.stringify(dData)})`);
        
        const { data: aData } = await supabaseAdmin.from('archived_orders').select('*').eq('so_don_hang', no);
        console.log(`- In archived_orders: ${aData?.length || 0}`);

        // also delete them manually if user just wants them gone regardless of why.
    }
}
run();
