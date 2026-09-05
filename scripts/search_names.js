import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jwvgxqrkjlbewvpkvucj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const namesToFind = ['Phạm Khánh Duy', 'Nguyễn Văn Nghĩa', 'Duy', 'Nghĩa'];
    
    // Check donhang
    const { data: d1 } = await supabase.from('donhang').select('*').ilike('ten_khach_hang', '%Duy%');
    console.log("donhang ten_khach_hang Duy:", d1?.length);
    
    // Check yeucauvc
    const { data: y1 } = await supabase.from('yeucauvc').select('*').ilike('ten_tvbh', '%Duy%');
    console.log("yeucauvc Duy:", y1?.length);

    const { data: y2 } = await supabase.from('yeucauvc').select('*').ilike('ten_tvbh', '%Nghĩa%');
    console.log("yeucauvc Nghĩa:", y2?.length);
    
    const { data: d_all } = await supabase.from('donhang').select('*');
    if (d_all) {
       let found = d_all.filter(d => JSON.stringify(d).includes('Duy') || JSON.stringify(d).includes('Nghĩa'));
       console.log("Found in donhang:", found.length, "records");
       if (found.length > 0) {
           console.log("Keys matching in donhang:");
           found.forEach(f => {
               for (let k in f) {
                   if (String(f[k]).includes('Duy') || String(f[k]).includes('Nghĩa')) console.log(k, f[k]);
               }
           });
       }
    }
}
check();
