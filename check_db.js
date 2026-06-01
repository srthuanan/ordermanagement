import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jwvgxqrkjlbewvpkvucj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: donhang, error } = await supabase.from('donhang').select('ten_tvbh').gte('created_at', '2026-05-01T00:00:00');
    console.log("donhang error:", error);
    console.log("donhang count:", donhang?.length);
    if (donhang && donhang.length > 0) {
        console.log("Names:", [...new Set(donhang.map(d => d.ten_tvbh))]);
    }
}
check();
