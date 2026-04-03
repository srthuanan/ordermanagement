import { createClient } from '@supabase/supabase-js';

const url = 'https://jwvgxqrkjlbewvpkvucj.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU';

const supabaseAdmin = createClient(url, key);

async function run() {
    const orders = ['N31913-VSO-26-03-0003', 'N31913-VSO-26-02-0052'];
    for (const no of orders) {
        let textFound = false;
        // Search in all tables
        const tables = ['yeucauvc', 'interactions', 'car_hold_activities', 'donhang_ton'];
        for (const t of tables) {
             const { data: d } = await supabaseAdmin.from(t).select('*').eq('so_don_hang', no).catch(()=>({data:[]}));
             if (d && d.length) { console.log(`Found ${no} in ${t}`); console.log(d); textFound=true; }
             const { data: dd } = await supabaseAdmin.from(t).select('*').eq('target_id', no).catch(()=>({data:[]}));
             if (dd && dd.length) { console.log(`Found ${no} in ${t} (target)`); console.log(dd); textFound=true; }
             const { data: ddd } = await supabaseAdmin.from(t).select('*').textSearch('message', no).catch(()=>({data:[]}));
             if (ddd && ddd.length) { console.log(`Found ${no} in ${t} (msg)`); console.log(ddd); textFound=true;}
        }
        if (!textFound) console.log("Not found anywhere for " + no);
    }
}
run();
