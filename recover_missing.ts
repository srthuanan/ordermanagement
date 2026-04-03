import { createClient } from '@supabase/supabase-js';

const url = 'https://jwvgxqrkjlbewvpkvucj.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU';

const supabaseAdmin = createClient(url, key);

async function run() {
    const orders = ['N31913-VSO-26-03-0003', 'N31913-VSO-26-02-0052'];
    for (const no of orders) {
        let { data: logs } = await supabaseAdmin.from('interactions').select('*').eq('target_id', no);
        console.log(`Logs for ${no}:`, logs?.length);
        if (logs) {
            logs.forEach(l => {
                if (l.metadata) console.log(l.metadata);
            });
        }
        
        let { data: khoxeLogs } = await supabaseAdmin.from('khoxe').select('*').eq('username_giu_xe', no);
        // Maybe find their info elsewhere?
    }
}
run();
