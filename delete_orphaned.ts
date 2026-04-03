import { createClient } from '@supabase/supabase-js';

const url = 'https://jwvgxqrkjlbewvpkvucj.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU';

const supabaseAdmin = createClient(url, key);

async function run() {
    const orders = ['N31920-VSO-26-03-0463', 'N31920-VSO-26-03-0508'];
    for (const no of orders) {
        const { data: files } = await supabaseAdmin.storage.from('yeucauxhd-files').list(no);
        if (files && files.length > 0) {
            const toDelete = files.map(f => `${no}/${f.name}`);
            await supabaseAdmin.storage.from('yeucauxhd-files').remove(toDelete);
            console.log(`Deleted files for ${no}`);
        } else {
            console.log(`No files found for ${no}`);
        }
    }
}
run();
